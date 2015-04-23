package org.labrad.browser.client.message;

public class LabradDisconnectMessage implements Message {

  private String host;

  protected LabradDisconnectMessage() {}

  public LabradDisconnectMessage(String host) {
    this.host = host;
  }

  public String getHost() { return host; }
}
