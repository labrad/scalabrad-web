package org.labrad.browser.client.event;

import com.google.gwt.event.shared.GwtEvent;
import com.google.gwt.user.client.rpc.AsyncCallback;

public interface RemoteEventServiceAsync {
  public void connect(String id, AsyncCallback<Void> callback);
  public void disconnect(String id, AsyncCallback<Void> callback);
  public void getEvents(String id, AsyncCallback<GwtEvent<?>[]> callback);
}
