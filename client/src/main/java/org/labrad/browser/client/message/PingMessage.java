package org.labrad.browser.client.message;

class PingMessage implements Message {
  public String msg = "PING";

  protected PingMessage() {}

  public PingMessage(String msg) {
    this.msg = msg;
  }
}
