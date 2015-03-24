package org.labrad.browser.client.event

import com.google.gwt.event.shared.EventHandler
import com.google.gwt.event.shared.GwtEvent
import com.google.gwt.user.client.rpc.IsSerializable

class ServerDisconnectEvent extends GwtEvent<ServerDisconnectEvent.Handler> implements IsSerializable {
  String server

  protected new() {
  }

  new(String server) {
    this.server = server
  }

  def String getServer() {
    return server
  }

  override String toString() {
    return '''server="«server»"'''
  }

  static interface Handler extends EventHandler {
    def void onServerDisconnect(ServerDisconnectEvent event)

  }

  public static val TYPE = new Type<Handler>

  override GwtEvent.Type<Handler> getAssociatedType() {
    return TYPE
  }

  override protected void ^dispatch(Handler handler) {
    handler.onServerDisconnect(this)
  }

}
