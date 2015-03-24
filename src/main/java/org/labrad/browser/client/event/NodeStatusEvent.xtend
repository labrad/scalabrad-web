package org.labrad.browser.client.event

import com.google.gwt.event.shared.EventHandler
import com.google.gwt.event.shared.GwtEvent
import com.google.gwt.user.client.rpc.IsSerializable

class NodeStatusEvent extends GwtEvent<NodeStatusEvent.Handler> implements IsSerializable {
  String name
  NodeServerStatus[] servers

  protected new() {
  }

  new(String name, NodeServerStatus[] servers) {
    this.name = name
    this.servers = servers
  }

  def void setName(String name) {
    this.name = name
  }

  def void setServers(NodeServerStatus[] servers) {
    this.servers = servers
  }

  def String getName() {
    return name
  }

  def NodeServerStatus[] getServers() {
    return servers
  }

  override String toString() {
    return '''node: "«name»"'''
  }

  static interface Handler extends EventHandler {
    def void onNodeStatus(NodeStatusEvent event)

  }

  public static val TYPE = new Type<Handler>

  override GwtEvent.Type<Handler> getAssociatedType() {
    return TYPE
  }

  override protected void ^dispatch(Handler handler) {
    handler.onNodeStatus(this)
  }

}
