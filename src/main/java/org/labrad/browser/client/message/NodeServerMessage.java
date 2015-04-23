package org.labrad.browser.client.message;

import org.labrad.browser.client.nodes.InstanceStatus;

public class NodeServerMessage implements Message {

  private String node;
  private String server;
  private String instance;
  private InstanceStatus status;

  protected NodeServerMessage() {}

  public NodeServerMessage(String node, String server, String instance, InstanceStatus status) {
    this.node = node;
    this.server = server;
    this.instance = instance;
    this.status = status;
  }

  public String getNode() { return node; }
  public String getServer() { return server; }
  public String getInstance() { return instance; }
  public InstanceStatus getStatus() { return status; }
}
