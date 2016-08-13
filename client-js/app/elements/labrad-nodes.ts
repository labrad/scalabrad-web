import 'polymer-ts';
import {Lifetime} from '../scripts/lifetime';
import {ManagerApi, ServerConnectMessage, ServerDisconnectMessage} from '../scripts/manager';
import {NodeApi, NodeStatus, ServerStatus, ServerStatusMessage} from '../scripts/node';
import {Places} from '../scripts/places';


@component('labrad-exception-handler')
export class LabradExceptionHandler extends polymer.Base {
  @property({type: String, value: '', notify: true})
  error: string;

  @property({type: String, value: '', notify: true})
  exception: string;

  toggleException() {
    const collapse: any = this.querySelector('#exceptionCollapse');
    collapse.toggle();
  }

  dismissException() {
    this.set('error', '');
    this.set('exception', '');
  }
}

@component('labrad-instance-controller')
export class LabradInstanceController extends polymer.Base {
  @property()
  name: string;

  @property()
  instanceName: string;

  @property()
  node: string;

  @property({type: String})
  version: string;

  @property({type: Boolean})
  local: boolean;

  @property({type: Boolean})
  runningElsewhere: boolean;

  @property({type: String, notify: true, value: 'STOPPED'})
  status: string;

  @property({type: Boolean, notify: true, value: true})
  active: boolean;

  @property({type: Object, notify: true})
  server: ServerInfo;

  @property({type: Boolean, notify: true})
  autostart: boolean;

  @property()
  api: NodeApi;

  @property()
  places: Places;

  @computed()
  serverUrl(instanceName: string, places: Places): string {
    return places.serverUrl(instanceName);
  }

  attached() {
    this.async(() => {
      this.fire('labrad-instance-controller::ready', {
        node: this.node,
        server: this.name,
        instance: this.instanceName,
        status: this.status
      });
    });
  }

  @observe('status')
  statusChanged(newStatus: string, oldStatus: string) {
    this.updateButtonState(newStatus);
  }


  @listen('start.click')
  async doStart() {
    console.info(`Start: server='${this.name}', node='${this.node}'`);
    try {
      await this.api.startServer({node: this.node, server: this.name});
      this.set('server.errorString', '');
      this.set('server.errorException', '');
    } catch (e) {
      const message = `${this.instanceName} (${this.node}): An error occured while starting the server`;
      console.error(message, e);
      this.set('server.errorString', message);
      this.set('server.errorException', e.message);
    }
  }


  @listen('stop.click')
  async doStop() {
    console.info(`Stop: server='${this.name}', node='${this.node}'`);
    try {
      await this.api.stopServer({node: this.node, server: this.instanceName});
      this.set('server.errorString', '');
      this.set('server.errorException', '');
    } catch (e) {
      const message = `${this.instanceName} (${this.node}): An error occured while stopping the server`;
      console.error(message, e);
      this.set('server.errorString', message);
      this.set('server.errorException', e.message);
    }
  }


  @listen('restart.click')
  async doRestart() {
    console.info(`Restart: server='${this.name}', node='${this.node}'`);
    try {
      await this.api.restartServer({node: this.node, server: this.instanceName});
      this.set('server.errorString', '');
      this.set('server.errorException', '');
    } catch (e) {
      const message = `${this.instanceName} (${this.node}): An error occured while restarting the server`;
      console.error(message, e);
      this.set('server.errorString', message);
      this.set('server.errorException', e.message);
    }
  }


  async toggleAutostart() {
    console.info(`Autostart: server='${this.name}', node='${this.node}'`);
    try {
      if (this.autostart) {
        await this.api.autostartRemove({node: this.node, server: this.name});
        this.set('autostart', false);
      } else {
        await this.api.autostartAdd({node: this.node, server: this.name});
        this.set('autostart', true);
      }
      this.set('server.errorString', '');
      this.set('server.errorException', '');
    } catch (e) {
      const message = `${this.instanceName} (${this.node}): An error occured while toggling autostart setting`;
      console.error(message, e);
      this.set('server.errorString', message);
      this.set('server.errorException', e.message);
    }
  }


  statusChange(msg: ServerStatusMessage): void {
    if (this.name === msg.server) {
      if (this.node === msg.node) {
        this.set('status', msg.status);
        this.set('instanceName', msg.instance);
      } else if (this.local) {
        switch (msg.status) {
          case 'STOPPED': this.updateButtonState(this.status); break;
          case 'STARTING': this.updateButtonState('RUNNING_ELSEWHERE'); break;
          case 'STARTED': this.updateButtonState('RUNNING_ELSEWHERE'); break;
          case 'STOPPING': this.updateButtonState('RUNNING_ELSEWHERE'); break;
        }
      }
    }
  }

