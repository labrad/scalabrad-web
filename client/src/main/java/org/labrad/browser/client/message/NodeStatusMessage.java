package org.labrad.browser.client.message;

import com.google.gwt.user.client.rpc.IsSerializable;

public class NodeStatusMessage implements Message, IsSerializable {

  public String name;
  public NodeServerStatus[] servers;

  protected NodeStatusMessage() {}

  public NodeStatusMessage(String name, NodeServerStatus[] servers) {
    this.name = name;
    this.servers = servers;
  }
}
