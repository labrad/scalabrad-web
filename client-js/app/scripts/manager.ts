import {Observable} from "./observable";
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
  url?: string;
}

export interface SettingInfo {
  id: number;
  name: string;
  doc: string;
  acceptedTypes: string[];
  returnedTypes: string[];
}

export interface ServerInfo {
  id: number;
  name: string;
  description: string;
  version: string;
  instanceName: string;
  environmentVars: string[];
  instances: string[];
  settings: SettingInfo[];
}

export interface OAuthInfo {
  clientId: string;
  clientSecret: string;
}

export interface LabradConnectMessage { host: string; }
export interface LabradDisconnectMessage { host: string; }
export interface ServerConnectMessage { name: string; }
export interface ServerDisconnectMessage { name: string; }

export interface ManagerApi {
  authMethods(params: {manager: string}): Promise<string[]>;
  login(params: {username: string; password: string; manager: string}): Promise<void>;
  oauthInfo(params: {manager: string}): Promise<OAuthInfo>;
  oauthLogin(params: {idToken: string; manager: string}): Promise<void>;
  ping(): Promise<void>;
  version(): Promise<string>;
  connections(): Promise<ConnectionInfo[]>;
  connectionClose(id: number): Promise<string>;
  serverInfo(name: String): Promise<ServerInfo>;

  connected: Observable<LabradConnectMessage>;
  disconnected: Observable<LabradDisconnectMessage>;
  serverConnected: Observable<ServerConnectMessage>;
  serverDisconnected: Observable<ServerDisconnectMessage>;
}

export class ManagerServiceJsonRpc extends rpc.RpcService implements ManagerApi {

  connected = new Observable<LabradConnectMessage>();
  disconnected = new Observable<LabradDisconnectMessage>();
  serverConnected = new Observable<ServerConnectMessage>();
  serverDisconnected = new Observable<ServerDisconnectMessage>();

  constructor(socket: rpc.JsonRpcSocket) {
    super(socket, "org.labrad.manager.");
    this.connect("org.labrad.connected", this.connected);
    this.connect("org.labrad.disconnected", this.disconnected);
    this.connect("org.labrad.serverConnected", this.serverConnected);
    this.connect("org.labrad.serverDisconnected", this.serverDisconnected);
  }

  authMethods(params: {manager: string}): Promise<string[]> {
    return this.call<string[]>("authMethods", params);
  }

  login(params: {username: string; password: string; manager: string}): Promise<void> {
    return this.call<void>("login", params);
  }

  oauthInfo(params: {manager: string}): Promise<OAuthInfo> {
    return this.call<OAuthInfo>("oauthInfo", params);
  }

  oauthLogin(params: {idToken: string; manager: string}): Promise<void> {
    return this.call<void>("oauthLogin", params);
  }

  ping(): Promise<void> {
    return this.call<void>("ping", []);
  }

  version(): Promise<string> {
    return this.call<string>("version", []);
  }

  connections(): Promise<ConnectionInfo[]> {
    return this.call<ConnectionInfo[]>("connections", []);
  }

  connectionClose(id: number): Promise<string> {
    return this.call<string>("connection_close", [id]);
  }

  serverInfo(name: String): Promise<ServerInfo> {
    return this.call<ServerInfo>("server_info", [name]);
  }
}

