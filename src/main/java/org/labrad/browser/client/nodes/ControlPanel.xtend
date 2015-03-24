package org.labrad.browser.client.nodes

import java.util.ArrayList
import java.util.HashMap
import java.util.List
import java.util.Map
import java.util.logging.Logger
import org.labrad.browser.client.BrowserImages
import org.labrad.browser.client.event.NodeServerEvent
import org.labrad.browser.client.event.NodeServerStatus
import org.labrad.browser.client.event.NodeStatusEvent
import org.labrad.browser.client.event.ServerDisconnectEvent
import com.google.gwt.event.shared.EventBus
import com.google.gwt.place.shared.PlaceController
import com.google.gwt.user.client.rpc.AsyncCallback
import com.google.gwt.user.client.ui.Grid
import com.google.gwt.user.client.ui.HasHorizontalAlignment
import com.google.gwt.user.client.ui.HasVerticalAlignment
import com.google.gwt.user.client.ui.HorizontalPanel
import com.google.gwt.user.client.ui.Image
import com.google.gwt.user.client.ui.Label
import com.google.gwt.user.client.ui.PushButton
import com.google.gwt.user.client.ui.VerticalPanel
import com.google.gwt.user.client.ui.Widget
import com.google.inject.Inject

class ControlPanel extends VerticalPanel implements NodeStatusEvent.Handler, ServerDisconnectEvent.Handler {
  static val log = Logger::getLogger(ControlPanel.name)

  Grid table = null
  val EventBus eventBus
  val PlaceController placeController
  val NodeServiceAsync nodeService
  val BrowserImages images
  val nodes = new ArrayList<String>
  val globalServers = new ArrayList<String>
  val localServers = new ArrayList<String>
  val controllers = new HashMap<String, Map<String, InstanceController>>

  /**
   * Create a new control panel
   */
  @Inject
  new(EventBus eventBus, PlaceController placeController, NodeServiceAsync nodeService, BrowserImages images) {
    this.eventBus = eventBus
    this.placeController = placeController
    this.nodeService = nodeService
    this.images = images
    eventBus.addHandler(NodeStatusEvent::TYPE, this)
    eventBus.addHandler(ServerDisconnectEvent::TYPE, this)
    updateStatus()
  }

  override void onNodeStatus(NodeStatusEvent event) {
    updateNodeStatus(event)
    makeTables()
  }

  override void onServerDisconnect(ServerDisconnectEvent e) {
    if (nodeExists(e.server)) {
      removeNode(e.server)
    }
  }

  /** 
   * Fetch the current status of all running nodes.
   */
  def void updateStatus() {
    nodeService.getNodeInfo(new AsyncCallback<NodeStatusEvent[]> {
      override void onFailure(Throwable caught) {
        log.severe('''getNodeInfo: «caught.message»''')
      }

      override void onSuccess(NodeStatusEvent[] result) {
        nodes.clear()
        globalServers.clear()
        localServers.clear()
        clearControllers()
        for (NodeStatusEvent info : result) {
          updateNodeStatus(info)
        }
        makeTables()
      }
    })
  }

  def private void clearControllers() {
    // remove all registered event handlers
    for (String node : controllers.keySet) {
      clearControllers(node)
    }
    // clear all controllers
    controllers.clear()
  }

  def private void clearControllers(String node) {
    // remove all registered event handlers
    if (controllers.containsKey(node)) {
      val ics = controllers.get(node)
      for (ic : ics.values) {
        ic.unregisterHandlers()
      }
      ics.clear()
    }

  }

  /** 
   * Update the status of servers available on a single node.
   * @param node
   * @param globalServers
   */
  def private void updateNodeStatus(NodeStatusEvent nodeInfo) {
    val node = nodeInfo.name
    // insert node name into node list in sorted order
    if (!nodeExists(node)) {
      insertSorted(node, nodes)
    }
    clearControllers(node)
    controllers.put(node, new HashMap<String, InstanceController>)
    for (serverInfo : nodeInfo.servers) {
      updateServerInfo(node, serverInfo)
    }

  }

