package org.labrad.browser.client.iplist;

import java.io.Serializable;

@SuppressWarnings("serial")
public class IpAddress implements Serializable {
  private String address;
  private boolean allowed;

  protected IpAddress() {}

  public IpAddress(String address, boolean allowed) {
    this.address = address;
    this.allowed = allowed;
  }

  public void setAddress(String address) { this.address = address; }
  public void setAllowed(boolean allowed) { this.allowed = allowed; }

  public String getAddress() { return address; }
  public boolean isAllowed() { return allowed; }
}
