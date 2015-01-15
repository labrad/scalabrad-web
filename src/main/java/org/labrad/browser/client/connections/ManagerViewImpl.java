package org.labrad.browser.client.connections;

import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.labrad.browser.client.BrowserImages;
import org.labrad.browser.client.server.ServerPlace;
import org.labrad.browser.client.ui.ImageButtonCell;
import org.labrad.browser.client.ui.TableResources;

import com.google.gwt.cell.client.AbstractCell;
import com.google.gwt.cell.client.Cell;
import com.google.gwt.cell.client.FieldUpdater;
import com.google.gwt.core.shared.GWT;
import com.google.gwt.dom.client.Style.Unit;
import com.google.gwt.event.shared.EventBus;
import com.google.gwt.place.shared.PlaceHistoryMapper;
import com.google.gwt.resources.client.ImageResource;
import com.google.gwt.safehtml.client.SafeHtmlTemplates;
import com.google.gwt.safehtml.shared.SafeHtml;
import com.google.gwt.safehtml.shared.SafeHtmlBuilder;
import com.google.gwt.safehtml.shared.SafeHtmlUtils;
import com.google.gwt.safehtml.shared.SafeUri;
import com.google.gwt.safehtml.shared.UriUtils;
import com.google.gwt.user.cellview.client.CellTable;
import com.google.gwt.user.cellview.client.Column;
import com.google.gwt.user.cellview.client.ColumnSortEvent;
import com.google.gwt.user.cellview.client.ColumnSortEvent.ListHandler;
import com.google.gwt.user.cellview.client.ColumnSortList;
import com.google.gwt.user.cellview.client.TextColumn;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.VerticalPanel;
import com.google.gwt.view.client.ListDataProvider;
import com.google.inject.assistedinject.Assisted;
import com.google.inject.assistedinject.AssistedInject;

public class ManagerViewImpl extends Composite implements ManagerView {

  // custom cell table styles
  private static final CellTable.Resources resources = GWT.create(TableResources.class);

  private static final String UP = "\u2191";
  private static final String DOWN = "\u2193";

  private final EventBus eventBus;
  private final Presenter presenter;
  private final PlaceHistoryMapper placeMapper;

  private CellTable<ConnectionInfo> table;
  private ListDataProvider<ConnectionInfo> dataProvider;

