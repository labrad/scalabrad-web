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
import com.google.gwt.user.client.Window
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
import com.google.gwt.safehtml.shared.SafeUri
import com.google.gwt.safehtml.shared.UriUtils
import static extension org.labrad.browser.client.ui.Cells.*
import com.google.gwt.user.cellview.client.IdentityColumn
import com.google.gwt.user.client.ui.DialogBox
import com.google.gwt.user.client.ui.TextArea
import com.google.gwt.cell.client.TextCell
import com.google.gwt.dom.client.Element
import com.google.gwt.dom.client.NativeEvent
import com.google.gwt.cell.client.ValueUpdater
import com.google.gwt.place.shared.PlaceController
import org.fusesource.restygwt.client.MethodCallback
import org.fusesource.restygwt.client.Method

/**
 * A cell for a registry entry, which can be a directory or key,
 * or a special case link to go back to the parent directory.
 */
class EntryCell extends AbstractCell<TableRow> {
  static interface Templates extends SafeHtmlTemplates{
    @Template('<a href="{0}">{1}</a>')
    def SafeHtml link(SafeUri link, String label)

    @Template('<span>{0}</span>')
    def SafeHtml label(String label)
  }

  static val templates = GWT::create(Templates) as Templates

  val RegistryPlace place
  val PlaceHistoryMapper historyMapper
  val (TableRow)=>void onEnter

  new(RegistryPlace place, PlaceHistoryMapper historyMapper, (TableRow)=>void onEnter) {
    super("keydown")
    this.place = place
    this.historyMapper = historyMapper
    this.onEnter = onEnter
  }

  override void render(Cell.Context context, TableRow row, SafeHtmlBuilder sb) {
    switch row {
      ParentTableRow: {
        sb.append(templates.link(UriUtils.fromString("#" + historyMapper.getToken(place.parent)), ".."))
      }
      DirectoryTableRow: {
        sb.append(templates.link(UriUtils.fromString("#" + historyMapper.getToken(place.subDir(row.name))), row.name))
      }
      KeyTableRow: {
        sb.append(templates.label(row.key))
      }
    }
  }

  override void onEnterKeyDown(
    Cell.Context context,
    Element parent,
    TableRow row,
    NativeEvent event,
    ValueUpdater<TableRow> valueUpdater
  ) {
    onEnter.apply(row)
  }
}


class RegistryViewImpl extends Composite implements RegistryView{

  static val log = Logger::getLogger(RegistryViewImpl.name)

  static val DATA_REG_LOC = "text/labrad-registry-loc"
  static val DATA_REG_DIR = "text/labrad-registry-dir"
  static val DATA_REG_KEY = "text/labrad-registry-key"

  val defaultCallback = new MethodCallback<RegistryListing> {
    override void onFailure(Method method, Throwable caught) {
      log.severe(caught.message) // TODO: a bit more info here would help
      refresh()
    }
    override void onSuccess(Method method, RegistryListing result) {
      log.info("setting listing from defaultCallback")
      setListing(result)
    }
  }

  val RegistryPlace place
  val List<String> path
  val PlaceHistoryMapper historyMapper
  val RegistryService registryService
  val CellTable<TableRow> table

