package org.labrad.browser.client.connections;

import com.google.gwt.user.client.rpc.IsSerializable;

public class ConnectionInfo implements IsSerializable {
  public long id;
  public String name;
  public boolean server;
  public boolean active;
  public long serverReqCount;
  public long serverRespCount;
  public long clientReqCount;
  public long clientRespCount;
  public long msgSendCount;
  public long msgRecvCount;

  public ConnectionInfo(long ID, String name, boolean server, boolean active,
                        long serverReqCount, long serverRespCount,
                        long clientReqCount, long clientRespCount,
                        long msgSendCount, long msgRecvCount) {
    this.id = ID;
    this.name = name;
    this.server = server;
    this.active = active;
    this.serverReqCount = serverReqCount;
    this.serverRespCount = serverRespCount;
    this.clientReqCount = clientReqCount;
    this.clientRespCount = clientRespCount;
    this.msgSendCount = msgSendCount;
    this.msgRecvCount = msgRecvCount;
  }

  protected ConnectionInfo() {}
}
