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

  @property({type: Boolean})
  local: boolean;

  @property({type: Boolean})
  runningElsewhere: boolean;

  @property({type: String, notify: true})
  status: string;

  @property({type: Boolean, value: false})
  active: boolean;

  @property({type: Object, notify: true})
  server: ServerInfo;

  @property({type: Boolean, notify: false})
  autostart: boolean;

  @property()
  api: NodeApi;

  @property()
  places: Places;

  @computed()
  serverUrl(instanceName: string, places: Places): string {
    return places.serverUrl(instanceName);
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


  async doAutostart() {
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
      const message = `${this.instanceName} (${this.node}): An error occured while starting the server`;
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
    console.log(this.name, status, this.status);
    var options = {info: false, start: false, stop: false, restart: false};
    switch (status) {
      case 'STOPPED': this.active = false; options.start = true; break;
      case 'STARTING': this.active = true; break;
      case 'STARTED': this.active = false; options.info = true; options.stop = true; options.restart = true; break;
      case 'STOPPING': this.active = true; break;
      default: break;
    }
    var updateButton = (name: string): void => {
      var button = this.$[name];
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
}

/**
 * Information about a server running on one or more nodes
 */
interface ServerInfo {
  name: string;
  version: string;
  errorString: string;
  errorException: string;
  nodes: Array<{name: string, exists: boolean, autostart?: boolean, status?: string, instanceName?: string}>;
}

type ListItemFilterFunction = (item: (NodeStatus | ServerDisconnectMessage)) => boolean;


@component('labrad-nodes')
export class LabradNodes extends polymer.Base {
  @property({type: Array, notify: true, value: []})
  info: NodeStatus[];

  @property({type: Object})
  api: NodeApi;

  @property()
  places: Places;

  @property({type: Object})
  managerApi: ManagerApi;

  @property({type: Number, value: 0})
  kick: number;

  @property({type: Boolean, value: false, notify: true})
  isAutostartFiltered: boolean;

  @property({type: Object, value: []})
  globalServers: ServerInfo[];

  @property({type: Object, value: []})
  localServers: ServerInfo[];

  private lifetime = new Lifetime();


  detached() {
    this.lifetime.close();
  }


  defined(x: any): boolean {
    return (typeof x !== 'undefined') && (x !== null);
  }


  autostartFilter() {
    this.set('isAutostartFiltered', !this.isAutostartFiltered);
    this.kick++;
  }


  // Listeners called on api object properties when they get set. This is
  // necessary because these properties are set asynchronously sometime after
  // the component is constructed, so we cannot access the values when the
  // ready() lifecycle method is invoked, for example.
  @observe('api')
  apiChanged(newApi: NodeApi, oldApi: NodeApi) {
    if (this.defined(newApi)) {
      newApi.nodeStatus.add((msg) => this.onNodeStatus(msg), this.lifetime);
      newApi.serverStatus.add((msg) => this.onServerStatus(msg), this.lifetime);
    }
  }


  @observe('managerApi')
  managerChanged(newManager: ManagerApi, oldManager: ManagerApi) {
    if (this.defined(newManager)) {
      newManager.serverDisconnected.add((msg) => this.onServerDisconnected(msg), this.lifetime);
    }
  }


  // Callbacks invoked when we receive remote messages.
  async onNodeStatus(msg: NodeStatus) {
    msg.autostartList = await this.api.autostartList(msg.name);
    this.addItemToList(msg);
  }


  onServerDisconnected(msg: ServerDisconnectMessage): void {
    console.warn('Server disconnected:', msg.name);
    this.removeItemFromList(msg);
  }


  onServerStatus(msg: ServerStatusMessage): void {
    var instances = Polymer.dom(this.root).querySelectorAll('labrad-instance-controller');
    for (var i = 0; i < instances.length; i++) {
      var instance = <any>instances[i];
      if (instance.name === msg.server) {
        // Send the server status to all instance controllers, even if they are
        // on other nodes. This is because for global servers we must lock out
        // the controls if a server is running _anywhere_.
        instance.statusChange(msg);
      }
    }
  }


  private getNodeIndex(item: (NodeStatus | ServerDisconnectMessage), array: NodeStatus[]): number {
    let idx = -1;
    for (let i = 0; i < array.length; ++i) {
      if (array[i].name === item.name) {
        idx = i;
        break;
      }
    }
    return idx;
  }

  private getServerIndex(server: ServerStatus, servers: ServerInfo[]): number {
    for (let idx = 0; idx < servers.length; ++idx) {
      const s = servers[idx];
      if (s.name === server.name) {
        return idx;
      }
    }
    return -1;
  }


  addItemToList(item: NodeStatus): void {
    const idx = this.getNodeIndex(item, this.info);
    if (idx === -1) {
      this.push('info', item);
    } else {
      this.splice('info', idx, 1, item);
    }

    for (const server of item.servers) {
      const isGlobal = server.environmentVars.length === 0;
      const newServer = {
        name: server.name,
        version: '1',
        errorString: '',
        errorException: '',
        nodes: []
      };

      if (isGlobal) {
        let idx = this.getServerIndex(server, this.globalServers);
        if (idx === -1) {
          this.push('globalServers', newServer);
        }
      } else {
        let idx = this.getServerIndex(server, this.localServers);
        if (idx === -1) {
          this.push('localServers', newServer);
        }
      }
    }

    this.updateNodeServerBinding(this.globalServers, 'globalServers');
    this.updateNodeServerBinding(this.localServers, 'localServers');

    this.kick++;
  }


  private removeItemFromList(item: ServerDisconnectMessage): void {
    const idx = this.getNodeIndex(item, this.info);
    if (idx !== -1) {
      this.splice('info', idx, 1);
    }

    this.updateNodeServerBinding(this.globalServers, 'globalServers');
    this.updateNodeServerBinding(this.localServers, 'localServers');

    this.kick++;
  }


  private updateNodeServerBinding(servers: ServerInfo[], serversName: string): void {
    // Create a map of all nodes already in the server.
    const nodesSet = new Set();
    for (const node of this.info) {
      nodesSet.add(node.name);
    }

    for (let idx = 0; idx < servers.length; ++idx) {
      // Create a set of all nodes already in the server.
      const nodeSet = new Set();
      for (let nodeIdx = 0; nodeIdx < servers[idx].nodes.length; ++nodeIdx) {
        const node = servers[idx].nodes[nodeIdx];

        // If the server contains a node that isn't in the global nodes pool,
        // remove the node from the server's node list.
        if (nodesSet.has(node.name)) {
          nodeSet.add(node.name);
        } else {
          this.splice(`${serversName}.#${idx}.nodes`, nodeIdx, 1);
        }
      }

      for (const node of this.info) {
        // If this node is already listed, continue.
        if (nodeSet.has(node.name)) {
          continue;
        }

        // Create a map of all the servers on the node.
        const serverMap = new Map<String, ServerStatus>();
        for (const server of node.servers) {
          serverMap.set(server.name, server);
        }

        const server = servers[idx];
        if (!serverMap.has(server.name)) {
          // If the node doesn't have this server, we need to push a non-existing
          // node to the list so that it renders properly.
          this.push(`${serversName}.#${idx}.nodes`, {
            name: node.name,
            exists: false
          });
        } else {
          const serverStatus = serverMap.get(server.name);
          const autostartSet = new Set();
          for (const server of node.autostartList) {
            autostartSet.add(server);
          }
          this.push(`${serversName}.#${idx}.nodes`, {
            name: node.name,
            exists: true,
            autostart: autostartSet.has(server.name),
            status: serverStatus.instances.length > 0 ? 'STARTED' : 'STOPPED',
            instanceName: serverStatus.instances[0] || server.name
          });
        }
      }
    }
  }


  private filterServersFunction(autostartSet: Set<string>): ListItemFilterFunction {
    if (this.isAutostartFiltered) {
      return (x) => autostartSet.has(x.name);
    }
    return (x) => true;
  }


  private _nodeNames(info: Array<NodeStatus>): Array<string> {
    var names = info.map((n) => n.name);
    names.sort();
    return names;
  }


  private _versionMap(info: Array<NodeStatus>): Map<string, Array<string>> {
    var versionMap = new Map<string, Array<string>>();
    for (let nodeStatus of info) {
      for (let {name, version} of nodeStatus.servers) {
        if (!versionMap.has(name)) {
          versionMap.set(name, []);
        }
        versionMap.get(name).push(version);
      }
    }
    return versionMap;
  }


  @computed()
  nodeNames(info: Array<NodeStatus>, kick: number): Array<string> {
    return this._nodeNames(info)
  }
}
