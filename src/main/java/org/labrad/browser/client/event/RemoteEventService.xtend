package org.labrad.browser.client.event

import com.google.gwt.event.shared.GwtEvent
import com.google.gwt.user.client.rpc.AsyncCallback
import com.google.gwt.user.client.rpc.RemoteService
import com.google.gwt.user.client.rpc.RemoteServiceRelativePath

@RemoteServiceRelativePath(RemoteEventService.PATH)
interface RemoteEventService extends RemoteService {
  public static String PATH = "events"

  def void connect(String id)
  def void disconnect(String id)
  def GwtEvent<?>[] getEvents(String id)
}

interface RemoteEventServiceAsync {
  def void connect(String id, AsyncCallback<Void> callback)
  def void disconnect(String id, AsyncCallback<Void> callback)
  def void getEvents(String id, AsyncCallback<GwtEvent<?>[]> callback)
}