  @AssistedInject
  public ManagerViewImpl(
      @Assisted final Presenter presenter,
      @Assisted final EventBus eventBus,
      @Assisted final PlaceHistoryMapper placeMapper,
      final BrowserImages images) {
    this.presenter = presenter;
    this.eventBus = eventBus;
    this.placeMapper = placeMapper;

    table = new CellTable<ConnectionInfo>(15, resources);
    table.setWidth("100%", true);

    // id
    TextColumn<ConnectionInfo> idColumn = new TextColumn<ConnectionInfo>() {
      @Override public String getValue(ConnectionInfo object) {
        return "" + object.getId();
      }
    };
    idColumn.setSortable(true);
    idColumn.setDefaultSortAscending(true);
    idColumn.setHorizontalAlignment(TextColumn.ALIGN_RIGHT);
    table.addColumn(idColumn, "Id");
    table.setColumnWidth(idColumn, 100, Unit.PX);

    //status
    TextColumn<ConnectionInfo> statusColumn = new TextColumn<ConnectionInfo>() {
      @Override public String getValue(ConnectionInfo object) {
        if (object.isServer()) {
          return object.isActive() ? "server" : "server";
        } else {
          return object.isActive() ? "client" : "client";
        }
      }
    };
    statusColumn.setSortable(true);
    table.addColumn(statusColumn, "Type");
    table.setColumnWidth(statusColumn, 60, Unit.PX);

    // name
    Cell<MaybeLink> nameCell = new LinkCell();
    Column<ConnectionInfo, MaybeLink> nameColumn = new Column<ConnectionInfo, MaybeLink>(nameCell) {
      @Override public MaybeLink getValue(ConnectionInfo c) {
        String name = c.getName();
        if (c.isServer() && c.isActive()) {
          ServerPlace place = new ServerPlace(name);
          return new MaybeLink(name, "#" + placeMapper.getToken(place), true);
        } else {
          return new MaybeLink(name, name, false);
        }
      }
    };
    nameColumn.setSortable(true);
    table.addColumn(nameColumn, "Name");
    //table.setColumnWidth(nameColumn, 200, Unit.PX);

    // server requests
    TextColumn<ConnectionInfo> srvReqColumn = new TextColumn<ConnectionInfo>() {
      @Override public String getValue(ConnectionInfo c) {
        return (c.isServer() && c.isActive()) ? "" + c.getServerReqCount() : "-";
      }
    };
    srvReqColumn.setSortable(true);
    srvReqColumn.setHorizontalAlignment(TextColumn.ALIGN_RIGHT);
    table.addColumn(srvReqColumn, "Srv" + UP);
    table.setColumnWidth(srvReqColumn, 80, Unit.PX);

    // server responses
    TextColumn<ConnectionInfo> srvRepColumn = new TextColumn<ConnectionInfo>() {
      @Override public String getValue(ConnectionInfo c) {
        return (c.isServer() && c.isActive()) ? "" + c.getServerRespCount() : "-";
      }
    };
    srvRepColumn.setSortable(true);
    srvRepColumn.setHorizontalAlignment(TextColumn.ALIGN_RIGHT);
    table.addColumn(srvRepColumn, "Srv" + DOWN);
    table.setColumnWidth(srvRepColumn, 80, Unit.PX);

    // client requests
    TextColumn<ConnectionInfo> clientReqColumn = new TextColumn<ConnectionInfo>() {
      @Override public String getValue(ConnectionInfo c) {
        return c.isActive() ? "" + c.getClientReqCount() : "-";
      }
    };
    clientReqColumn.setSortable(true);
    clientReqColumn.setHorizontalAlignment(TextColumn.ALIGN_RIGHT);
    table.addColumn(clientReqColumn, "Client" + UP);
    table.setColumnWidth(clientReqColumn, 80, Unit.PX);

    // client responses
    TextColumn<ConnectionInfo> clientRepColumn = new TextColumn<ConnectionInfo>() {
      @Override public String getValue(ConnectionInfo c) {
        return c.isActive() ? "" + c.getClientRespCount() : "-";
      }
    };
    clientRepColumn.setSortable(true);
    clientRepColumn.setHorizontalAlignment(TextColumn.ALIGN_RIGHT);
    table.addColumn(clientRepColumn, "Client" + DOWN);
    table.setColumnWidth(clientRepColumn, 80, Unit.PX);

    // message send
    TextColumn<ConnectionInfo> msgSendColumn = new TextColumn<ConnectionInfo>() {
      @Override public String getValue(ConnectionInfo c) {
        return c.isActive() ? "" + c.getMsgSendCount() : "-";
      }
    };
    msgSendColumn.setSortable(true);
    msgSendColumn.setHorizontalAlignment(TextColumn.ALIGN_RIGHT);
    table.addColumn(msgSendColumn, "Msg" + UP);
    table.setColumnWidth(msgSendColumn, 80, Unit.PX);

    // message receive
    TextColumn<ConnectionInfo> msgRecvColumn = new TextColumn<ConnectionInfo>() {
      @Override public String getValue(ConnectionInfo c) {
        return c.isActive() ? "" + c.getMsgRecvCount() : "-";
      }
    };
    msgRecvColumn.setSortable(true);
    msgRecvColumn.setHorizontalAlignment(TextColumn.ALIGN_RIGHT);
    table.addColumn(msgRecvColumn, "Msg" + DOWN);
    table.setColumnWidth(msgRecvColumn, 80, Unit.PX);

    Column<ConnectionInfo, ImageResource> disconnectColumn = new Column<ConnectionInfo, ImageResource>(new ImageButtonCell()) {
      @Override public ImageResource getValue(ConnectionInfo object) {
        return images.cancel();
      }
    };
    disconnectColumn.setFieldUpdater(new FieldUpdater<ConnectionInfo, ImageResource>() {
      public void update(int index, ConnectionInfo object, ImageResource value) {
        long id = object.getId();
        String name = object.getName();
        String type = object.isServer() ? "server" : "client";
        boolean disconnect = Window.confirm("Disconnect " + type + " '" + name + "' (" + id + ")?");
        if (disconnect) {
          presenter.closeConnection(id);
        }
      }
    });
    table.addColumn(disconnectColumn);
    table.setColumnWidth(disconnectColumn, 48, Unit.PX);

    // set up data provider
    dataProvider = new ListDataProvider<ConnectionInfo>();
    dataProvider.addDataDisplay(table);

    // set up column sorting
    sortOn(idColumn, true, new Comparator<ConnectionInfo>() {
      public int compare(ConnectionInfo o1, ConnectionInfo o2) {
        return compareLongs(o1.getId(), o2.getId());
      }
    });

    sortOn(statusColumn, false, new Comparator<ConnectionInfo>() {
      public int compare(ConnectionInfo o1, ConnectionInfo o2) {
        return compareBools(o1.isServer(), o2.isServer());
      }
    });

    sortOn(nameColumn, false, new Comparator<ConnectionInfo>() {
      public int compare(ConnectionInfo o1, ConnectionInfo o2) {
        return compareStrings(o1.getName(), o2.getName());
      }
    });

    sortOn(srvReqColumn, false, new Comparator<ConnectionInfo>() {
      public int compare(ConnectionInfo o1, ConnectionInfo o2) {
        return compareLongs(o1.getServerReqCount(), o2.getServerReqCount());
      }
    });

    sortOn(srvRepColumn, false, new Comparator<ConnectionInfo>() {
      public int compare(ConnectionInfo o1, ConnectionInfo o2) {
        return compareLongs(o1.getServerRespCount(), o2.getServerRespCount());
      }
    });

    sortOn(clientReqColumn, false, new Comparator<ConnectionInfo>() {
      public int compare(ConnectionInfo o1, ConnectionInfo o2) {
        return compareLongs(o1.getClientReqCount(), o2.getClientReqCount());
      }
    });

    sortOn(clientRepColumn, false, new Comparator<ConnectionInfo>() {
      public int compare(ConnectionInfo o1, ConnectionInfo o2) {
        return compareLongs(o1.getClientRespCount(), o2.getClientRespCount());
      }
    });

    sortOn(msgSendColumn, false, new Comparator<ConnectionInfo>() {
      public int compare(ConnectionInfo o1, ConnectionInfo o2) {
        return compareLongs(o1.getMsgSendCount(), o2.getMsgSendCount());
      }
    });

    sortOn(msgRecvColumn, false, new Comparator<ConnectionInfo>() {
      public int compare(ConnectionInfo o1, ConnectionInfo o2) {
        return compareLongs(o1.getMsgRecvCount(), o2.getMsgRecvCount());
      }
    });

    // sorted by id by default.
    table.getColumnSortList().push(idColumn);

    VerticalPanel container = new VerticalPanel();
    container.add(table);
    initWidget(container);
  }

