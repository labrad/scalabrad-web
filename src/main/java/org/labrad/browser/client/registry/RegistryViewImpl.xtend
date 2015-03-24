package org.labrad.browser.client.registry

import java.util.ArrayList
import java.util.List
import java.util.logging.Logger
import org.labrad.browser.client.BreadcrumbView
import org.labrad.browser.client.BrowserImages
import org.labrad.browser.client.event.RegistryDirEvent
import org.labrad.browser.client.event.RegistryKeyEvent
import org.labrad.browser.client.util.DataTransferUtil
import org.labrad.browser.client.util.LogUtil
import com.google.gwt.cell.client.AbstractCell
import com.google.gwt.cell.client.Cell
import com.google.gwt.cell.client.EditTextCell
import com.google.gwt.cell.client.IconCellDecorator
import com.google.gwt.cell.client.TextCell
import com.google.gwt.core.client.GWT
import com.google.gwt.dom.client.Style.Unit
import com.google.gwt.event.dom.client.DragEnterEvent
import com.google.gwt.event.dom.client.DragOverEvent
import com.google.gwt.event.dom.client.DropEvent
import com.google.gwt.event.shared.EventBus
import com.google.gwt.place.shared.PlaceHistoryMapper
import com.google.gwt.safehtml.client.SafeHtmlTemplates
import com.google.gwt.safehtml.shared.SafeHtml
import com.google.gwt.safehtml.shared.SafeHtmlBuilder
import com.google.gwt.user.cellview.client.CellTable
import com.google.gwt.user.cellview.client.TextColumn
import com.google.gwt.user.client.Window
import com.google.gwt.user.client.rpc.AsyncCallback
import com.google.gwt.user.client.ui.AbsolutePanel
import com.google.gwt.user.client.ui.Button
import com.google.gwt.user.client.ui.Composite
import com.google.gwt.user.client.ui.HorizontalPanel
import com.google.gwt.user.client.ui.VerticalPanel
import com.google.inject.assistedinject.Assisted
import com.google.inject.assistedinject.AssistedInject
import org.labrad.browser.client.ui.ImageButtonColumn
import com.google.gwt.event.shared.EventHandler
import com.google.gwt.event.shared.HandlerRegistration
import com.google.gwt.event.dom.client.DomEvent
import org.labrad.browser.client.ui.DraggableCell
import static extension org.labrad.browser.client.ui.Cells.toColumn

class RegistryViewImpl extends Composite implements RegistryView{

  static val log = Logger::getLogger(RegistryViewImpl.name)

  static interface Templates extends SafeHtmlTemplates {
    @Template('<a href="#{0}">{1}</a>')
    def SafeHtml subDirLink(String token, String linkText)
  }

  static val templates = GWT::create(Templates) as Templates

  static val DATA_REG_LOC = "text/labrad-registry-loc"
  static val DATA_REG_DIR = "text/labrad-registry-dir"
  static val DATA_REG_KEY = "text/labrad-registry-key"

  static class SubDirCell extends AbstractCell<String> {
    package RegistryPlace place
    package PlaceHistoryMapper historyMapper

    new(RegistryPlace place, PlaceHistoryMapper historyMapper) {
      super()
      this.place = place
      this.historyMapper = historyMapper
    }
    override void render(Cell.Context context, String dir, SafeHtmlBuilder sb) {
      val subDir = place.subDir(dir)
      sb.append(templates.subDirLink(historyMapper.getToken(subDir), dir))
    }
  }

  val defaultCallback = new AsyncCallback<RegistryListing> {
    override void onFailure(Throwable caught) {
      log.severe(caught.message) // TODO: a bit more info here would help
      refresh()
    }
    override void onSuccess(RegistryListing result) {
      log.info("setting listing from defaultCallback")
      setListing(result)
    }
  }

  final RegistryPlace place
  final List<String> path
  final PlaceHistoryMapper historyMapper
  final RegistryServiceAsync registryService
  CellTable<DirectoryTableRow> dirTable
  CellTable<KeyTableRow> keyTable

  /**
   * Variant of the standard addDomHandler method that reverses the order
   * of arguments so this can be used cleanly with Xtend lambdas.
   */
  def <H extends EventHandler> HandlerRegistration addDomHandler(DomEvent.Type<H> type, H handler) {
    addDomHandler(handler, type)
  }