  val TextArea editKeyTextArea
  val DialogBox editKeyDialog

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
    PlaceController placeController,
    RegistryService registryService,
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
          registryService.mkdir(new RegistryService.MkDir(place.path, dir), defaultCallback)
        }
      ]
    ]

    val newKey = new Button("new key") => [
      addClickHandler [
        val key = Window::prompt("Enter key name", "")
        if (key != null) {
          val value = Window::prompt("Enter data value", "")
          if (value != null) {
            registryService.set(new RegistryService.Set(place.path, key, value), defaultCallback)
          }
        }
      ]
    ]

    editKeyTextArea = new TextArea

    editKeyDialog = new DialogBox => [
      glassEnabled = true
      animationEnabled = false

      add(new VerticalPanel => [
        add(editKeyTextArea)
        add(new Button("Ok") => [
          addClickHandler [
            editKeyDialog.hide()
          ]
        ])
      ])
    ]

    val nameCell = new EntryCell(place, historyMapper) [ row |
        switch row {
          ParentTableRow: {
            placeController.goTo(place.parent)
          }
          DirectoryTableRow: {
            placeController.goTo(place.subDir(row.name))
          }
          KeyTableRow: {
            // do nothing
          }
        }
      ]
      .decorated [ row |
        switch row {
          ParentTableRow: images.goBack
          DirectoryTableRow: images.folder
          KeyTableRow: images.key
        }
      ]
      .draggable [ row, dt |
        switch row {
          ParentTableRow: {}
          DirectoryTableRow: {
            DataTransferUtil::setEffectAllowed(dt, "copyMove")
            dt.setData(DATA_REG_LOC, historyMapper.getToken(place))
            dt.setData(DATA_REG_DIR, row.name)
          }
          KeyTableRow: {
            DataTransferUtil::setEffectAllowed(dt, "copyMove")
            dt.setData(DATA_REG_LOC, historyMapper.getToken(place))
            dt.setData(DATA_REG_KEY, row.key)
          }
        }
      ]

    val nameColumn = new IdentityColumn(nameCell)
    nameColumn.setFieldUpdater [i, row, value |
      switch row {
        ParentTableRow: presenter.goTo(place.parent)
        DirectoryTableRow: presenter.goTo(place.subDir(row.name))
        KeyTableRow: {}
      }
    ]

    val valueColumn = new TextCell().toColumn [ TableRow row |
      switch row {
        ParentTableRow: ""
        DirectoryTableRow: ""
        KeyTableRow: row.value
      }
    ]
    valueColumn.setFieldUpdater [i, row, value |
      switch row {
        ParentTableRow: {}
        DirectoryTableRow: {}
        KeyTableRow: registryService.set(new RegistryService.Set(place.path, row.key, value), defaultCallback)
      }
    ]

    val editColumn = new ImageButtonColumn<TableRow>(images.edit)
    editColumn.setFieldUpdater [i, row, value |
      switch row {
        ParentTableRow: {}
        DirectoryTableRow: {}
        KeyTableRow: {
          val from = row.value
          val to = Window::prompt("New value for " + row.key, from)
          if (to != null && to != from) {
            registryService.set(new RegistryService.Set(place.path, row.key, to), defaultCallback)
          }
        }
      }
    ]

    val renameColumn = new ImageButtonColumn<TableRow>(images.edit)
    renameColumn.setFieldUpdater [i, row, value |
      switch row {
        ParentTableRow: {}
        DirectoryTableRow: {
          val from = row.name
          val to = Window::prompt("New directory name", from)
          if (to != null && to != from) {
            registryService.renameDir(new RegistryService.RenameDir(place.path, from, to), defaultCallback)
          }
        }
        KeyTableRow: {
          val from = row.key
          val to = Window::prompt("New key name", from)
          if (to != null && to != from) {
            registryService.rename(new RegistryService.Rename(place.path, from, to), defaultCallback)
          }
        }
      }
    ]

    val copyColumn = new ImageButtonColumn<TableRow>(images.copy)
    copyColumn.setFieldUpdater [i, row, value |
      switch row {
        ParentTableRow: {}
        DirectoryTableRow: {
          val from = row.name
          val to = Window::prompt("New directory name", from)
          if (to != null && to != from) {
            registryService.copyDir(new RegistryService.CopyDir(place.path, from, place.path, to), defaultCallback)
          }
        }
        KeyTableRow: {
          val from = row.key
          val to = Window::prompt("New key name", from)
          if (to != null && to != from) {
            registryService.copy(new RegistryService.Copy(place.path, from, place.path, to), defaultCallback)
          }
        }
      }
    ]

    val deleteColumn = new ImageButtonColumn<TableRow>(images.delete)
    deleteColumn.setFieldUpdater [i, row, value |
      switch row {
        ParentTableRow: {}
        DirectoryTableRow: {
          val confirmed = Window::confirm('''Delete directory «row.name»?''')
          if (confirmed) {
            registryService.rmdir(new RegistryService.RmDir(place.path, row.name), defaultCallback)
          }
        }
        KeyTableRow: {
          val confirmed = Window::confirm('''Delete key «row.key»?''')
          if (confirmed) {
            registryService.del(new RegistryService.Del(place.path, row.key), defaultCallback)
          }
        }
      }
    ]

    table = new CellTable<TableRow>(15, resources) => [
      setWidth("100%", true)
      addColumn(nameColumn)
      addColumn(valueColumn)
      addColumn(editColumn)
      addColumn(renameColumn)
      addColumn(copyColumn)
      addColumn(deleteColumn)
      setColumnWidth(nameColumn, 150, Unit::PX)
      setColumnWidth(editColumn, 48, Unit::PX)
      setColumnWidth(renameColumn, 48, Unit::PX)
      setColumnWidth(copyColumn, 48, Unit::PX)
      setColumnWidth(deleteColumn, 48, Unit::PX)
    ]

    val verticalPanel = new VerticalPanel => [
      setSize("100%", "")
      add(breadcrumbs)
      add(table)
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
      if (new RegistryPlace(event.msg.path).pathString == place.pathString) {
        refresh()
      }
    ]
    eventBus.addHandler(RegistryKeyEvent::TYPE) [event|
      if (new RegistryPlace(event.msg.path).pathString == place.pathString) {
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
            registryService.copyDir(new RegistryService.CopyDir(srcPlace.path, dir, place.path, dir), defaultCallback)
          }
        } else {
          val confirmed = Window::confirm('''copy key «src»«key» to «dst»?''')
          if (confirmed) {
            registryService.copy(new RegistryService.Copy(srcPlace.path, key, place.path, key), defaultCallback)
          }
        }
      } else {
        // move
        if (key == null || key.isEmpty) {
          val confirmed = Window::confirm('''move directory «src»«dir»/ to «dst»?''')
          if (confirmed) {
            registryService.moveDir(new RegistryService.MoveDir(srcPlace.path, dir, place.path, dir), defaultCallback)
          }
        } else {
          val confirmed = Window::confirm('''move key «src»«key» to «dst»?''')
          if (confirmed) {
            registryService.move(new RegistryService.Move(srcPlace.path, key, place.path, key), defaultCallback)
          }
        }
      }
    ]
  }

  def void setListing(RegistryListing result) {
    val dirRows = new ArrayList<TableRow>

    if (!place.path.isEmpty) {
      val row = new ParentTableRow
      dirRows.add(row)
    }
    for (dir : result.dirs) {
      dirRows.add(new DirectoryTableRow(dir))
    }
    for (var int i = 0; i < result.keys.size; i++) {
      dirRows.add(new KeyTableRow(result.keys.get(i), result.vals.get(i)))
    }

    table.setRowData(dirRows)
  }

  def void refresh() {
    registryService.dir(place.path, new MethodCallback<RegistryListing> {
      override void onFailure(Method method, Throwable caught) {
        log.severe('''error while refreshing registry listing: «caught.message»''')
      }
      override void onSuccess(Method method, RegistryListing result) {
        log.info("setting listing from refresh")
        setListing(result) 
      }
    })
  }
}
