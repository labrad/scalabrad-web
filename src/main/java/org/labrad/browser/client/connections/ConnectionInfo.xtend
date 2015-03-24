package org.labrad.browser.client.connections

import com.google.gwt.user.client.rpc.IsSerializable

class ConnectionInfo implements IsSerializable {
  long ID
  String name
  boolean isServer
  boolean isActive
  long serverReqCount
  long serverRespCount
  long clientReqCount
  long clientRespCount
  long msgSendCount
  long msgRecvCount

  new(long ID, String name, boolean isServer, boolean isActive, long serverReqCount, long serverRespCount,
    long clientReqCount, long clientRespCount, long msgSendCount, long msgRecvCount) {
    this.ID = ID
    this.name = name
    this.isServer = isServer
    this.isActive = isActive
    this.serverReqCount = serverReqCount
    this.serverRespCount = serverRespCount
    this.clientReqCount = clientReqCount
    this.clientRespCount = clientRespCount
    this.msgSendCount = msgSendCount
    this.msgRecvCount = msgRecvCount
  }

  protected new() {
  }

  def long getId() {
    return ID
  }

  def String getName() {
    return name
  }

  def boolean isServer() {
    return isServer
  }

  def boolean isActive() {
    return isActive
  }

  def long getServerReqCount() {
    return serverReqCount
  }

  def long getServerRespCount() {
    return serverRespCount
  }

  def long getClientReqCount() {
    return clientReqCount
  }

  def long getClientRespCount() {
    return clientRespCount
  }

  def long getMsgSendCount() {
    return msgSendCount
  }

  def long getMsgRecvCount() {
    return msgRecvCount
  }

}
