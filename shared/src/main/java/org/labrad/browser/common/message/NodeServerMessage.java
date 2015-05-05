package org.labrad.browser.common.message;

public class NodeServerMessage implements Message {
  public String node;
  public String server;
  public String instance;
  public InstanceStatus status;

  protected NodeServerMessage() {}

  public NodeServerMessage(String node, String server, String instance, InstanceStatus status) {
    this.node = node;
    this.server = server;
    this.instance = instance;
    this.status = status;
  }
}
