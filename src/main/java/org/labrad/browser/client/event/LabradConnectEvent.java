package org.labrad.browser.client.event;

import org.labrad.browser.client.message.LabradConnectMessage;

import com.google.gwt.event.shared.EventHandler;
import com.google.gwt.event.shared.GwtEvent;

public class LabradConnectEvent extends GwtEvent<LabradConnectEvent.Handler> {

  public static interface Handler extends EventHandler {
    void onLabradConnect(LabradConnectEvent event);
  }
  public static final Type<Handler> TYPE = new Type<Handler>();


  public LabradConnectMessage msg;

  protected LabradConnectEvent() {}

  public LabradConnectEvent(LabradConnectMessage msg) {
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
    handler.onLabradConnect(this);
  }
}