  @AssistedInject
  new(
    @Assisted RegistryPlace place,
    @Assisted RegistryListing listing,
    @Assisted Presenter presenter,
    @Assisted EventBus eventBus,
    PlaceHistoryMapper historyMapper,
    RegistryServiceAsync registryService,
    BrowserImages images,
    CellTable.Resources resources
  ) {
    this.place = place
    this.path = place.path
    this.historyMapper = historyMapper
    this.registryService = registryService

    val breadcrumbs = new BreadcrumbView("Registry", path, historyMapper, [new RegistryPlace(it)])

    val newDir = new Button("new directory") => [
      addClickHandler [
        val dir = Window::prompt("Enter directory name", "")
        if (dir != null) {
          registryService.mkdir(place.pathArray, dir, defaultCallback)
        }
      ]
    ]

    val newKey = new Button("new key") => [
      addClickHandler [
        val key = Window::prompt("Enter key name", "")
        if (key != null) {
          val value = Window::prompt("Enter data value", "")
          if (value != null) {
            registryService.set(place.pathArray, key, value, defaultCallback)
          }
        }
      ]
    ]

    val dirCell = new DraggableCell(new IconCellDecorator(images.folder, new SubDirCell(place, historyMapper))) [ dir, dt |
      DataTransferUtil::setEffectAllowed(dt, "copyMove")
      dt.setData(DATA_REG_LOC, historyMapper.getToken(place))
      dt.setData(DATA_REG_DIR, dir)
    ]
    val dirColumn = dirCell.toColumn[DirectoryTableRow dir | dir.name]
    dirColumn.setFieldUpdater [i, dir, value |
      val newPath = new ArrayList<String>(path)
      newPath.add(dir.name)
      presenter.goTo(new RegistryPlace(newPath))
    ]

    val dummyColumn = new TextColumn<DirectoryTableRow> {
      override String getValue(DirectoryTableRow object) {
        ""
      }
    }

    val renameDirColumn = new ImageButtonColumn<DirectoryTableRow>(images.edit)
    renameDirColumn.setFieldUpdater [i, object, value |
      val from = object.name
      val to = Window::prompt("New directory name", from)
      if (to != null && to != from) {
        registryService.renameDir(place.pathArray, from, to, defaultCallback)
      }
    ]

    val copyDirColumn = new ImageButtonColumn<DirectoryTableRow>(images.copy)
    copyDirColumn.setFieldUpdater [i, object, value |
      val from = object.name
      val to = Window::prompt("New directory name", from)
      if (to != null && to != from) {
        registryService.copyDir(place.pathArray, from, place.pathArray, to, defaultCallback)
      }
    ]

    val deleteDirColumn = new ImageButtonColumn<DirectoryTableRow>(images.delete)
    deleteDirColumn.setFieldUpdater [i, object, value|
      val dir = object.name
      val confirmed = Window::confirm('''Delete directory «dir»?''')
      if (confirmed) {
        registryService.rmdir(place.pathArray, dir, defaultCallback)
      }
    ]

    val keyCell = new DraggableCell(new IconCellDecorator(images.key, new TextCell)) [ key, dt |
      DataTransferUtil::setEffectAllowed(dt, "copyMove")
      dt.setData(DATA_REG_LOC, historyMapper.getToken(place))
      dt.setData(DATA_REG_KEY, key)
    ]
    val keyColumn = keyCell.toColumn[KeyTableRow key | key.key]

    val valueColumn = new EditTextCell().toColumn[KeyTableRow key | key.value]
    valueColumn.setFieldUpdater [i, object, value |
      registryService.set(place.pathArray, object.key, value, defaultCallback)
    ]

    val renameKeyColumn = new ImageButtonColumn<KeyTableRow>(images.edit)
    renameKeyColumn.setFieldUpdater [i, object, value|
      val from = object.key
      val to = Window::prompt("New key name", from)
      if (to != null && to != from) {
        registryService.rename(place.pathArray, from, to, defaultCallback) 
      }
    ]

    val copyKeyColumn = new ImageButtonColumn<KeyTableRow>(images.copy)
    copyKeyColumn.fieldUpdater = [i, object, value|
      val from = object.key
      val to = Window::prompt("New key name", from)
      if (to != null && to != from) {
        registryService.copy(place.pathArray, from, place.pathArray, to, defaultCallback)
      }
    ]

    val deleteKeyColumn = new ImageButtonColumn<KeyTableRow>(images.delete)
    deleteKeyColumn.fieldUpdater = [i, object, value|
      val confirmed = Window::confirm('''Delete key «object.key»?''')
      if (confirmed) {
        registryService.del(place.pathArray, object.key, defaultCallback)
      }
    ]

    dirTable = new CellTable<DirectoryTableRow>(15, resources) => [
      setWidth("100%", true)
      addColumn(dirColumn)
      addColumn(dummyColumn)
      addColumn(renameDirColumn)
      addColumn(copyDirColumn)
      addColumn(deleteDirColumn)
      setColumnWidth(dirColumn, 150, Unit::PX)
      setColumnWidth(renameDirColumn, 48, Unit::PX)
      setColumnWidth(copyDirColumn, 48, Unit::PX)
      setColumnWidth(deleteDirColumn, 48, Unit::PX)
    ]

    keyTable = new CellTable<KeyTableRow>(15, resources) => [
      setWidth("100%", true)
      addColumn(keyColumn)
      addColumn(valueColumn)
      addColumn(renameKeyColumn)
      addColumn(copyKeyColumn)
      addColumn(deleteKeyColumn)
      setColumnWidth(keyColumn, 150, Unit::PX)
      setColumnWidth(renameKeyColumn, 48, Unit::PX)
      setColumnWidth(copyKeyColumn, 48, Unit::PX)
      setColumnWidth(deleteKeyColumn, 48, Unit::PX)
    ]

    val verticalPanel = new VerticalPanel => [
      setSize("100%", "")
      add(breadcrumbs)
      add(dirTable)
      add(keyTable)
      add(new AbsolutePanel => [setHeight("10px")])
      add(new HorizontalPanel => [
        add(newDir)
        add(newKey)
      ])
    ]
    initWidget(verticalPanel)

    log.info("setting listing from constructor")
    setListing(listing)

    // now that UI is in place, set up additional event handlers
    eventBus.addHandler(RegistryDirEvent::TYPE) [event|
      if (event.path == place.pathString) {
        refresh()
      }
    ]
    eventBus.addHandler(RegistryKeyEvent::TYPE) [event|
      if (event.path == place.pathString) {
        refresh()
      }
    ]

    addDomHandler(DragOverEvent::type) [ event | event.preventDefault() ]
    addDomHandler(DragEnterEvent::type) [ event | event.preventDefault() ]
    addDomHandler(DropEvent::type) [ event |
      event.preventDefault()
      val dt = event.dataTransfer
      log.info('''drop. datatransfer = «dt»''')
      LogUtil::consoleLog(event.nativeEvent)
      LogUtil::consoleLog(dt)
      val effectAllowed = DataTransferUtil::getEffectAllowed(dt)
      val srcToken = dt.getData(DATA_REG_LOC)
      val srcPlace = historyMapper.getPlace(srcToken) as RegistryPlace
      val src = srcPlace.pathString
      val dir = dt.getData(DATA_REG_DIR)
      val key = dt.getData(DATA_REG_KEY)
      val dst = place.pathString
      if (effectAllowed == "copy") {
        // copy
        if (key == null || key.isEmpty) {
          val confirmed = Window::confirm('''copy directory «src»«dir»/ to «dst»?''')
          if (confirmed) {
            registryService.copyDir(srcPlace.pathArray, dir, place.pathArray, dir, defaultCallback)
          }
        } else {
          val confirmed = Window::confirm('''copy key «src»«key» to «dst»?''')
          if (confirmed) {
            registryService.copy(srcPlace.pathArray, key, place.pathArray, key, defaultCallback)
          }
        }
      } else {
        // move
        if (key == null || key.isEmpty) {
          val confirmed = Window::confirm('''move directory «src»«dir»/ to «dst»?''')
          if (confirmed) {
            registryService.moveDir(srcPlace.pathArray, dir, place.pathArray, dir, defaultCallback)
          }
        } else {
          val confirmed = Window::confirm('''move key «src»«key» to «dst»?''')
          if (confirmed) {
            registryService.move(srcPlace.pathArray, key, place.pathArray, key, defaultCallback)
          }
        }
      }
    ]
  }

  def void setListing(RegistryListing result) {
    val dirRows = new ArrayList<DirectoryTableRow>
    for (dir : result.dirs) {
      dirRows.add(new DirectoryTableRow(dir))
    }
    dirTable.setRowData(dirRows)

    val keyRows = new ArrayList<KeyTableRow>

    for (var int i = 0 ; i < result.keys.length; i++) {
      val key = result.keys.get(i)
      val value = result.vals.get(i)
      keyRows.add(new KeyTableRow(key, value))
    }
    keyTable.setRowData(keyRows)
  }

  def void refresh() {
    registryService.getListing(place.pathArray, new AsyncCallback<RegistryListing> {
      override void onFailure(Throwable caught) {
        log.severe('''error while refreshing registry listing: «caught.message»''')
      }
      override void onSuccess(RegistryListing result) {
        log.info("setting listing from refresh")
        setListing(result) 
      }
    })
  }
}
