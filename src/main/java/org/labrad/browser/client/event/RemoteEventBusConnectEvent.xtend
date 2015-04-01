package org.labrad.browser.client.event

import com.google.gwt.event.shared.EventHandler
import com.google.gwt.event.shared.GwtEvent
import com.google.gwt.user.client.rpc.IsSerializable

class RemoteEventBusConnectEvent extends GwtEvent<RemoteEventBusConnectEvent.Handler> implements IsSerializable {
  val RemoteEventBus source

  new(RemoteEventBus source) {
    this.source = source
  }

  override String toString() {
    return "connected"
  }

  override RemoteEventBus getSource() {
    return source
  }

  static interface Handler extends EventHandler {
    def void onConnect(RemoteEventBusConnectEvent event)

  }

  public static val TYPE = new Type<Handler>

  override GwtEvent.Type<Handler> getAssociatedType() {
    return TYPE
  }

  override protected void ^dispatch(Handler handler) {
    handler.onConnect(this)
  }

}
