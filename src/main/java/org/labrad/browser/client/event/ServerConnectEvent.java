package org.labrad.browser.client.event;

import java.io.Serializable;

import com.google.gwt.event.shared.EventHandler;
import com.google.gwt.event.shared.GwtEvent;


@SuppressWarnings("serial")
public class ServerConnectEvent extends GwtEvent<ServerConnectEvent.Handler> implements Serializable {
  private String server;

  protected ServerConnectEvent() {}

  public ServerConnectEvent(String server) {
    this.server = server;
  }

  public String getServer() { return server; }

  @Override
  public String toString() { return "server='" + server + "'"; }


  public static interface Handler extends EventHandler {
    void onServerConnect(ServerConnectEvent event);
  }

  public static Type<Handler> TYPE = new Type<Handler>();

  @Override
  public GwtEvent.Type<Handler> getAssociatedType() {
    return TYPE;
  }

  @Override
  protected void dispatch(Handler handler) {
    handler.onServerConnect(this);
  }
}
