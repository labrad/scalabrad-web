package org.labrad.browser.client.message;

import com.google.gwt.user.client.rpc.IsSerializable;

public class NodeStatusMessage implements Message, IsSerializable {

  private String name;
  private NodeServerStatus[] servers;

  protected NodeStatusMessage() {}

  public NodeStatusMessage(String name, NodeServerStatus[] servers) {
    this.name = name;
    this.servers = servers;
  }

  public String getName() {
    return name;
  }

  public NodeServerStatus[] getServers() {
    return servers;
  }
}
