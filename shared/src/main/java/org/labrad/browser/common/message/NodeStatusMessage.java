package org.labrad.browser.common.message;

public class NodeStatusMessage implements Message {
  public String name;
  public NodeServerStatus[] servers;

  protected NodeStatusMessage() {}

  public NodeStatusMessage(String name, NodeServerStatus[] servers) {
    this.name = name;
    this.servers = servers;
  }
}