  /**
   * Manage the enabled/disabled state of control buttons depending on the
   * state of this particular server instance.
   */
  updateButtonState(status: string) {
    const options = {
      info: false,
      start: false,
      stop: false,
      restart: false
    };

    switch (status) {
      case 'STOPPED':
        this.active = false;
        options.start = true;
        break;
      case 'STARTING':
        this.active = true;
        break;
      case 'STARTED':
        this.active = false;
        options.info = true;
        options.stop = true;
        options.restart = true;
        break;
      case 'STOPPING':
        this.active = true;
        break;
      default: break;
    }

    const updateButton = (name: string): void => {
      const button = this.$[name];
      if (options[name]) {
        button.removeAttribute('disabled');
      } else {
        button.setAttribute('disabled', 'disabled');
      }
    }

    updateButton('info');
    updateButton('start');
    updateButton('stop');
    updateButton('restart');
  }
}

@component('labrad-node-controller')
export class LabradNodeController extends polymer.Base {
  @property({type: Object})
  api: NodeApi;

  @property()
  places: Places;

  @property()
  name: string;

  @property({type: Boolean, value: false})
  active: boolean;

  @listen('refresh.click')
  async onRefresh() {
    this.active = true;
    try {
      await this.api.refreshNode(this.name);
    } catch (e) {
      console.error(`Exception while refreshing node: ${this.name}`, e);
    } finally {
      this.active = false;
    }
  }

  @listen('autostart.click')
  async onAutostart() {
    this.active = true;
    try {
      await this.api.autostartNode(this.name);
    } catch (e) {
      console.error(`Exception while autostarting node: ${this.name}`, e);
    } finally {
      this.active = false;
    }
  }

  @listen('outdated.click')
  async onRestartOutdated() {
    this.active = true;
    try {
      await this.api.outdatedRestart(this.name);
    } catch (e) {
      console.error(`Exception while restarting outdated servers: ${this.name}`, e);
    } finally {
      this.active = false;
    }
  }
}

/**
 * Information about a server running on one or more nodes
 */
interface ServerInfo {
  name: string;
  errorString: string;
  errorException: string;
  nodes: NodeServerStatus[];
};

type NodeServerStatus = {
  name: string,
  exists: boolean,
  version?: string,
  runningVersion?: string,
  outdated?: boolean,
  autostart?: boolean,
  status?: string,
  instanceName?: string
};

type ServerFilterFunction = (item: ServerInfo) => boolean;


@component('labrad-nodes')
export class LabradNodes extends polymer.Base {
  @property({type: Array, notify: true, value: () => []})
  nodes: NodeStatus[];

  @property({type: Object})
  api: NodeApi;

  @property()
  places: Places;

  @property({type: Object})
  managerApi: ManagerApi;

  @property({type: Boolean, value: false, notify: true})
  isAutostartFiltered: boolean;

  @property({type: Array, value: () => []})
  globalServers: ServerInfo[];

  @property({type: Array, value: () => []})
  localServers: ServerInfo[];

  @property({type: Array, value: () => []})
  globalServersFiltered: ServerInfo[];

  @property({type: Array, value: () => []})
  localServersFiltered: ServerInfo[];

  @property({type: Array, value: () => []})
  nodeNames: String;

  private lifetime = new Lifetime();

  @listen('labrad-instance-controller::ready')
  onLabradInstanceControllerReady(event) {
    // If a new labrad-instance-controller has readied, we need to broadcast
    // the state of each controller of that server type to all others of the
    // same type. This informs existing servers of the new server state, and
    // informs the new server of the existing servers' states.
    this.broadcastStatusChange(event.detail);
  }


  detached() {
    this.lifetime.close();
  }


  defined(x: any): boolean {
    return (typeof x !== 'undefined') && (x !== null);
  }


  toggleAutostartFilter() {
    this.set('isAutostartFiltered', !this.isAutostartFiltered);
    this.updateFilters();
  }


  updateFilters() {
    const filterFunction = this.filterServersFunction();
    this.set('globalServersFiltered',
             this.globalServers.filter(filterFunction));
    this.set('localServersFiltered',
             this.localServers.filter(filterFunction));
  }


