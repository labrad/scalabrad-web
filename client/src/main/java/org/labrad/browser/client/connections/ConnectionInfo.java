package org.labrad.browser.client.connections;

import com.google.gwt.user.client.rpc.IsSerializable;

public class ConnectionInfo implements IsSerializable {
  private long ID;
  private String name;
  private boolean isServer;
  private boolean isActive;
  private long serverReqCount;
  private long serverRespCount;
  private long clientReqCount;
  private long clientRespCount;
  private long msgSendCount;
  private long msgRecvCount;

  public ConnectionInfo(long ID, String name, boolean isServer, boolean isActive,
                        long serverReqCount, long serverRespCount,
                        long clientReqCount, long clientRespCount,
                        long msgSendCount, long msgRecvCount) {
    this.ID = ID;
    this.name = name;
    this.isServer = isServer;
    this.isActive = isActive;
    this.serverReqCount = serverReqCount;
    this.serverRespCount = serverRespCount;
    this.clientReqCount = clientReqCount;
    this.clientRespCount = clientRespCount;
    this.msgSendCount = msgSendCount;
    this.msgRecvCount = msgRecvCount;
  }

  protected ConnectionInfo() {}

  public long getId() { return ID; }
  public String getName() { return name; }
  public boolean isServer() { return isServer; }
  public boolean isActive() { return isActive; }
  public long getServerReqCount() { return serverReqCount; }
  public long getServerRespCount() { return serverRespCount; }
  public long getClientReqCount() { return clientReqCount; }
  public long getClientRespCount() { return clientRespCount; }
  public long getMsgSendCount() { return msgSendCount; }
  public long getMsgRecvCount() { return msgRecvCount; }
}
