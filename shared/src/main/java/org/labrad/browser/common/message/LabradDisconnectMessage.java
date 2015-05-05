package org.labrad.browser.common.message;

public class LabradDisconnectMessage implements Message {
  public String host;

  protected LabradDisconnectMessage() {}

  public LabradDisconnectMessage(String host) {
    this.host = host;
  }
}