  private filterServersFunction(): ServerFilterFunction {
    if (this.isAutostartFiltered) {
      // Check if the server is configured to autostart on any node.
      return (s) => s.nodes.some((node) => node.exists && node.autostart);
    }
    return (s) => true;
  }


  // Listeners called on api object properties when they get set. This is
  // necessary because these properties are set asynchronously sometime after
  // the component is constructed, so we cannot access the values when the
  // ready() lifecycle method is invoked, for example.
  @observe('api')
  apiChanged(newApi: NodeApi, oldApi: NodeApi) {
    if (this.defined(newApi)) {
      newApi.nodeStatus.add(
        (msg) => this.onNodeStatus(msg), this.lifetime);
      newApi.serverStatus.add(
        (msg) => this.onServerStatus(msg), this.lifetime);
    }
  }


  @observe('managerApi')
  managerChanged(newManager: ManagerApi, oldManager: ManagerApi) {
    if (this.defined(newManager)) {
      newManager.serverDisconnected.add(
        (msg) => this.onServerDisconnected(msg), this.lifetime);
    }
  }


  // Callbacks invoked when we receive remote messages.

  // Called when the status of a node changes.
  async onNodeStatus(node: NodeStatus): Promise<void> {
    this.updateNode(node);
  }


  // Called when a server disconnects from labrad
  onServerDisconnected(msg: ServerDisconnectMessage): void {
    console.warn('Server disconnected:', msg.name);

    // If the disconnected server is a node, broadcast to all controllers that
    // the servers on the node are now offline.
    for (const node of this.nodes) {
      if (node.name == msg.name) {
        for (const server of node.servers) {
          this.broadcastStatusChange({
            node: node.name,
            server: server.name,
            instance: '',
            status: 'STOPPED'
          });
        }
        break;
      }
    }

    this.removeNode(msg);
  }


  // Called when a server instance changes state on a particular node.
  //
  // We broadcast the status change to other instances and also update the node
  // status in case this change needs to be reflected in the UI.
  async onServerStatus(msg: ServerStatusMessage): Promise<void> {
    this.broadcastStatusChange(msg);
    try {
      const node = await this.api.getNodeStatus(msg.node);
      this.updateNode(node);
    } catch (error) {
      console.warn(`Failed to update status for ${msg.node}`, error);
    }
  }


  // Broadcast status change to other instance controllers of the same server.
  async broadcastStatusChange(msg: ServerStatusMessage): Promise<void> {
    const instances = Polymer.dom(this.root)
                             .querySelectorAll('labrad-instance-controller');
    for (const inst of instances) {
      const instance = inst as LabradInstanceController;
      if (instance.name === msg.server) {
        // Send the server status to all instance controllers, even if they are
        // on other nodes. This is because for global servers we must lock out
        // the controls if a server is running _anywhere_.
        instance.statusChange(msg);
      }
    }
  }


  /**
   * The index of a given node within an array.
   *
   * Returns -1 if item is not found.
   **/
  private getNodeIndex(nodeName: string, nodes: NodeStatus[]): number {
    for (let i = 0; i < nodes.length; ++i) {
      if (nodes[i].name === nodeName) {
        return i;
      }
    }
    return -1;
  }


  /**
   * The index of a given server within an array.
   *
   * Returns -1 if item is not found.
   **/
  private getServerIndex(serverName: string, servers: ServerInfo[]): number {
    for (let i = 0; i < servers.length; ++i) {
      if (servers[i].name === serverName) {
        return i;
      }
    }
    return -1;
  }


  compareNodeNames(a: string, b: string): number {
    return a.localeCompare(b);
  }


  compareNodes(a: NodeServerStatus, b: NodeServerStatus): number {
    return this.compareNodeNames(a.name, b.name);
  }


  updateNode(node: NodeStatus) {
    const idx = this.getNodeIndex(node.name, this.nodes);
    if (idx === -1) {
      this.push('nodes', node);
      this.push('nodeNames', node.name);
    } else {
      this.splice('nodes', idx, 1, node);
    }

    const filterFunction = this.filterServersFunction();

    for (const server of node.servers) {
      const isGlobal = server.environmentVars.length === 0;
      const newServer = {
        name: server.name,
        errorString: '',
        errorException: '',
        nodes: []
      };

      if (isGlobal) {
        const idx = this.getServerIndex(server.name, this.globalServers);
        if (idx === -1) {
          this.push('globalServers', newServer);
          if (filterFunction(newServer)) {
            this.push('globalServersFiltered', newServer);
          }
        }
      } else {
        const idx = this.getServerIndex(server.name, this.localServers);
        if (idx === -1) {
          this.push('localServers', newServer);
          if (filterFunction(newServer)) {
            this.push('localServersFiltered', newServer);
          }
        }
      }
    }

    this.updateServerLists();

    // If a node comes online that has a server marked as autostart that wasn't
    // previously, and we are currently filtering, then we need to update the
    // filters to show the new server(s).
    if (this.isAutostartFiltered) {
      this.updateFilters();
    }
  }


