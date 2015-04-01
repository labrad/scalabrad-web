package org.labrad.browser.client.event

import com.google.gwt.event.shared.EventHandler
import com.google.gwt.event.shared.GwtEvent
import com.google.gwt.user.client.rpc.IsSerializable

class RemoteEventBusDisconnectEvent extends GwtEvent<RemoteEventBusDisconnectEvent.Handler> implements IsSerializable {
  val RemoteEventBus source

  new(RemoteEventBus source) {
    this.source = source
  }

  override String toString() {
    return "disconnected"
  }

  override RemoteEventBus getSource() {
    return source
  }

  static interface Handler extends EventHandler {
    def void onDisconnect(RemoteEventBusDisconnectEvent event)

  }

  public static val TYPE = new Type<Handler>

  override GwtEvent.Type<Handler> getAssociatedType() {
    TYPE
  }

  override protected void ^dispatch(Handler handler) {
    handler.onDisconnect(this)
  }

}
