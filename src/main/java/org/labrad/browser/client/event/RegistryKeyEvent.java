package org.labrad.browser.client.event;

import java.io.Serializable;

import com.google.gwt.event.shared.EventHandler;
import com.google.gwt.event.shared.GwtEvent;


@SuppressWarnings("serial")
public class RegistryKeyEvent extends GwtEvent<RegistryKeyEvent.Handler> implements Serializable {
  private String path;
  private String name;
  private boolean addOrChange;

  protected RegistryKeyEvent() {}

  public RegistryKeyEvent(String path, String name, boolean addOrChange) {
    this.path = path;
    this.name = name;
    this.addOrChange = addOrChange;
  }

  public String getPath() {
    return path;
  }

  public String getName() {
    return name;
  }

  public boolean isAddOrChange() {
    return addOrChange;
  }

  @Override
  public String toString() {
    return "path: " + path + ", key: '" + name + "' deleted";
  }


  public static interface Handler extends EventHandler {
    void onRegistryKeyChanged(RegistryKeyEvent event);
  }

  public static Type<Handler> TYPE = new Type<Handler>();

  @Override
  public GwtEvent.Type<Handler> getAssociatedType() {
    return TYPE;
  }

  @Override
  protected void dispatch(Handler handler) {
    handler.onRegistryKeyChanged(this);
  }
}
