package org.labrad.browser.client.connections

import java.util.Comparator
import java.util.HashMap
import java.util.HashSet
import org.labrad.browser.client.BrowserImages
import org.labrad.browser.client.server.ServerPlace
import org.labrad.browser.client.ui.ImageButtonCell
import com.google.gwt.dom.client.Style.Unit
import com.google.gwt.event.shared.EventBus
import com.google.gwt.place.shared.PlaceHistoryMapper
import com.google.gwt.resources.client.ImageResource
import com.google.gwt.user.cellview.client.CellTable
import com.google.gwt.user.cellview.client.Column
import com.google.gwt.user.cellview.client.ColumnSortEvent
import com.google.gwt.user.cellview.client.ColumnSortEvent.ListHandler
import com.google.gwt.user.cellview.client.ColumnSortList
import com.google.gwt.user.cellview.client.TextColumn
import com.google.gwt.user.client.Window
import com.google.gwt.user.client.ui.Composite
import com.google.gwt.user.client.ui.VerticalPanel
import com.google.gwt.view.client.ListDataProvider
import com.google.inject.assistedinject.Assisted
import com.google.inject.assistedinject.AssistedInject
import org.labrad.browser.client.ui.Columns
import org.labrad.browser.client.ui.MaybeLink
import org.labrad.browser.client.ui.MaybeLinkCell
import static extension org.labrad.browser.client.ui.Cells.toColumn

class ManagerViewImpl extends Composite implements ManagerView {

  static val UP = "\u2191"
  static val DOWN = "\u2193"

  val CellTable<ConnectionInfo> table
  val ListDataProvider<ConnectionInfo> dataProvider

  @AssistedInject
  new(
    @Assisted Presenter presenter,
    @Assisted EventBus eventBus,
    PlaceHistoryMapper placeMapper,
    BrowserImages images,
    CellTable.Resources resources
  ) {

    // id
    val idColumn = new TextColumn<ConnectionInfo> {
      override def String getValue(ConnectionInfo object) {
        Long.toString(object.id)
      }
    }
    idColumn.setSortable(true)
    idColumn.setDefaultSortAscending(true)
    idColumn.setHorizontalAlignment(TextColumn::ALIGN_RIGHT)

    //status
    val statusColumn = Columns::<ConnectionInfo>text [
      if (isServer) {
        if (isActive) "server" else "server"
      } else {
        if (isActive) "client" else "client"
      }
    ]
    statusColumn.setSortable(true)

    val nameColumn = new MaybeLinkCell().toColumn [ ConnectionInfo c |
      if (c.isServer && c.isActive) {
        new MaybeLink(c.name, "#" + placeMapper.getToken(new ServerPlace(c.name)), true)
      } else {
        new MaybeLink(c.name, c.name, false)
      }
    ]
    nameColumn.setSortable(true)

    // server requests
    val srvReqColumn = Columns::<ConnectionInfo>text [
      if (isServer && isActive) Long.toString(serverReqCount) else "-"
    ]
    srvReqColumn.setSortable(true)
    srvReqColumn.setHorizontalAlignment(TextColumn::ALIGN_RIGHT)

    // server responses
    val srvRepColumn = Columns::<ConnectionInfo>text [
      if (isServer && isActive) Long.toString(serverRespCount) else "-"
    ]
    srvRepColumn.setSortable(true)
    srvRepColumn.setHorizontalAlignment(TextColumn::ALIGN_RIGHT)

    // client requests
    val clientReqColumn = Columns::<ConnectionInfo>text [
      if (isActive) Long.toString(clientReqCount) else "-"
    ]
    clientReqColumn.setSortable(true)
    clientReqColumn.setHorizontalAlignment(TextColumn::ALIGN_RIGHT)

    // client responses
    val clientRepColumn = Columns::<ConnectionInfo>text [
      if (isActive) Long.toString(clientRespCount) else "-"
    ]
    clientRepColumn.setSortable(true)
    clientRepColumn.setHorizontalAlignment(TextColumn::ALIGN_RIGHT)

    // message send
    val msgSendColumn = Columns::<ConnectionInfo>text [
      if (isActive) Long.toString(msgSendCount) else "-"
    ]
    msgSendColumn.setSortable(true)
    msgSendColumn.setHorizontalAlignment(TextColumn::ALIGN_RIGHT)

    // message receive
    val msgRecvColumn = Columns::<ConnectionInfo>text [
      if (isActive) Long.toString(msgRecvCount) else "-"
    ]
    msgRecvColumn.setSortable(true)
    msgRecvColumn.setHorizontalAlignment(TextColumn::ALIGN_RIGHT)

    val disconnectColumn = new Column<ConnectionInfo, ImageResource>(new ImageButtonCell) {
      override ImageResource getValue(ConnectionInfo c) {
        return images.cancel
      }
    }
    disconnectColumn.setFieldUpdater [ i, cxn, value |
      val type = if (cxn.isServer) "server" else "client"
      val disconnect = Window::confirm('''Disconnect «type» '«cxn.name»' («cxn.id»)?''')
      if (disconnect) {
        presenter.closeConnection(cxn.id)
      }
    ]

    table = new CellTable<ConnectionInfo>(15, resources) => [
      setWidth("100%", true)
      addColumn(idColumn, "Id")
      setColumnWidth(idColumn, 100, Unit::PX)
      addColumn(statusColumn, "Type")
      setColumnWidth(statusColumn, 60, Unit::PX) // name
      addColumn(nameColumn, "Name")
      //setColumnWidth(nameColumn, 200, Unit.PX)
      addColumn(srvReqColumn, "Srv" + UP)
      setColumnWidth(srvReqColumn, 80, Unit::PX)
      addColumn(srvRepColumn, "Srv" + DOWN)
      setColumnWidth(srvRepColumn, 80, Unit::PX)
      addColumn(clientReqColumn, "Client" + UP)
      setColumnWidth(clientReqColumn, 80, Unit::PX)
      addColumn(clientRepColumn, "Client" + DOWN)
      setColumnWidth(clientRepColumn, 80, Unit::PX)
      addColumn(msgSendColumn, "Msg" + UP)
      setColumnWidth(msgSendColumn, 80, Unit::PX)
      addColumn(msgRecvColumn, "Msg" + DOWN)
      setColumnWidth(msgRecvColumn, 80, Unit::PX)
      addColumn(disconnectColumn)
      setColumnWidth(disconnectColumn, 48, Unit::PX)
    ]

    // set up data provider
    dataProvider = new ListDataProvider<ConnectionInfo>
    dataProvider.addDataDisplay(table)

    // set up column sorting
    sortOn(idColumn, true) [ a, b | compareLongs(a.id, b.id) ]
    sortOn(statusColumn, false) [ a, b | compareBools(a.isServer, b.isServer) ]
    sortOn(nameColumn, false) [ a, b | compareStrings(a.name, b.name) ]
    sortOn(srvReqColumn, false) [ a, b | compareLongs(a.serverReqCount, b.serverReqCount) ]
    sortOn(srvRepColumn, false) [ a, b | compareLongs(a.serverRespCount, b.serverRespCount) ]
    sortOn(clientReqColumn, false) [ a, b | compareLongs(a.clientReqCount, b.clientReqCount) ]
    sortOn(clientRepColumn, false) [ a, b | compareLongs(a.clientRespCount, b.clientRespCount) ]
    sortOn(msgSendColumn, false) [ a, b | compareLongs(a.msgSendCount, b.msgSendCount) ]
    sortOn(msgRecvColumn, false) [ a, b | compareLongs(a.msgRecvCount, b.msgRecvCount) ]

    // sorted by id by default.
    table.columnSortList.push(idColumn)

    val container = new VerticalPanel => [
      add(table)
    ]
    initWidget(container)
  }

