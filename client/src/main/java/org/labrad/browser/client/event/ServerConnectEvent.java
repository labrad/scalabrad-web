package org.labrad.browser.client.event;

import org.labrad.browser.client.message.ServerConnectMessage;

import com.google.gwt.event.shared.EventHandler;
import com.google.gwt.event.shared.GwtEvent;


public class ServerConnectEvent extends GwtEvent<ServerConnectEvent.Handler> {

  public static interface Handler extends EventHandler {
    void onServerConnect(ServerConnectEvent event);
  }
  public static Type<Handler> TYPE = new Type<Handler>();


  public ServerConnectMessage msg;

  public ServerConnectEvent(ServerConnectMessage msg) {
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
    handler.onServerConnect(this);
  }
}
