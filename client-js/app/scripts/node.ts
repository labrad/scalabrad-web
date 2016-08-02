import {Observable} from "./observable";
import * as rpc from "./rpc";

export interface ServerStatus {
  name: string;
  description: string;
  version: string;
  instanceName: string;
  environmentVars: string[];
  instances: string[];
  autostart: boolean;
}

export interface NodeStatus {
  name: string;
  servers: ServerStatus[];
  autostartList: string[];
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

  autostartNode(node: string): Promise<string>;
  autostartList(node: string): Promise<string[]>;
  autostartAdd(node: string): Promise<string>;
  autostartRemove(node: string): Promise<string>;

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

  autostartNode(node: string): Promise<string> {
    return this.call<string>('autostartNode', [node]);
  }

  autostartList(node: string): Promise<string[]> {
    return this.call<string[]>('autostartList', [node]);
  }

  autostartAdd(node: string): Promise<string> {
    return this.call<string>('autostartAdd', [node]);
  }

  autostartRemove(node: string): Promise<string> {
    return this.call<string>('autostartRemove', [node]);
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

