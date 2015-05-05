package org.labrad.browser.common.message;

public class ServerConnectMessage implements Message {
  public String server;

  protected ServerConnectMessage() {}

  public ServerConnectMessage(String server) {
    this.server = server;
  }
}
