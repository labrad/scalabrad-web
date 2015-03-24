package org.labrad.browser.client.event

import org.labrad.browser.client.nodes.InstanceStatus
import com.google.gwt.event.shared.EventHandler
import com.google.gwt.event.shared.GwtEvent
import com.google.gwt.user.client.rpc.IsSerializable

class NodeServerEvent extends GwtEvent<NodeServerEvent.Handler> implements IsSerializable {
  String node
  String server
  String instance
  InstanceStatus status

  protected new() {
  }

  new(String node, String server, String instance, InstanceStatus status) {
    this.node = node
    this.server = server
    this.instance = instance
    this.status = status
  }

  def String getNode() {
    return node
  }

  def String getServer() {
    return server
  }

  def String getInstance() {
    return instance
  }

  def InstanceStatus getStatus() {
    return status
  }

  override String toString() {
    return '''«status», node="«node»", server="«server»", instance="«instance»"'''
  }

  static interface Handler extends EventHandler {
    def void onNodeServerEvent(NodeServerEvent event)

  }

  public static val TYPE = new Type<Handler>

  override GwtEvent.Type<Handler> getAssociatedType() {
    return TYPE
  }

  override protected void ^dispatch(Handler handler) {
    handler.onNodeServerEvent(this)
  }
}
