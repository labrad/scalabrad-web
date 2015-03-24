package org.labrad.browser.client.iplist

import com.google.gwt.user.client.rpc.IsSerializable

class IpAddress implements IsSerializable {
  String address
  boolean allowed

  protected new() {
  }

  new(String address, boolean allowed) {
    this.address = address
    this.allowed = allowed
  }

  def void setAddress(String address) {
    this.address = address
  }

  def void setAllowed(boolean allowed) {
    this.allowed = allowed
  }

  def String getAddress() {
    return address
  }

  def boolean isAllowed() {
    return allowed
  }

}
