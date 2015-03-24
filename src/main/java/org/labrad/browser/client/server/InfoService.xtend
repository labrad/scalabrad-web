package org.labrad.browser.client.server

import com.google.gwt.user.client.rpc.AsyncCallback
import com.google.gwt.user.client.rpc.RemoteService
import com.google.gwt.user.client.rpc.RemoteServiceRelativePath

@RemoteServiceRelativePath(InfoService.PATH)
interface InfoService extends RemoteService {
  public static String PATH = "info"

  def ServerInfo getServerInfo(String name)
}

interface InfoServiceAsync {
  def void getServerInfo(String name, AsyncCallback<ServerInfo> callback)
}
