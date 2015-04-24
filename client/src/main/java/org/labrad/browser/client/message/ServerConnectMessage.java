package org.labrad.browser.client.message;

public class ServerConnectMessage implements Message {

  private String server;

  protected ServerConnectMessage() {}

  public ServerConnectMessage(String server) {
    this.server = server;
  }

  public String getServer() { return server; }
}
