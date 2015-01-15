package org.labrad.browser.client.event;

import com.google.gwt.event.shared.GwtEvent;
import com.google.gwt.user.client.rpc.RemoteService;
import com.google.gwt.user.client.rpc.RemoteServiceRelativePath;

@RemoteServiceRelativePath(RemoteEventService.PATH)
public interface RemoteEventService extends RemoteService {
  public static String PATH = "events";
  public void connect(String id);
  public void disconnect(String id);
  public GwtEvent<?>[] getEvents(String id);
}
