package org.labrad.browser.client.event;

import com.google.gwt.event.shared.EventHandler;
import com.google.gwt.event.shared.GwtEvent;

public class RemoteEventBusDisconnectEvent extends GwtEvent<RemoteEventBusDisconnectEvent.Handler> {

  public static interface Handler extends EventHandler {
    void onDisconnect(RemoteEventBusDisconnectEvent event);
  }
  public static Type<Handler> TYPE = new Type<Handler>();


  private final RemoteEventBus source;

  public RemoteEventBusDisconnectEvent(RemoteEventBus source) {
    this.source = source;
  }

  public RemoteEventBus getSource() {
    return source;
  }

  @Override
  public String toString() { return "disconnected"; }

  @Override
  public GwtEvent.Type<Handler> getAssociatedType() {
    return TYPE;
  }

  @Override
  protected void dispatch(Handler handler) {
    handler.onDisconnect(this);
  }
}
