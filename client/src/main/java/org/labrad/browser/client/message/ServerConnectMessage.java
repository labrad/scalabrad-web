package org.labrad.browser.client.message;

public class ServerConnectMessage implements Message {

  public String server;

  protected ServerConnectMessage() {}

  public ServerConnectMessage(String server) {
    this.server = server;
  }
}
