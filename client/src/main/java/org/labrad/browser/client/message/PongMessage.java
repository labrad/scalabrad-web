package org.labrad.browser.client.message;

class PongMessage implements Message {
  private String msg = "PONG";

  protected PongMessage() {}

  public PongMessage(String msg) {
    this.msg = msg;
  }

  public String getMessage() { return msg; }
  public void setMessage(String msg) { this.msg = msg; }
}
