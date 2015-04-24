package org.labrad.browser.client.connections;

import com.google.gwt.user.client.rpc.RemoteService;
import com.google.gwt.user.client.rpc.RemoteServiceRelativePath;

@RemoteServiceRelativePath(ManagerService.PATH)
public interface ManagerService extends RemoteService {
  public static String PATH = "manager";
  public ConnectionInfo[] getConnectionInfo();
  public void closeConnection(long id);
}
