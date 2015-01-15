package org.labrad.browser.client.registry;


import java.util.ArrayList;
import java.util.List;
import java.util.logging.Logger;

import org.labrad.browser.client.BreadcrumbView;
import org.labrad.browser.client.BrowserImages;
import org.labrad.browser.client.PathPlaceProvider;
import org.labrad.browser.client.event.RegistryDirEvent;
import org.labrad.browser.client.event.RegistryKeyEvent;
import org.labrad.browser.client.ui.ImageButtonCell;
import org.labrad.browser.client.ui.TableResources;

import com.google.gwt.cell.client.AbstractCell;
import com.google.gwt.cell.client.Cell;
import com.google.gwt.cell.client.EditTextCell;
import com.google.gwt.cell.client.FieldUpdater;
import com.google.gwt.cell.client.IconCellDecorator;
import com.google.gwt.cell.client.ValueUpdater;
import com.google.gwt.core.client.GWT;
import com.google.gwt.core.client.JavaScriptObject;
import com.google.gwt.dom.client.BrowserEvents;
import com.google.gwt.dom.client.DataTransfer;
import com.google.gwt.dom.client.Element;
import com.google.gwt.dom.client.NativeEvent;
import com.google.gwt.dom.client.Style.Unit;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.event.dom.client.DragEnterEvent;
import com.google.gwt.event.dom.client.DragEnterHandler;
import com.google.gwt.event.dom.client.DragOverEvent;
import com.google.gwt.event.dom.client.DragOverHandler;
import com.google.gwt.event.dom.client.DropEvent;
import com.google.gwt.event.dom.client.DropHandler;
import com.google.gwt.event.shared.EventBus;
import com.google.gwt.place.shared.Place;
import com.google.gwt.place.shared.PlaceHistoryMapper;
import com.google.gwt.resources.client.ImageResource;
import com.google.gwt.safehtml.client.SafeHtmlTemplates;
import com.google.gwt.safehtml.shared.SafeHtml;
import com.google.gwt.safehtml.shared.SafeHtmlBuilder;
import com.google.gwt.user.cellview.client.CellTable;
import com.google.gwt.user.cellview.client.Column;
import com.google.gwt.user.cellview.client.TextColumn;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.rpc.AsyncCallback;
import com.google.gwt.user.client.ui.AbsolutePanel;
import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.HorizontalPanel;
import com.google.gwt.user.client.ui.VerticalPanel;
import com.google.inject.assistedinject.Assisted;
import com.google.inject.assistedinject.AssistedInject;

public class RegistryViewImpl extends Composite implements RegistryView {
  private final List<String> path;
  private final RegistryPlace place;
  private final PlaceHistoryMapper historyMapper;
  private final RegistryServiceAsync registryService;
  private CellTable<DirectoryTableRow> dirTable;
  private CellTable<KeyTableRow> keyTable;

  private static final Logger log = Logger.getLogger(RegistryViewImpl.class.getName());

  // custom cell table styles
  private static final CellTable.Resources resources = GWT.create(TableResources.class);

  public static interface Templates extends SafeHtmlTemplates {
    @Template("<a href=\"#{0}\" draggable=\"true\">{1}</a>")
    SafeHtml subDirLink(String token, String linkText);

    @Template("<span draggable=\"true\">{0}</span>")
    SafeHtml keyCell(String key);
  }

  private static final Templates TEMPLATES = GWT.create(Templates.class);

  private static final String DATA_TYPE = "text/plain";
  private static final String DATA_REG_LOC = "text/labrad-registry-loc";
  private static final String DATA_REG_DIR = "text/labrad-registry-dir";
  private static final String DATA_REG_KEY = "text/labrad-registry-key";

  class SubDirCell extends AbstractCell<String> {
    public SubDirCell() {
      super("dragstart");
    }

    @Override
    public void render(Cell.Context context, String dir, SafeHtmlBuilder sb) {
      RegistryPlace subDir = place.subDir(dir);
      sb.append(TEMPLATES.subDirLink(historyMapper.getToken(subDir), dir));
    }

    @Override
    public void onBrowserEvent(Cell.Context context, Element parent, String value, NativeEvent event, ValueUpdater<String> updater) {
      super.onBrowserEvent(context, parent, value, event, updater);
      if (BrowserEvents.DRAGSTART.equals(event.getType())) {
        DataTransfer dt = event.getDataTransfer();
        setEffectAllowed(dt, "copyMove");
        dt.setData(DATA_REG_LOC, historyMapper.getToken(place));
        dt.setData(DATA_REG_DIR, value);
        consoleLog(dt);
      }
    }
  }

  class KeyCell extends AbstractCell<String> {
    public KeyCell() {
      super("dragstart");
    }

