package org.labrad.browser.client.event;

import org.labrad.browser.client.message.RegistryDirMessage;

import com.google.gwt.event.shared.EventHandler;
import com.google.gwt.event.shared.GwtEvent;

public class RegistryDirEvent extends GwtEvent<RegistryDirEvent.Handler> {

  public static interface Handler extends EventHandler {
    void onRegistryDirChanged(RegistryDirEvent event);
  }
  public static Type<Handler> TYPE = new Type<Handler>();


  public RegistryDirMessage msg;

  public RegistryDirEvent(RegistryDirMessage msg) {
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
    handler.onRegistryDirChanged(this);
  }
}
