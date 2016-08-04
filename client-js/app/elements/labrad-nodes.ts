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

  @property()
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

  ready() {
    this.updateButtonState(this.status);
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
      const message = `${this.instanceName} (${this.node}): An error occured while starting the server`;
      console.error(message, e);
      this.set('server.errorString', message);
      this.set('server.errorException', e.message);
    }
  }


  statusChange(msg: ServerStatusMessage): void {
    if (this.name === msg.server) {
      if (this.node === msg.node) {
        this.status = msg.status;
        this.instanceName = msg.instance;
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
  nodes: Array<{name: string, exists: boolean, status?: string, instanceName?: string}>;
}

@component('labrad-nodes')
export class LabradNodes extends polymer.Base {
  @property({type: Array, notify: true})
  info: Array<NodeStatus>;

  @property({type: Object})
  api: NodeApi;

  @property()
  places: Places;

  @property({type: Object})
  managerApi: ManagerApi;

  @property({type: Number, value: 0})
  kick: number;

  private lifetime = new Lifetime();
  // Used to manage cleanup operations that should be performed when this
  // component is destroyed. We register all such cleanup operations (such as
  // Observable callback removals) with this lifetime, and then close it when
  // the component is detached.

  /**
   * Polymer lifecyle callback invoked when this component is detached from the
   * DOM and ready to be cleaned up.
   */
  detached() {
    this.lifetime.close();
  }

  defined(x: any): boolean {
    return (typeof x !== 'undefined') && (x !== null);
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

  // callbacks invoked when we receive remote messages

  async onNodeStatus(msg: NodeStatus) {
    // we need to splice this new NodeStatus into the current info array.
    // first, check to see whether we already have status for this node.
    var idx = this._nodeIndex(msg.name);

    msg.autostartList = await this.api.autostartList(msg.name);

    if (idx === -1) {
      this.push('info', msg);
    } else {
      this.splice('info', idx, 1, msg);
    }
  }

  onServerDisconnected(msg: ServerDisconnectMessage): void {
    console.warn('Server disconnected:', msg.name);
    var idx = this._nodeIndex(msg.name);

    if (idx >= 0) {
      this.splice('info', idx, 1);
      this.kick++;
    }
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


  /**
   * Find the index in the node info list of a node with the given name.
   *
   * If no such node is found, returns -1.
   */
  private _nodeIndex(name: string): number {
    var idx = -1;
    for (var i = 0; i < this.info.length; i++) {
      if (this.info[i].name === name) {
        idx = i;
        break;
      }
    }
    return idx;
  }

  private _nodeNames(info: Array<NodeStatus>): Array<string> {
    var names = info.map((n) => n.name);
    names.sort();
    return names;
  }

  private _serverNames(info: Array<NodeStatus>, options: {global: boolean}): Array<string> {
    var nameSet = new Set<string>();
    for (let nodeInfo of info) {
      for (let server of nodeInfo.servers) {
        var isGlobal = server.environmentVars.length === 0;
        if (isGlobal === options.global) {
          nameSet.add(server.name);
        }
      }
    }
    var names = Array.from(nameSet.values());
    names.sort();
    return names;
  }

  private _statusMap(info: Array<NodeStatus>): Map<string, Map<string, ServerStatus>> {
    var statusMap = new Map<string, Map<string, ServerStatus>>();
    for (let nodeStatus of info) {
      var serverMap = new Map<string, ServerStatus>();
      for (let serverStatus of nodeStatus.servers) {
        serverMap.set(serverStatus.name, serverStatus);
      }
      statusMap.set(nodeStatus.name, serverMap);
    }
    return statusMap;
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

  private _autostartMap(info: Array<NodeStatus>): Map<string, Set<string>> {
    var infoMap = new Map<string, Set<string>>();
    for (const item of info) {
      const set = new Set();
      for (const server of item.autostartList) {
        set.add(server);
      }
      infoMap.set(item.name, set);
    }
    return infoMap;
  }

  @computed()
  nodeNames(info: Array<NodeStatus>, kick: number): Array<string> {
    return this._nodeNames(info)
  }

  @computed()
  globalServers(info: Array<NodeStatus>, kick: number): Array<ServerInfo> {
    var nodeNames = this._nodeNames(info);
    var serverNames = this._serverNames(info, {global: true});
    var statusMap = this._statusMap(info);
    var versionMap = this._versionMap(info);
    var autostartMap = this._autostartMap(info);

    return serverNames.map((server) => {
      var versions = versionMap.get(server);
      var versionSet = new Set(versions);
      var version = versionSet.size === 1 ? versions[0] : 'version conflict!';

      return {
        name: server,
        version: version,
        errorString: '',
        errorException: '',
        nodes: nodeNames.map((node) => {
          var status = statusMap.get(node).get(server);
          if (typeof status === 'undefined') {
            return {name: node, exists: false};
          } else {
            return {
              name: node,
              exists: true,
              autostart: autostartMap.get(node).has(server),
              status: status.instances.length > 0 ? 'STARTED' : 'STOPPED',
              instanceName: status.instances[0] || server
            }
          }
        })
      };
    });
  }

  @computed()
  localServers(info: Array<NodeStatus>, kick: number): Array<ServerInfo> {
    var nodeNames = this._nodeNames(info);
    var serverNames = this._serverNames(info, {global: false});
    var statusMap = this._statusMap(info);
    var versionMap = this._versionMap(info);

    return serverNames.map((server) => {
      var versions = versionMap.get(server);
      var versionSet = new Set(versions);
      var version = versionSet.size === 1 ? versions[0] : 'version conflict!';

      return {
        name: server,
        version: version,
        errorString: '',
        errorException: '',
        nodes: nodeNames.map((node) => {
          var status = statusMap.get(node).get(server);
          if (typeof status === 'undefined') {
            return {name: node, exists: false};
          } else {
            return {
              name: node,
              exists: true,
              status: status.instances.length > 0 ? 'STARTED' : 'STOPPED',
              instanceName: status.instances[0] || server
            }
          }
        })
      };
    });
  }
}
