package org.labrad.browser.client.message;

class PingMessage implements Message {
  private String msg = "PING";

  protected PingMessage() {}

  public PingMessage(String msg) {
    this.msg = msg;
  }

  public String getMessage() { return msg; }
  public void setMessage(String msg) { this.msg = msg; }
}
