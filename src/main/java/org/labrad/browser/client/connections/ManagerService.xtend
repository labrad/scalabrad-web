package org.labrad.browser.client.connections

import com.google.gwt.user.client.rpc.AsyncCallback
import com.google.gwt.user.client.rpc.RemoteService
import com.google.gwt.user.client.rpc.RemoteServiceRelativePath

@RemoteServiceRelativePath(ManagerService.PATH)
interface ManagerService extends RemoteService {
  public static String PATH = "manager"

  def ConnectionInfo[] getConnectionInfo()
  def void closeConnection(long id)
}

interface ManagerServiceAsync {
  def void getConnectionInfo(AsyncCallback<ConnectionInfo[]> callback)
  def void closeConnection(long id, AsyncCallback<Void> callback)
}

