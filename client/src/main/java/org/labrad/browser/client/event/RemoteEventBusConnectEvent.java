package org.labrad.browser.client.event;

import java.io.Serializable;

import com.google.gwt.event.shared.EventHandler;
import com.google.gwt.event.shared.GwtEvent;

@SuppressWarnings("serial")
public class RemoteEventBusConnectEvent extends GwtEvent<RemoteEventBusConnectEvent.Handler> implements Serializable {

  private final RemoteEventBus source;

  public RemoteEventBusConnectEvent(RemoteEventBus source) {
    this.source = source;
  }

  @Override
  public String toString() { return "connected"; }

  public RemoteEventBus getSource() {
    return source;
  }

  public static interface Handler extends EventHandler {
    void onConnect(RemoteEventBusConnectEvent event);
  }
  public static Type<Handler> TYPE = new Type<Handler>();

  @Override
  public GwtEvent.Type<Handler> getAssociatedType() {
    return TYPE;
  }

  @Override
  protected void dispatch(Handler handler) {
    handler.onConnect(this);
  }
}
