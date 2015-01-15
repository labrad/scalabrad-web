package org.labrad.browser.client.nodes;

import org.labrad.browser.client.event.NodeStatusEvent;

import com.google.gwt.user.client.rpc.RemoteService;
import com.google.gwt.user.client.rpc.RemoteServiceRelativePath;

@RemoteServiceRelativePath(NodeService.PATH)
public interface NodeService extends RemoteService {
  public static String PATH = "node";
  public NodeStatusEvent[] getNodeInfo() throws NodeRequestError;
  public String refreshServers(String node) throws NodeRequestError;

  public String startServer(String node, String server) throws NodeRequestError;
  public String stopServer(String node, String server) throws NodeRequestError;
  public String restartServer(String node, String server) throws NodeRequestError;
}
