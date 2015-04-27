package org.labrad.browser.client.message;

public class ServerDisconnectMessage implements Message {

  private String server;

  protected ServerDisconnectMessage() {}

  public ServerDisconnectMessage(String server) {
    this.server = server;
  }

  public String getServer() { return server; }
  public void setServer(String server) { this.server = server; }
}
