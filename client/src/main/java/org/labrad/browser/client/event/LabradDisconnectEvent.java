package org.labrad.browser.client.event;

import org.labrad.browser.client.message.LabradDisconnectMessage;

import com.google.gwt.event.shared.EventHandler;
import com.google.gwt.event.shared.GwtEvent;

public class LabradDisconnectEvent extends GwtEvent<LabradDisconnectEvent.Handler> {

  public static interface Handler extends EventHandler {
    void onLabradDisconnect(LabradDisconnectEvent event);
  }
  public static Type<Handler> TYPE = new Type<Handler>();


  public LabradDisconnectMessage msg;

  public LabradDisconnectEvent(LabradDisconnectMessage msg) {
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
    handler.onLabradDisconnect(this);
  }
}
