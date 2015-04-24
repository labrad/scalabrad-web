package org.labrad.browser.client.message;

public class LabradConnectMessage implements Message {

  private String host;

  protected LabradConnectMessage() {}

  public LabradConnectMessage(String host) {
    this.host = host;
  }

  public String getHost() { return host; }
}
