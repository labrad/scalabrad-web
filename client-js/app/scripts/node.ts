import {Observable} from "./observable";
import * as rpc from "./rpc";

export interface ServerStatus {
  name: string;
  description: string;
  version: string;
  instanceName: string;
  environmentVars: Array<string>;
  instances: Array<string>;
}

export interface NodeStatus {
  name: string;
  servers: Array<ServerStatus>;
}

export interface ServerStatusMessage {
  node: string;
  server: string;
  instance: string;
  status: string;
}

export interface NodeApi {
  allNodes(): Promise<Array<NodeStatus>>;

  refreshNode(node: string): Promise<string>;

  restartServer(params: {node: string; server: string}): Promise<void>;
  startServer(params: {node: string; server: string}): Promise<void>;
  stopServer(params: {node: string; server: string}): Promise<void>;

  nodeStatus: Observable<NodeStatus>;
  serverStatus: Observable<ServerStatusMessage>;
}

export class NodeService extends rpc.RpcService implements NodeApi {

  nodeStatus = new Observable<NodeStatus>();
  serverStatus = new Observable<ServerStatusMessage>();

  constructor(socket: rpc.JsonRpcSocket) {
    super(socket, 'org.labrad.node.');
    this.connect('org.labrad.node.nodeStatus', this.nodeStatus);
    this.connect('org.labrad.node.serverStatus', this.serverStatus);
  }

  allNodes(): Promise<Array<NodeStatus>> {
    return this.call<Array<NodeStatus>>('allNodes', []);
  }

  refreshNode(node: string): Promise<string> {
    return this.call<string>('refreshNode', [node]);
  }

  restartServer(params: {node: string; server: string}): Promise<void> {
    return this.call<void>('restartServer', params);
  }

  startServer(params: {node: string; server: string}): Promise<void> {
    return this.call<void>('startServer', params);
  }

  stopServer(params: {node: string; server: string}): Promise<void> {
    return this.call<void>('stopServer', params);
  }
}

