package org.labrad.browser.client.nodes;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.logging.Logger;

import org.fusesource.restygwt.client.Method;
import org.fusesource.restygwt.client.MethodCallback;
import org.labrad.browser.client.BrowserImages;
import org.labrad.browser.client.event.NodeServerEvent;
import org.labrad.browser.client.event.NodeStatusEvent;
import org.labrad.browser.client.event.ServerDisconnectEvent;
import org.labrad.browser.client.message.NodeServerMessage;
import org.labrad.browser.client.message.NodeServerStatus;
import org.labrad.browser.client.message.NodeStatusMessage;

import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.event.shared.EventBus;
import com.google.gwt.place.shared.PlaceController;
import com.google.gwt.user.client.ui.Grid;
import com.google.gwt.user.client.ui.HasHorizontalAlignment;
import com.google.gwt.user.client.ui.HasVerticalAlignment;
import com.google.gwt.user.client.ui.HorizontalPanel;
import com.google.gwt.user.client.ui.Image;
import com.google.gwt.user.client.ui.Label;
import com.google.gwt.user.client.ui.PushButton;
import com.google.gwt.user.client.ui.VerticalPanel;
import com.google.gwt.user.client.ui.Widget;
import com.google.inject.Inject;

public class ControlPanel extends VerticalPanel
                          implements NodeStatusEvent.Handler,
                                     ServerDisconnectEvent.Handler {
  private static Logger log = Logger.getLogger(ControlPanel.class.getName());

  private Grid table = null;
  private final EventBus eventBus;
  private final PlaceController placeController;
  private final NodeService nodeService;
  private final BrowserImages images;

  private final List<String> nodes = new ArrayList<String>();
  private final List<String> globalServers = new ArrayList<String>();
  private final List<String> localServers = new ArrayList<String>();
  private final Map<String, Map<String, InstanceController>> controllers = new HashMap<String, Map<String, InstanceController>>();

  /**
   * Create a new control panel
   */
  @Inject
  public ControlPanel(EventBus eventBus, PlaceController placeController, NodeService nodeService, BrowserImages images) {
    this.eventBus = eventBus;
    this.placeController = placeController;
    this.nodeService = nodeService;
    this.images = images;
    eventBus.addHandler(NodeStatusEvent.TYPE, this);
    eventBus.addHandler(ServerDisconnectEvent.TYPE, this);

    updateStatus();
  }

  public void onNodeStatus(NodeStatusEvent event) {
    updateNodeStatus(event.msg);
    makeTables();
  }

  public void onServerDisconnect(ServerDisconnectEvent e) {
    if (nodeExists(e.msg.server)) {
      removeNode(e.msg.server);
    }
  }

  /**
   * Fetch the current status of all running nodes.
   */
  public void updateStatus() {
    nodeService.getNodeInfo(new MethodCallback<List<NodeStatusMessage>>() {
      public void onFailure(Method method, Throwable caught) {
        log.severe("getNodeInfo: " + caught.getMessage());
      }

      public void onSuccess(Method method, List<NodeStatusMessage> result) {
        nodes.clear();
        globalServers.clear();
        localServers.clear();
        clearControllers();
        for (NodeStatusMessage info : result) {
          updateNodeStatus(info);
        }
        makeTables();
      }
    });
  }

  private void clearControllers() {
    // remove all registered event handlers
    for (String node : controllers.keySet()) {
      clearControllers(node);
    }
    // clear all controllers
    controllers.clear();
  }

  private void clearControllers(String node) {
    // remove all registered event handlers
    if (controllers.containsKey(node)) {
      Map<String, InstanceController> ics = controllers.get(node);
      for (InstanceController ic : ics.values()) {
        ic.unregisterHandlers();
      }
      ics.clear();
    }
  }

  /**
   * Update the status of servers available on a single node.
   * @param node
   * @param globalServers
   */
  private void updateNodeStatus(NodeStatusMessage nodeInfo) {
    String node = nodeInfo.name;
    // insert node name into node list in sorted order
    if (!nodeExists(node)) {
      insertSorted(node, nodes);
    }
    clearControllers(node);
    controllers.put(node, new HashMap<String, InstanceController>());
    for (NodeServerStatus serverInfo : nodeInfo.servers) {
      updateServerInfo(node, serverInfo);
    }
  }

  /**
   * Remove a node from the list of nodes.
   * @param node
   */
  private void removeNode(String node) {
    nodes.remove(node);
    clearControllers(node);
    controllers.remove(node);
    makeTables();
  }

  private void insertSorted(String s, List<String> list) {
    int i = 0;
    while ((i < list.size()) && (s.compareTo(list.get(i))) > 0) i++;
    list.add(i, s);
  }

  /**
   * Update info about a particular server on a particular node.
   * @param node
   * @param server
   * @param info
   */
  private void updateServerInfo(String node, NodeServerStatus info) {
    String server = info.name;
    // insert server name into appropriate server list in sorted order
    if (!serverExists(server)) {
      if (info.environmentVars.length == 0) {
        insertSorted(server, globalServers);
      } else {
        insertSorted(server, localServers);
      }
    }
    // create a new instance controller
    InstanceController ic = new InstanceController(
        eventBus, placeController, this,
        node, server, info.instanceName, info.version,
        info.instances, info.environmentVars);
    controllers.get(node).put(server, ic);
  }

  private void removeUnusedServers(List<String> list) {
    List<String> removals = new ArrayList<String>();
    for (String server : list) {
      int count = 0;
      for (String node : nodes) {
        if (controllers.get(node).containsKey(server)) {
          count += 1;
        }
      }
      if (count == 0) removals.add(server);
    }
    for (String server : removals) {
      list.remove(server);
    }
  }

  /**
   * Build the control panel table.
   * @param globalServers
   * @param nodes
   * @param info
   */
  private void makeTables() {
    // remove servers that are no longer available on any node
    removeUnusedServers(globalServers);
    removeUnusedServers(localServers);

    // create the new table widgets
    Grid table = new Grid(globalRows() + localRows(), serverCols());

    // give some indication when there are no nodes
    if (nodes.size() == 0) {
      table.setText(0, 0, "No nodes are connected.");
    } else {
      table.setText(globalHeaderRow(), 0, "Global Servers");
      table.setText(localHeaderRow(), 0, "Local Servers");
      table.getCellFormatter().addStyleName(globalHeaderRow(), 0, "server-group");
      table.getCellFormatter().addStyleName(localHeaderRow(), 0, "server-group");
    }

    // create node controls in the column headers
    for (int col = 0; col < nodes.size(); col++) {
      table.setText(0, serverCol(col), nodes.get(col));
      table.setWidget(0, serverCol(col), makeNodeControl(nodes.get(col)));
      table.getCellFormatter().setAlignment(0, serverCol(col),
          HasHorizontalAlignment.ALIGN_CENTER,
          HasVerticalAlignment.ALIGN_MIDDLE);
      table.getCellFormatter().addStyleName(0, serverCol(col), "padded-cell");
    }

    // add server names for the row headers
    for (int i = 0; i < globalServers.size(); i++) {
      table.setText(globalRow(i), 0, globalServers.get(i));
      table.getCellFormatter().addStyleName(globalRow(i), 0, "server-name");
    }
    for (int i = 0; i < localServers.size(); i++) {
      table.setText(localRow(i), 0, localServers.get(i));
      table.getCellFormatter().addStyleName(localRow(i), 0, "server-name");
    }


    // add instance controllers for available servers
    for (int i = 0; i < globalServers.size(); i++) {
      String server = globalServers.get(i);
      int row = globalRow(i);
      String version = null;
      boolean versionConflict = false;
      for (int col = 0; col < nodes.size(); col++) {
        String node = nodes.get(col);
        if (controllers.get(node).containsKey(server)) {
          InstanceController ic = controllers.get(node).get(server);
          table.setWidget(row, serverCol(col), ic);
          table.getCellFormatter().addStyleName(row, serverCol(col), "padded-cell");
          if (version == null) {
            version = ic.getVersion();
          } else if (!ic.getVersion().equals(version)) {
            versionConflict = true;
          }
        }
      }
      if (i % 2 == 0) table.getRowFormatter().addStyleName(row, "odd-row");
      if (versionConflict) {
        table.getRowFormatter().addStyleName(row, "version-conflict");
        table.setText(row, 1, "version conflict");
      } else {
        table.setText(row, 1, version);
      }
      table.getCellFormatter().addStyleName(row, 1, "server-name");
    }
    for (int i = 0; i < localServers.size(); i++) {
      String server = localServers.get(i);
      int row = localRow(i);
      String version = null;
      boolean versionConflict = false;
      for (int col = 0; col < nodes.size(); col++) {
        String node = nodes.get(col);
        if (controllers.get(node).containsKey(server)) {
          InstanceController ic = controllers.get(node).get(server);
          table.setWidget(row, serverCol(col), ic);
          table.getCellFormatter().addStyleName(row, serverCol(col), "padded-cell");
          if (version == null) {
            version = ic.getVersion();
          } else if (!ic.getVersion().equals(version)) {
            versionConflict = true;
          }
        }
      }
      if (i % 2 == 0) table.getRowFormatter().addStyleName(row, "odd-row");
      if (versionConflict) {
        table.getRowFormatter().addStyleName(row, "version-conflict");
        table.setText(row, 1, "version conflict");
      } else {
        table.setText(row, 1, version);
      }
      table.getCellFormatter().addStyleName(row, 1, "server-name");
    }

    // for all singleton servers, tell all instance controllers that
    // singletons are running somewhere so they can disable themselves
    for (String node : controllers.keySet()) {
      for (String server : controllers.get(node).keySet()) {
        InstanceController ic = controllers.get(node).get(server);
        if (ic.isRunning() && !ic.isLocal()) {
          NodeServerMessage m = new NodeServerMessage(node, server, null, InstanceStatus.STARTED);
          eventBus.fireEvent(new NodeServerEvent(m));
        }
      }
    }

    // add tables, removing previous tables if necessary
    if (this.table != null) {
      remove(this.table);
    }
    this.table = table;
    add(table);
  }

  /**
   * Make a controller widget for a single node.
   * The controller widget allows the user to trigger a refresh of the
   * server list on this node.
   * @param nodeName
   * @return
   */
  private Widget makeNodeControl(final String nodeName) {
    final PushButton b = new PushButton(new Image(images.restartServerIcon()));
    b.getUpDisabledFace().setImage(new Image(images.throbber()));
    b.setTitle("Update the list of available servers");
    b.addClickHandler(new ClickHandler() {
      public void onClick(ClickEvent event) {
        b.setEnabled(false);
        nodeService.refreshServers(nodeName, new MethodCallback<String>() {
          public void onFailure(Method method, Throwable caught) {
            log.severe("refreshServers: " + caught);
            b.setEnabled(true);
          }

          public void onSuccess(Method method, String result) {
            b.setEnabled(true);
          }

        });
      }
    });
    HorizontalPanel p = new HorizontalPanel();
    p.add(new Label(nodeName.substring(5, nodeName.length())));
    p.add(b);
    return p;
  }

  /**
   * Highlight the row corresponding to a particular server
   * @param server
   */
  public void highlight(String server) {
    int i = globalServers.indexOf(server);
    int j = localServers.indexOf(server);
    if (i >= 0) table.getRowFormatter().addStyleName(globalRow(i), "highlight");
    if (j >= 0) table.getRowFormatter().addStyleName(localRow(j), "highlight");
  }

  /**
   * Unhighlight the row corresponding to a particular server
   * @param server
   */
  public void unhighlight(String server) {
    int i = globalServers.indexOf(server);
    int j = localServers.indexOf(server);
    if (i >= 0) table.getRowFormatter().removeStyleName(globalRow(i), "highlight");
    if (j >= 0) table.getRowFormatter().removeStyleName(localRow(j), "highlight");
  }


  private int serverCol(int i) {
    return i + 2;
  }

  private int serverCols() {
    return nodes.size() + 2;
  }

  /**
   * Return the table row for a global server
   * @param i
   * @return
   */
  private int globalRow(int i) {
    return globalHeaderRow() + i + 1;
  }

  private int globalHeaderRow() {
    return 0;
  }

  private int globalRows() {
    return globalServers.size() + 2;
  }



  /**
   * Return the table row for a local server
   * @param i
   * @return
   */
  private int localRow(int i) {
    return localHeaderRow() + i + 1;
  }

  private int localHeaderRow() {
    return globalRows();
  }

  private int localRows() {
    return localServers.size() + 1;
  }

  /**
   * Check whether the given node exists in the list
   * @param node
   * @return
   */
  private boolean nodeExists(String node) {
    return nodes.contains(node);
  }

  /**
   * Check whether the given server exists in the list
   * @param server
   * @return
   */
  private boolean serverExists(String server) {
    return globalServers.contains(server) || localServers.contains(server);
  }
}
