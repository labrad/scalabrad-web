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
  public void setNode(String node) { this.node = node; }

  public String getServer() { return server; }
  public void setServer(String server) { this.server = server; }

  public String getInstance() { return instance; }
  public void setInstance(String instance) { this.instance = instance; }

  public InstanceStatus getStatus() { return status; }
  public void setStatus(InstanceStatus status) { this.status = status; }
}
