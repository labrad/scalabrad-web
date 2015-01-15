package org.labrad.browser.client.nodes;

@SuppressWarnings("serial")
public class NodeRequestError extends Exception {
  private String node;
  private String server;
  private String action;
  private String details;

  // default constructor for serialization
  protected NodeRequestError() {}

  public NodeRequestError(String node, String server, String action, String details) {
    this.node = node;
    this.server = server;
    this.action = action;
    this.details = details;
  }

  public String getNode() { return node; }
  public String getServer() { return server; }
  public String getAction() { return action; }
  public String getDetails() { return details; }
}
