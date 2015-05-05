package org.labrad.browser.common.message;

public class LabradConnectMessage implements Message {
  public String host;

  protected LabradConnectMessage() {}

  public LabradConnectMessage(String host) {
    this.host = host;
  }
}