  /** 
   * Remove a node from the list of nodes.
   * @param node
   */
  def private void removeNode(String node) {
    nodes.remove(node)
    clearControllers(node)
    controllers.remove(node)
    makeTables()
  }

  def private void insertSorted(String s, List<String> list) {
    var int i = 0
    while ((i < list.size) && (s.compareTo(list.get(i))) > 0) { i++ }
    list.add(i, s)
  }

  /** 
   * Update info about a particular server on a particular node.
   * @param node
   * @param server
   * @param info
   */
  def private void updateServerInfo(String node, NodeServerStatus info) {
    val server = info.name
    // insert server name into appropriate server list in sorted order
    if (!serverExists(server)) {
      if (info.environmentVars.length == 0) {
        insertSorted(server, globalServers)
      } else {
        insertSorted(server, localServers)
      }
    }
    // create a new instance controller
    val ic = new InstanceController(eventBus, placeController, this, node, server,
      info.instanceName, info.version, info.instances, info.environmentVars)
    controllers.get(node).put(server, ic)
  }

  def private void removeUnusedServers(List<String> list) {
    val removals = new ArrayList<String>
    for (server : list) {
      var int count = 0
      for (node : nodes) {
        if (controllers.get(node).containsKey(server)) {
          count += 1
        }
      }
      if (count == 0) removals.add(server)
    }
    for (server : removals) {
      list.remove(server)
    }
  }

  /** 
   * Build the control panel table.
   * @param globalServers
   * @param nodes
   * @param info
   */
  def private void makeTables() {
    // remove servers that are no longer available on any node
    removeUnusedServers(globalServers)
    removeUnusedServers(localServers) // create the new table widgets
    val table = new Grid(globalRows + localRows, serverCols)
    // give some indication when there are no nodes
    if (nodes.size == 0) {
      table.setText(0, 0, "No nodes are connected.")
    } else {
      table.setText(globalHeaderRow, 0, "Global Servers")
      table.setText(localHeaderRow, 0, "Local Servers")
      table.cellFormatter.addStyleName(globalHeaderRow, 0, "server-group")
      table.cellFormatter.addStyleName(localHeaderRow, 0, "server-group")
    } // create node controls in the column headers
    for (var int col = 0; col < nodes.size; col++) {
      table.setText(0, serverCol(col), nodes.get(col))
      table.setWidget(0, serverCol(col), makeNodeControl(nodes.get(col)))
      table.cellFormatter.setAlignment(0, serverCol(col), HasHorizontalAlignment::ALIGN_CENTER,
        HasVerticalAlignment::ALIGN_MIDDLE)
      table.cellFormatter.addStyleName(0, serverCol(col), "padded-cell")
    }
    // add server names for the row headers
    for (var int i = 0; i < globalServers.size; i++) {
      table.setText(globalRow(i), 0, globalServers.get(i))
      table.cellFormatter.addStyleName(globalRow(i), 0, "server-name")
    }

    for (var int i = 0; i < localServers.size; i++) {
      table.setText(localRow(i), 0, localServers.get(i))
      table.cellFormatter.addStyleName(localRow(i), 0, "server-name")
    }
    // add instance controllers for available servers
    for (var int i = 0; i < globalServers.size; i++) {
      val server = globalServers.get(i)
      val row = globalRow(i)
      var String version = null
      var boolean versionConflict = false

      for (var int col = 0; col < nodes.size; col++) {
        val node = nodes.get(col)
        if (controllers.get(node).containsKey(server)) {
          val ic = controllers.get(node).get(server)
          table.setWidget(row, serverCol(col), ic)
          table.cellFormatter.addStyleName(row, serverCol(col), "padded-cell")
          if (version == null) {
            version = ic.version
          } else if (ic.version != version) {
            versionConflict = true
          }
        }
      }

      if (i % 2 == 0) table.rowFormatter.addStyleName(row, "odd-row")
      if (versionConflict) {
        table.rowFormatter.addStyleName(row, "version-conflict")
        table.setText(row, 1, "version conflict")
      } else {
        table.setText(row, 1, version)
      }
      table.cellFormatter.addStyleName(row, 1, "server-name")
    }

    for (var int i = 0; i < localServers.size; i++) {
      val server = localServers.get(i)
      val row = localRow(i)
      var String version = null
      var boolean versionConflict = false

      for (var int col = 0; col < nodes.size; col++) {
        val node = nodes.get(col)
        if (controllers.get(node).containsKey(server)) {
          val ic = controllers.get(node).get(server)
          table.setWidget(row, serverCol(col), ic)
          table.cellFormatter.addStyleName(row, serverCol(col), "padded-cell")
          if (version == null) {
            version = ic.version
          } else if (ic.version != version) {
            versionConflict = true
          }

        }

      }
      if (i % 2 == 0) table.rowFormatter.addStyleName(row, "odd-row")
      if (versionConflict) {
        table.rowFormatter.addStyleName(row, "version-conflict")
        table.setText(row, 1, "version conflict")
      } else {
        table.setText(row, 1, version)
      }
      table.cellFormatter.addStyleName(row, 1, "server-name")
    }
    // for all singleton servers, tell all instance controllers that
    // singletons are running somewhere so they can disable themselves
    for (node : controllers.keySet) {
      for (server : controllers.get(node).keySet) {
        val ic = controllers.get(node).get(server)
        if (ic.isRunning && !ic.isLocal) {
          eventBus.fireEvent(
            new NodeServerEvent(node, server, null, InstanceStatus::STARTED))
        }
      }

    }
    // add tables, removing previous tables if necessary
    if (this.table != null) {
      remove(this.table)
    }
    this.table = table
    add(table)
  }

