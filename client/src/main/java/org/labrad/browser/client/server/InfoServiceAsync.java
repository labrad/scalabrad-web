package org.labrad.browser.client.server;

import com.google.gwt.user.client.rpc.AsyncCallback;

public interface InfoServiceAsync {
  void getServerInfo(String name, AsyncCallback<ServerInfo> callback);
}
