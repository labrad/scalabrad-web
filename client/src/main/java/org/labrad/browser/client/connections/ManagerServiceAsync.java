package org.labrad.browser.client.connections;

import com.google.gwt.user.client.rpc.AsyncCallback;

public interface ManagerServiceAsync {
  void getConnectionInfo(AsyncCallback<ConnectionInfo[]> callback);
  void closeConnection(long id, AsyncCallback<Void> callback);
}
