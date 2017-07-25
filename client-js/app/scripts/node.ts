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
  outdated: boolean;
  runningVersion: string;
  latestVersion: string;
}

export interface NodeStatus {
  name: string;
  servers: ServerStatus[];
}

export interface OutdatedServerInfo {
  name: string;
  instanceName: string;
  runningVersion: string;
  latestVersion: string;
}

export interface ServerStatusMessage {
  node: string;
  server: string;
  instance: string;
  status: string;
}

export interface NodeApi {
  allNodes(): Promise<NodeStatus[]>;
  getNodeStatus(node: string): Promise<NodeStatus>;

  refreshNode(node: string): Promise<string>;

  autostartNode(node: string): Promise<string>;
  autostartList(node: string): Promise<string[]>;
  autostartAdd(params: {node: string; server: string}): Promise<void>;
  autostartRemove(params: {node: string; server: string}): Promise<void>;

  outdatedList(node: string): Promise<OutdatedServerInfo[]>;
  outdatedRestart(node: string): Promise<string>;

  restartServer(params: {node: string; server: string}): Promise<void>;
  startServer(params: {node: string; server: string}): Promise<void>;
  stopServer(params: {node: string; server: string}): Promise<void>;

  nodeStatus: Observable<NodeStatus>;
  serverStatus: Observable<ServerStatusMessage>;
}

export class NodeApiImpl extends rpc.RpcService implements NodeApi {

  nodeStatus: Observable<NodeStatus> = null;
  serverStatus: Observable<ServerStatusMessage> = null;

  constructor(socket: rpc.JsonRpcSocket) {
    super(socket, 'org.labrad.node.');

    const rawNodeStatus = new Observable<NodeStatus>();
    this.nodeStatus = rawNodeStatus.map((s) => this.updateNodeStatus(s));
    this.serverStatus = new Observable<ServerStatusMessage>();

    this.connect('org.labrad.node.nodeStatus', rawNodeStatus);
    this.connect('org.labrad.node.serverStatus', this.serverStatus);
  }

  // Fetch additional info needed along with the basic node status.
  //
  // Extra information like the autostart list and list of outdated servers is
  // needed by the node interface but not included in status messages from the
  // node server. This function grabs the extra data. We do this here in the
  // NodeApi so other code can use the NodeStatus type without having to
  // manually fetch additional data.
  private async updateNodeStatus(nodeStatus: NodeStatus): Promise<NodeStatus> {
    const autostartListPromise = this.autostartList(nodeStatus.name);
    const outdatedListPromise = this.outdatedList(nodeStatus.name);

    // set default values for extra info
    for (const server of nodeStatus.servers) {
      server.autostart = false;
      server.outdated = false;
      server.runningVersion = '';
      server.latestVersion = '';
    }

    // update autostart info
    try {
      const autostartSet = new Set<string>(await autostartListPromise);
      for (const server of nodeStatus.servers) {
        server.autostart = autostartSet.has(server.name);
      }
    } catch (error) {
      console.warn(`failed to list autostart servers for ${nodeStatus.name}`, error);
    }

    // update info about outdated server versions
    try {
      const outdatedList = await outdatedListPromise;
      for (const server of nodeStatus.servers) {
        for (const outdated of outdatedList) {
          if (outdated.name == server.name) {
            server.outdated = true;
            server.runningVersion = outdated.runningVersion;
            server.latestVersion = outdated.latestVersion;
          }
        }
      }
    } catch (error) {
      console.warn(`failed to list outdated servers for ${nodeStatus.name}`, error);
    }

    // return the updated node status
    return nodeStatus;
  }

  async allNodes(): Promise<NodeStatus[]> {
    const statuses = await this.call<NodeStatus[]>('allNodes', []);
    return Promise.all(statuses.map((s) => this.updateNodeStatus(s)));
  }

  async getNodeStatus(node: string): Promise<NodeStatus> {
    const status = await this.call<NodeStatus>('getNodeStatus', [node]);
    return this.updateNodeStatus(status);
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

  autostartAdd(params: {node: string; server: string}): Promise<void> {
    return this.call<void>('autostartAdd', params);
  }

  autostartRemove(params: {node: string; server: string}): Promise<void> {
    return this.call<void>('autostartRemove', params);
  }

  outdatedList(node: string): Promise<OutdatedServerInfo[]> {
    return this.call<OutdatedServerInfo[]>('outdatedList', [node]);
  }

  outdatedRestart(node: string): Promise<string> {
    return this.call<string>('outdatedRestart', [node]);
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

