import * as rpc from "./rpc";

export interface ConnectionInfo {
  id: number;
  name: string;
  server: boolean;
  active: boolean;
  serverReqCount: number;
  serverRespCount: number;
  clientReqCount: number;
  clientRespCount: number;
  msgSendCount: number;
  msgRecvCount: number;
}

export interface SettingInfo {
  id: number;
  name: string;
  doc: string;
  acceptedTypes: Array<string>;
  returnedTypes: Array<string>;
}

export interface ServerInfo {
  id: number;
  name: string;
  description: string;
  version: string;
  instanceName: string;
  environmentVars: Array<string>;
  instances: Array<string>;
  settings: Array<SettingInfo>;
}

export interface ManagerApi {
  connections(): Promise<Array<ConnectionInfo>>;
  connectionClose(id: number): Promise<string>;
  serverInfo(name: String): Promise<ServerInfo>;
}

export class ManagerServiceJsonRpc extends rpc.RpcService implements ManagerApi {

  constructor(socket: rpc.JsonRpcSocket) {
    super(socket, "org.labrad.manager.");
  }

  connections(): Promise<Array<ConnectionInfo>> {
    return this.call<Array<ConnectionInfo>>("connections", []);
  }

  connectionClose(id: number): Promise<string> {
    return this.call<string>("connection_close", [id]);
  }

  serverInfo(name: String): Promise<ServerInfo> {
    return this.call<ServerInfo>("server_info", [name]);
  }
}