    @Override
    public void render(Cell.Context context, String key, SafeHtmlBuilder sb) {
      sb.append(TEMPLATES.keyCell(key));
    }

    @Override
    public void onBrowserEvent(Cell.Context context, Element parent, String value, NativeEvent event, ValueUpdater<String> updater) {
      super.onBrowserEvent(context, parent, value, event, updater);
      if (BrowserEvents.DRAGSTART.equals(event.getType())) {
        DataTransfer dt = event.getDataTransfer();
        setEffectAllowed(dt, "copyMove");
        dt.setData(DATA_REG_LOC, historyMapper.getToken(place));
        dt.setData(DATA_REG_KEY, value);
        consoleLog(dt);
      }
    }
  }

  native void consoleLog(JavaScriptObject obj) /*-{
    console.log(obj);
  }-*/;

  native void setEffectAllowed(DataTransfer dt, String effectAllowed) /*-{
    dt.effectAllowed = effectAllowed;
  }-*/;

  native String getEffectAllowed(DataTransfer dt) /*-{
    return dt.effectAllowed;
  }-*/;

  private AsyncCallback<RegistryListing> defaultCallback = new AsyncCallback<RegistryListing>() {

    @Override
    public void onFailure(Throwable caught) {
      log.severe(caught.getMessage()); // TODO: a bit more info here would help
      refresh();
    }

    @Override
    public void onSuccess(RegistryListing result) {
      log.info("setting listing from defaultCallback");
      setListing(result);
    }
  };

