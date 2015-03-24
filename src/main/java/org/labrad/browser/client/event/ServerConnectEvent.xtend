package org.labrad.browser.client.event

import com.google.gwt.event.shared.EventHandler
import com.google.gwt.event.shared.GwtEvent
import com.google.gwt.user.client.rpc.IsSerializable

class ServerConnectEvent extends GwtEvent<ServerConnectEvent.Handler> implements IsSerializable {
  String server

  protected new() {
  }

  new(String server) {
    this.server = server
  }

  def String getServer() {
    return server
  }

  @Override override String toString() {
    return '''server="«server»"'''
  }

  static interface Handler extends EventHandler {
    def void onServerConnect(ServerConnectEvent event)

  }

  public static val TYPE = new Type<Handler>

  override GwtEvent.Type<Handler> getAssociatedType() {
    TYPE
  }

  override protected void ^dispatch(Handler handler) {
    handler.onServerConnect(this)
  }

}
