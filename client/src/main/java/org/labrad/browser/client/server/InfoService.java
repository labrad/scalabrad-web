package org.labrad.browser.client.server;

import com.google.gwt.user.client.rpc.RemoteService;
import com.google.gwt.user.client.rpc.RemoteServiceRelativePath;

@RemoteServiceRelativePath(InfoService.PATH)
public interface InfoService extends RemoteService {
  public static String PATH = "info";
  public ServerInfo getServerInfo(String name);
}