  private def void sortOn(Column<ConnectionInfo, ?> column, boolean byDefault, Comparator<ConnectionInfo> comparator) {
    val sortHandler = new ListHandler<ConnectionInfo>(dataProvider.list)
    sortHandler.setComparator(column, comparator)
    table.addColumnSortHandler(sortHandler)
    if (byDefault) {
      table.columnSortList.push(new ColumnSortList.ColumnSortInfo(column, false))
    }
  }

  private def int compareBools(boolean a, boolean b) {
    if (a == b) 0 else if (a) 1 else -1
  }

  private def int compareStrings(String a, String b) {
    if (a == b) {
      return 0
    }
    // Compare the name columns.
    if (a != null) {
      return if ((b != null)) a.compareTo(b) else 1
    }
    return -1
  }

  private def int compareLongs(long a, long b) {
    if (a > b) 1 else if (a == b) 0 else -1
  }

  override void setData(ConnectionInfo[] connections) {
    val data = dataProvider.list
    val idMap = new HashMap<Integer, Long>
    val idxMap = new HashMap<Long, Integer>

    for (var int i = 0; i < data.size; i++) {
      val id = data.get(i).id
      idMap.put(i, id)
      idxMap.put(id, i)
    }
    var boolean added = false
    val newIds = new HashSet<Long>

    for (info : connections) {
      val id = info.id
      if (idxMap.containsKey(id)) {
        // update row in the table
        data.set(idxMap.get(id), info)
      } else {
        // add new row to the table
        data.add(info)
        added = true
      }
      // keep track of new ids so we can remove any that go away
      newIds.add(id)
    }
    // remove rows with ids that no longer exist
    for (var int i = data.size - 1; i >= 0; i--) {
      val id = data.get(i).id
      if (!newIds.contains(id)) {
        data.remove(i)
      }
    }
    table.setPageSize(connections.length)
    if (added) ColumnSortEvent::fire(table, table.columnSortList)
  }
}