  private removeNode(msg: ServerDisconnectMessage): void {
    const idx = this.getNodeIndex(msg.name, this.nodes);
    if (idx === -1) return;

    this.splice('nodes', idx, 1);
    this.splice('nodeNames', idx, 1);

    this.updateServerLists();

    // If a node goes offline that has a server marked as autostart that no
    // other does, and we are currently filtering, then we need to update the
    // filters to hide the invalid server(s).
    if (this.isAutostartFiltered) {
      this.updateFilters();
    }
  }


  private updateServerLists(): void {
    const serverLists = [
      'globalServersFiltered',
      'globalServers',
      'localServersFiltered',
      'localServers'
    ];
    for (const listName of serverLists) {
      const servers = this[listName];
      for (let idx = 0; idx < servers.length; ++idx) {
        this.removeOfflineNodes(listName, idx);
        this.addOnlineNodes(listName, idx);
        this.updateServerVersion(listName, idx);
      }
    }
  }


  private removeOfflineNodes(listName: string, serverIdx: number): void {
    const onlineNodes = new Set<string>(this.nodeNames);

    // Backwards as we are splicing from the list as we iterate.
    const nodes = this[listName][serverIdx].nodes;
    for (let nodeIdx = nodes.length - 1; nodeIdx >= 0; --nodeIdx) {
      const node = nodes[nodeIdx];
      if (!onlineNodes.has(node.name)) {
        // The Polymer way to mutate the array that exists at
        // `this[serversName][serverIdx].nodes`.
        // The # is used to access a particular index in an array.
        this.splice(`${listName}.#${serverIdx}.nodes`, nodeIdx, 1);
      }
    }
  }


  private addOnlineNodes(listName: string, serverIdx: number): void {
    const server = this[listName][serverIdx];
    const nodes = server.nodes;
    const serverNodes = new Set<string>(nodes.map((node) => node.name));

    for (const node of this.nodes) {
      const serverStatusMap = this.serverStatusMap(node.servers);

      const nodeHasServer = serverStatusMap.has(server.name);
      const serverHasNode = serverNodes.has(node.name);

      // If the server doesn't have the node, we need to insert the node.
      if (!serverHasNode) {
        // If the server is on the node, then we insert it properly, else we
        // insert a noop node into the server so it is still displayed properly.
        if (nodeHasServer) {
          const serverStatus = serverStatusMap.get(server.name);

          this.push(`${listName}.#${serverIdx}.nodes`, {
            name: node.name,
            exists: true,
            version: serverStatus.version,
            autostart: serverStatus.autostart,
            status: serverStatus.instances.length > 0 ? 'STARTED' : 'STOPPED',
            instanceName: serverStatus.instances[0] || server.name
          });
        } else {
          this.push(`${listName}.#${serverIdx}.nodes`, {
            name: node.name,
            exists: false
          });
        }
      }
    }
  }


  private updateServerVersion(listName: string, serverIdx: number): void {
    const server = this[listName][serverIdx];
    for (let nodeIdx = 0; nodeIdx < server.nodes.length; nodeIdx++) {
      const node = server.nodes[nodeIdx];
      if (node.exists) {
        const status = this.getServerStatus(node.name, server.name);
        const version = status.outdated
                      ? `running=${status.runningVersion}, latest=${status.latestVersion}`
                      : status.version;
        if (node.version !== version) {
          this.set(`${listName}.#${serverIdx}.nodes.#${nodeIdx}.version`,
                   version);
        }
      }
    }
  }


  private getServerStatus(nodeName: string, serverName: string): ServerStatus {
    for (const node of this.nodes) {
      if (node.name === nodeName) {
        for (const server of node.servers) {
          if (server.name === serverName) {
            return server;
          }
        }
      }
    }
    return null;
  }


  // Convert a list of server statuses into a map keyed on server name.
  private serverStatusMap(servers: ServerStatus[]): Map<string, ServerStatus> {
    function toKeyValue(server: ServerStatus): [string, ServerStatus] {
      return [server.name, server];
    }
    return new Map(servers.map(toKeyValue));
  }
}