  private void sortOn(Column<ConnectionInfo, ?> column, boolean byDefault, Comparator<ConnectionInfo> comparator) {
    ListHandler<ConnectionInfo> sortHandler = new ListHandler<ConnectionInfo>(dataProvider.getList());
    sortHandler.setComparator(column, comparator);
    table.addColumnSortHandler(sortHandler);
    if (byDefault) {
      table.getColumnSortList().push(new ColumnSortList.ColumnSortInfo(column, false));
    }
  }

  private int compareBools(boolean a, boolean b) {
    if (a == b) return 0;
    return a ? 1 : -1;
  }

  private int compareStrings(String a, String b) {
    if (a == b) {
      return 0;
    }

    // Compare the name columns.
    if (a != null) {
      return (b != null) ? a.compareTo(b) : 1;
    }
    return -1;
  }

  private int compareLongs(long a, long b) {
    if (a > b) return 1;
    else if (a == b) return 0;
    else return -1;
  }

  public void setData(ConnectionInfo[] connections) {
    List<ConnectionInfo> data = dataProvider.getList();
    Map<Integer, Long> idMap = new HashMap<Integer, Long>();
    Map<Long, Integer> idxMap = new HashMap<Long, Integer>();
    for (int i = 0; i < data.size(); i++) {
      long id = data.get(i).getId();
      idMap.put(i, id);
      idxMap.put(id, i);
    }

    boolean added = false;
    Set<Long> newIds = new HashSet<Long>();
    for (int i = 0; i < connections.length; i++) {
      ConnectionInfo info = connections[i];
      long id = info.getId();
      if (idxMap.containsKey(id)) {
        // update row in the table
        data.set(idxMap.get(id), info);
      } else {
        // add new row to the table
        data.add(info);
        added = true;
      }
      // keep track of new ids so we can remove any that go away
      newIds.add(id);
    }
    // remove rows with ids that no longer exist
    for (int i = data.size() - 1; i >= 0; i--) {
      long id = data.get(i).getId();
      if (!newIds.contains(id)) {
        data.remove(i);
      }
    }

    table.setPageSize(connections.length);
    if (added) ColumnSortEvent.fire(table, table.getColumnSortList());
  }

  static class MaybeLink {
    private boolean link;
    private String label;
    private String url;

    public MaybeLink(String label, String url, boolean link) {
      this.label = label;
      this.url = url;
      this.link = link;
    }

    boolean isLink() { return link; }
    public String getLabel() { return label; }
    public String getUrl() { return url; }
  }

  static class LinkCell extends AbstractCell<MaybeLink> {
    interface Templates extends SafeHtmlTemplates {
      @SafeHtmlTemplates.Template("<a href=\"{0}\">{1}</a>")
      SafeHtml link(SafeUri link, SafeHtml label);

      @SafeHtmlTemplates.Template("<span>{0}</span>")
      SafeHtml label(SafeHtml label);
    }
    private static Templates templates = GWT.create(Templates.class);

    @Override
    public void render(Context context, MaybeLink value, SafeHtmlBuilder sb) {
      if (value == null) {
        return;
      }
      SafeHtml label = SafeHtmlUtils.fromString(value.getLabel());
      if (value.isLink()) {
        SafeUri safeUri = UriUtils.fromString(value.getUrl());
        sb.append(templates.link(safeUri, label));
      } else {
        sb.append(templates.label(label));
      }
    }
  }
}
