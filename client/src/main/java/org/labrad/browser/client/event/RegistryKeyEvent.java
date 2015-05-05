package org.labrad.browser.client.event;

import org.labrad.browser.common.message.RegistryKeyMessage;

import com.google.gwt.event.shared.EventHandler;
import com.google.gwt.event.shared.GwtEvent;


public class RegistryKeyEvent extends GwtEvent<RegistryKeyEvent.Handler> {

  public static interface Handler extends EventHandler {
    void onRegistryKeyChanged(RegistryKeyEvent event);
  }
  public static final Type<Handler> TYPE = new Type<Handler>();


  public RegistryKeyMessage msg;

  public RegistryKeyEvent(RegistryKeyMessage msg) {
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
    handler.onRegistryKeyChanged(this);
  }
}