  @AssistedInject
  public RegistryViewImpl(
      @Assisted final List<String> path,
      @Assisted RegistryListing listing,
      @Assisted final Presenter presenter,
      @Assisted EventBus eventBus,
      final PlaceHistoryMapper historyMapper,
      final RegistryServiceAsync registryService,
      final BrowserImages images) {

    this.path = path;
    this.place = new RegistryPlace(path);
    this.historyMapper = historyMapper;
    this.registryService = registryService;

    VerticalPanel verticalPanel = new VerticalPanel();
    initWidget(verticalPanel);
    verticalPanel.setSize("100%", "");

    addDomHandler(new DragOverHandler() {
      @Override
      public void onDragOver(DragOverEvent event) {
        event.preventDefault();
      }
    }, DragOverEvent.getType());

    addDomHandler(new DragEnterHandler() {
      @Override
      public void onDragEnter(DragEnterEvent event) {
        event.preventDefault();
      }
    }, DragEnterEvent.getType());

    addDomHandler(new DropHandler() {
      @Override
      public void onDrop(DropEvent event) {
        event.preventDefault();
        DataTransfer dt = event.getDataTransfer();
        log.info("drop. datatransfer = " + dt);
        consoleLog(event.getNativeEvent());
        consoleLog(dt);
        String effectAllowed = getEffectAllowed(dt);
        String srcToken = dt.getData(DATA_REG_LOC);
        RegistryPlace srcPlace = (RegistryPlace) historyMapper.getPlace(srcToken);
        String src = srcPlace.getPathString();
        String dir = dt.getData(DATA_REG_DIR);
        String key = dt.getData(DATA_REG_KEY);
        String dst = place.getPathString();
        if ("copy".equals(effectAllowed)) { // copy
          if (key == null || key.isEmpty()) {
            boolean confirmed = Window.confirm("copy directory " + src + dir + "/ to " + dst + "?");
            if (confirmed) {
              registryService.copyDir(srcPlace.getPathArray(), dir, place.getPathArray(), dir, defaultCallback);
            }
          } else {
            boolean confirmed = Window.confirm("copy key " + src + key + " to " + dst + "?");
            if (confirmed) {
              registryService.copy(srcPlace.getPathArray(), key, place.getPathArray(), key, defaultCallback);
            }
          }
        } else { // move
          if (key == null || key.isEmpty()) {
            boolean confirmed = Window.confirm("move directory " + src + dir + "/ to " + dst + "?");
            if (confirmed) {
              registryService.moveDir(srcPlace.getPathArray(), dir, place.getPathArray(), dir, defaultCallback);
            }
          } else {
            boolean confirmed = Window.confirm("move key " + src + key + " to " + dst + "?");
            if (confirmed) {
              registryService.move(srcPlace.getPathArray(), key, place.getPathArray(), key, defaultCallback);
            }
          }
        }
      }
    }, DropEvent.getType());

    BreadcrumbView breadcrumbs = new BreadcrumbView("Registry", path, historyMapper, new PathPlaceProvider() {
      public Place getPlace(List<String> path) {
        return new RegistryPlace(path);
      }
    });
    verticalPanel.add(breadcrumbs);

    Button newDir = new Button("new directory", new ClickHandler() {
      @Override
      public void onClick(ClickEvent event) {
        String dir = Window.prompt("Enter directory name", "");
        if (dir == null) return;

        registryService.mkdir(place.getPathArray(), dir, defaultCallback);
      }
    });
    Button newKey = new Button("new key", new ClickHandler() {
      @Override
      public void onClick(ClickEvent event) {
        String key = Window.prompt("Enter key name", "");
        if (key == null) return;

        String value = Window.prompt("Enter data value", "");
        if (value == null) return;

        registryService.set(place.getPathArray(), key, value, defaultCallback);
      }
    });

    dirTable = new CellTable<DirectoryTableRow>(15, resources);
    verticalPanel.add(dirTable);
    dirTable.setWidth("100%", true);

    IconCellDecorator<String> dirCell = new IconCellDecorator<String>(images.folder(), new SubDirCell());
    Column<DirectoryTableRow, String> dirColumn = new Column<DirectoryTableRow, String>(dirCell) {
      @Override public String getValue(DirectoryTableRow dir) {
        return dir.getName();
      }
    };
    dirColumn.setFieldUpdater(new FieldUpdater<DirectoryTableRow, String>() {
      public void update(int index, DirectoryTableRow object, String value) {
        List<String> newPath = new ArrayList<String>(path);
        newPath.add(object.getName());
        presenter.goTo(new RegistryPlace(newPath));
      }
    });
    dirTable.addColumn(dirColumn);
    dirTable.setColumnWidth(dirColumn, 150, Unit.PX);

    TextColumn<DirectoryTableRow> dummyColumn = new TextColumn<DirectoryTableRow>() {
      @Override public String getValue(DirectoryTableRow object) {
        return "";
      }
    };
    dirTable.addColumn(dummyColumn);

    Column<DirectoryTableRow, ImageResource> renameDirColumn = new Column<DirectoryTableRow, ImageResource>(new ImageButtonCell()) {
      @Override public ImageResource getValue(DirectoryTableRow object) {
        return images.edit();
      }
    };
    renameDirColumn.setFieldUpdater(new FieldUpdater<DirectoryTableRow, ImageResource>() {
      public void update(int index, DirectoryTableRow object, ImageResource value) {
        String dir = object.getName();
        String newDir = Window.prompt("New directory name", dir);
        if (newDir != null && !newDir.equals(dir)) {
          registryService.renameDir(place.getPathArray(), dir, newDir, defaultCallback);
        }
      }
    });
    dirTable.addColumn(renameDirColumn);
    dirTable.setColumnWidth(renameDirColumn, 48, Unit.PX);

    Column<DirectoryTableRow, ImageResource> copyDirColumn = new Column<DirectoryTableRow, ImageResource>(new ImageButtonCell()) {
      @Override public ImageResource getValue(DirectoryTableRow object) {
        return images.copy();
      }
    };
    copyDirColumn.setFieldUpdater(new FieldUpdater<DirectoryTableRow, ImageResource>() {
      public void update(int index, DirectoryTableRow object, ImageResource value) {
        String dir = object.getName();
        String newDir = Window.prompt("New directory name", dir);
        if (newDir != null && !newDir.equals(dir)) {
          registryService.copyDir(place.getPathArray(), dir, place.getPathArray(), newDir, defaultCallback);
        }
      }
    });
    dirTable.addColumn(copyDirColumn);
    dirTable.setColumnWidth(copyDirColumn, 48, Unit.PX);

    Column<DirectoryTableRow, ImageResource> deleteDirColumn = new Column<DirectoryTableRow, ImageResource>(new ImageButtonCell()) {
      @Override public ImageResource getValue(DirectoryTableRow object) {
        return images.delete();
      }
    };
    deleteDirColumn.setFieldUpdater(new FieldUpdater<DirectoryTableRow, ImageResource>() {
      public void update(int index, DirectoryTableRow object, ImageResource value) {
        String dir = object.getName();
        boolean confirmed = Window.confirm("Delete directory " + dir + "?");
        if (confirmed) {
          registryService.rmdir(place.getPathArray(), dir, defaultCallback);
        }
      }
    });
    dirTable.addColumn(deleteDirColumn);
    dirTable.setColumnWidth(deleteDirColumn, 48, Unit.PX);


    keyTable = new CellTable<KeyTableRow>(15, resources);
    verticalPanel.add(keyTable);
    keyTable.setWidth("100%", true);

    IconCellDecorator<String> keyCell = new IconCellDecorator<String>(images.key(), new KeyCell());
    Column<KeyTableRow, String> keyColumn = new Column<KeyTableRow, String>(keyCell) {
      @Override public String getValue(KeyTableRow object) {
        return object.getKey();
      }
    };
    keyTable.addColumn(keyColumn);
    keyTable.setColumnWidth(keyColumn, 150, Unit.PX);

    Column<KeyTableRow, String> valueColumn = new Column<KeyTableRow, String>(new EditTextCell()) {
      @Override public String getValue(KeyTableRow object) {
        return object.getValue();
      }
    };
    valueColumn.setFieldUpdater(new FieldUpdater<KeyTableRow, String>() {
      public void update(int index, KeyTableRow object, String value) {
        registryService.set(place.getPathArray(), object.getKey(), value, defaultCallback);
      }
    });
    keyTable.addColumn(valueColumn);

    Column<KeyTableRow, ImageResource> renameKeyColumn = new Column<KeyTableRow, ImageResource>(new ImageButtonCell()) {
      @Override public ImageResource getValue(KeyTableRow object) {
        return images.edit();
      }
    };
    renameKeyColumn.setFieldUpdater(new FieldUpdater<KeyTableRow, ImageResource>() {
      public void update(int index, KeyTableRow object, ImageResource value) {
        String key = object.getKey();
        String newKey = Window.prompt("New key name", key);
        if (newKey != null && !newKey.equals(key)) {
          registryService.rename(place.getPathArray(), key, newKey, defaultCallback);
        }
      }
    });
    keyTable.addColumn(renameKeyColumn);
    keyTable.setColumnWidth(renameKeyColumn, 48, Unit.PX);

    Column<KeyTableRow, ImageResource> copyKeyColumn = new Column<KeyTableRow, ImageResource>(new ImageButtonCell()) {
      @Override public ImageResource getValue(KeyTableRow object) {
        return images.copy();
      }
    };
    copyKeyColumn.setFieldUpdater(new FieldUpdater<KeyTableRow, ImageResource>() {
      public void update(int index, KeyTableRow object, ImageResource value) {
        String key = object.getKey();
        String newKey = Window.prompt("New key name", key);
        if (newKey != null && !newKey.equals(key)) {
          registryService.copy(place.getPathArray(), key, place.getPathArray(), newKey, defaultCallback);
        }
      }
    });
    keyTable.addColumn(copyKeyColumn);
    keyTable.setColumnWidth(copyKeyColumn, 48, Unit.PX);

    Column<KeyTableRow, ImageResource> deleteKeyColumn = new Column<KeyTableRow, ImageResource>(new ImageButtonCell()) {
      @Override public ImageResource getValue(KeyTableRow object) {
        return images.delete();
      }
    };
    deleteKeyColumn.setFieldUpdater(new FieldUpdater<KeyTableRow, ImageResource>() {
      public void update(int index, KeyTableRow object, ImageResource value) {
        boolean confirmed = Window.confirm("Delete key " + object.getKey() + "?");
        if (confirmed) {
          registryService.del(place.getPathArray(), object.getKey(), defaultCallback);
        }
      }
    });
    keyTable.addColumn(deleteKeyColumn);
    keyTable.setColumnWidth(deleteKeyColumn, 48, Unit.PX);

    AbsolutePanel spacer = new AbsolutePanel();
    spacer.setHeight("10px");
    verticalPanel.add(spacer);

    HorizontalPanel buttons = new HorizontalPanel();
    buttons.add(newDir);
    buttons.add(newKey);
    verticalPanel.add(buttons);

    log.info("setting listing from constructor");
    setListing(listing);

    eventBus.addHandler(RegistryDirEvent.TYPE, new RegistryDirEvent.Handler() {
      @Override
      public void onRegistryDirChanged(RegistryDirEvent event) {
        if (event.getPath().equals(place.getPathString())) {
          refresh();
        }
      }
    });

    eventBus.addHandler(RegistryKeyEvent.TYPE, new RegistryKeyEvent.Handler() {
      @Override
      public void onRegistryKeyChanged(RegistryKeyEvent event) {
        if (event.getPath().equals(place.getPathString())) {
          refresh();
        }
      }
    });
  }

  public void setListing(RegistryListing result) {
    List<DirectoryTableRow> dirRows = new ArrayList<DirectoryTableRow>();
    for (String dir : result.getDirs()) {
      dirRows.add(new DirectoryTableRow(path, dir));
    }
    dirTable.setRowData(dirRows);

    List<KeyTableRow> keyRows = new ArrayList<KeyTableRow>();
    for (int i = 0; i < result.getKeys().length; i++) {
      String key = result.getKeys()[i];
      String value = result.getVals()[i];
      keyRows.add(new KeyTableRow(path, key, value));
    }
    keyTable.setRowData(keyRows);
  }

  public void refresh() {
    registryService.getListing(place.getPathArray(), new AsyncCallback<RegistryListing>() {
      public void onFailure(Throwable caught) {
        log.severe("error while refreshing registry listing: " + caught.getMessage());
      }
      public void onSuccess(RegistryListing result) {
        log.info("setting listing from refresh");
        setListing(result);
      }
    });
  }

}
