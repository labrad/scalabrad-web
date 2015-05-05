package org.labrad.browser.common.message;

class PingMessage implements Message {
  public String msg = "PING";

  protected PingMessage() {}

  public PingMessage(String msg) {
    this.msg = msg;
  }
}
