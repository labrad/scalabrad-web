package org.labrad.browser.client.event;

import java.io.Serializable;

import com.google.gwt.event.shared.EventHandler;
import com.google.gwt.event.shared.GwtEvent;


@SuppressWarnings("serial")
public class LabradDisconnectEvent extends GwtEvent<LabradDisconnectEvent.Handler> implements Serializable {
  private String host;

  protected LabradDisconnectEvent() {}

  public LabradDisconnectEvent(String host) {
    this.host = host;
  }

  public String getHost() { return host; }

  @Override
  public String toString() { return "host: '" + host + "'"; }


  public static interface Handler extends EventHandler {
    void onLabradDisconnect(LabradDisconnectEvent event);
  }

  public static Type<Handler> TYPE = new Type<Handler>();

  @Override
  public GwtEvent.Type<Handler> getAssociatedType() {
    return TYPE;
  }

  @Override
  protected void dispatch(Handler handler) {
    handler.onLabradDisconnect(this);
  }
}
