package org.labrad.browser.client.nodes;

import org.labrad.browser.client.event.NodeStatusEvent;

import com.google.gwt.user.client.rpc.AsyncCallback;

public interface NodeServiceAsync {
  public void getNodeInfo(AsyncCallback<NodeStatusEvent[]> callback);
  public void refreshServers(String node, AsyncCallback<String> callback);

  public void startServer(String node, String server, AsyncCallback<String> callback);
  public void stopServer(String node, String server, AsyncCallback<String> callback);
  public void restartServer(String node, String server, AsyncCallback<String> callback);
}
