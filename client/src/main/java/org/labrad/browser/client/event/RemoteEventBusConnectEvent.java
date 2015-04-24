package org.labrad.browser.client.event;

import com.google.gwt.event.shared.EventHandler;
import com.google.gwt.event.shared.GwtEvent;

public class RemoteEventBusConnectEvent extends GwtEvent<RemoteEventBusConnectEvent.Handler> {

  public static interface Handler extends EventHandler {
    void onConnect(RemoteEventBusConnectEvent event);
  }
  public static Type<Handler> TYPE = new Type<Handler>();


  private final RemoteEventBus source;

  public RemoteEventBusConnectEvent(RemoteEventBus source) {
    this.source = source;
  }

  public RemoteEventBus getSource() {
    return source;
  }

  @Override
  public String toString() { return "connected"; }

  @Override
  public GwtEvent.Type<Handler> getAssociatedType() {
    return TYPE;
  }

  @Override
  protected void dispatch(Handler handler) {
    handler.onConnect(this);
  }
}
