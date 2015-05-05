package org.labrad.browser.client.event;

import org.labrad.browser.common.message.ServerDisconnectMessage;

import com.google.gwt.event.shared.EventHandler;
import com.google.gwt.event.shared.GwtEvent;

public class ServerDisconnectEvent extends GwtEvent<ServerDisconnectEvent.Handler> {

  public static interface Handler extends EventHandler {
    void onServerDisconnect(ServerDisconnectEvent event);
  }
  public static Type<Handler> TYPE = new Type<Handler>();


  public ServerDisconnectMessage msg;

  public ServerDisconnectEvent(ServerDisconnectMessage msg) {
    this.msg = msg;
  }

  @Override
  public String toString() { return msg.toString(); }

  @Override
  public GwtEvent.Type<Handler> getAssociatedType() {
    return TYPE;
  }

  @Override
  protected void dispatch(Handler handler) {
    handler.onServerDisconnect(this);
  }
}