  /** 
   * Make a controller widget for a single node.
   * The controller widget allows the user to trigger a refresh of the
   * server list on this node.
   * @param nodeName
   * @return
   */
  def private Widget makeNodeControl(String nodeName) {
    val b = new PushButton(new Image(images.restartServerIcon))
    b.upDisabledFace.setImage(new Image(images.throbber))
    b.setTitle("Update the list of available servers")
    b.addClickHandler [
      b.setEnabled(false)
      nodeService.refreshServers(nodeName, new AsyncCallback<String> {
        override void onFailure(Throwable caught) {
          log.severe('''refreshServers: «caught»''')
          b.setEnabled(true)
        }

        override void onSuccess(String result) {
          b.setEnabled(true)
        }
      })
    ]
    val p = new HorizontalPanel
    p.add(new Label(nodeName.substring(5, nodeName.length)))
    p.add(b)
    p
  }

  /** 
   * Highlight the row corresponding to a particular server
   * @param server
   */
  def void highlight(String server) {
    val i = globalServers.indexOf(server)
    val j = localServers.indexOf(server)
    if (i >= 0) table.rowFormatter.addStyleName(globalRow(i), "highlight")
    if (j >= 0) table.rowFormatter.addStyleName(localRow(j), "highlight")
  }

  /** 
   * Unhighlight the row corresponding to a particular server
   * @param server
   */
  def void unhighlight(String server) {
    val i = globalServers.indexOf(server)
    val j = localServers.indexOf(server)
    if (i >= 0) table.rowFormatter.removeStyleName(globalRow(i), "highlight")
    if (j >= 0) table.rowFormatter.removeStyleName(localRow(j), "highlight")
  }

  def private int serverCol(int i) {
    return i + 2
  }

  def private int serverCols() {
    return nodes.size + 2
  }

  /** 
   * Return the table row for a global server
   * @param i
   * @return
   */
  def private int globalRow(int i) {
    return globalHeaderRow + i + 1
  }

  def private int globalHeaderRow() {
    return 0
  }

  def private int globalRows() {
    return globalServers.size + 2
  }

  /** 
   * Return the table row for a local server
   * @param i
   * @return
   */
  def private int localRow(int i) {
    return localHeaderRow + i + 1
  }

  def private int localHeaderRow() {
    return globalRows
  }

  def private int localRows() {
    return localServers.size + 1
  }

  /** 
   * Check whether the given node exists in the list
   * @param node
   * @return
   */
  def private boolean nodeExists(String node) {
    return nodes.contains(node)
  }

  /** 
   * Check whether the given server exists in the list
   * @param server
   * @return
   */
  def private boolean serverExists(String server) {
    return globalServers.contains(server) || localServers.contains(server)
  }
}
