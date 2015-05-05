package org.labrad.browser.client.message;

public class ServerDisconnectMessage implements Message {

  public String server;

  protected ServerDisconnectMessage() {}

  public ServerDisconnectMessage(String server) {
    this.server = server;
  }
}
