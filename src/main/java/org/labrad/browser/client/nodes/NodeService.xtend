package org.labrad.browser.client.nodes

import org.labrad.browser.client.event.NodeStatusEvent
import com.google.gwt.user.client.rpc.AsyncCallback
import com.google.gwt.user.client.rpc.RemoteService
import com.google.gwt.user.client.rpc.RemoteServiceRelativePath

@RemoteServiceRelativePath(NodeService.PATH)
interface NodeService extends RemoteService {
  public static String PATH = "node"

  def NodeStatusEvent[] getNodeInfo() throws NodeRequestError
  def String refreshServers(String node) throws NodeRequestError
  def String startServer(String node, String server) throws NodeRequestError
  def String stopServer(String node, String server) throws NodeRequestError
  def String restartServer(String node, String server) throws NodeRequestError
}

interface NodeServiceAsync {
  def void getNodeInfo(AsyncCallback<NodeStatusEvent[]> callback)
  def void refreshServers(String node, AsyncCallback<String> callback)
  def void startServer(String node, String server, AsyncCallback<String> callback)
  def void stopServer(String node, String server, AsyncCallback<String> callback)
  def void restartServer(String node, String server, AsyncCallback<String> callback)
}

@SuppressWarnings("serial")
class NodeRequestError extends Exception {
  String node
  String server
  String action
  String details

  // default constructor for serialization
  protected new() {}

  new(String node, String server, String action, String details) {
    this.node = node
    this.server = server
    this.action = action
    this.details = details
  }

  def String getNode() { node }
  def String getServer() { server }
  def String getAction() { action }
  def String getDetails() { details }
}
