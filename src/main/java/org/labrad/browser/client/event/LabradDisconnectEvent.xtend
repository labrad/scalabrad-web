package org.labrad.browser.client.event

import com.google.gwt.event.shared.EventHandler
import com.google.gwt.event.shared.GwtEvent
import com.google.gwt.user.client.rpc.IsSerializable

class LabradDisconnectEvent extends GwtEvent<LabradDisconnectEvent.Handler> implements IsSerializable {
  String host

  protected new() {
  }

  new(String host) {
    this.host = host
  }

  def String getHost() {
    return host
  }

  override String toString() {
    return '''host: "«host»"'''
  }

  static interface Handler extends EventHandler {
    def void onLabradDisconnect(LabradDisconnectEvent event)

  }

  public static val TYPE = new Type<Handler>

  override GwtEvent.Type<Handler> getAssociatedType() {
    return TYPE
  }

  override protected void ^dispatch(Handler handler) {
    handler.onLabradDisconnect(this)
  }

}
