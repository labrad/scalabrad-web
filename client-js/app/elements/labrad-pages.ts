/**
 * Classes representing the top-level pages in the application. A new instance
 * of one of these page classes will be created and installed into the dom
 * on route transitions when the URL changes.
 */

import {ConnectionInfo, ManagerApi, ServerInfo} from '../scripts/manager';
import {NodeApi, NodeStatus} from '../scripts/node';
import {RegistryApi} from '../scripts/registry';

@component("labrad-page-manager")
export class ManagerPage extends polymer.Base {
  @property({type: Array})
  connections: Array<ConnectionInfo>;

  static init(connections: Array<ConnectionInfo>): ManagerPage {
    var inst = <ManagerPage> ManagerPage.create();
    inst.connections = connections;
    return inst;
  }
}

@component("labrad-page-server")
export class ServerPage extends polymer.Base {
  @property({type: Object})
  serverInfo: any;

  static init(serverInfo: ServerInfo): ServerPage {
    var inst = <ServerPage> ServerPage.create();
    inst.serverInfo = serverInfo;
    return inst;
  }
}

@component("labrad-page-nodes")
export class NodesPage extends polymer.Base {
  @property({type: Array})
  nodesInfo: Array<NodeStatus>;

  @property({type: Object})
  nodeApi: any;

  @property({type: Object})
  managerApi: any;

  static init(
    nodesInfo: Array<NodeStatus>,
    nodeApi: NodeApi,
    managerApi: ManagerApi
  ): NodesPage {
    var inst = <NodesPage> NodesPage.create();
    inst.nodesInfo = nodesInfo;
    inst.nodeApi = nodeApi;
    inst.managerApi = managerApi;
    return inst;
  }
}

@component("labrad-page-registry")
export class RegistryPage extends polymer.Base {
  @property({type: Array})
  breadcrumbs: Array<any>;

  @property({type: Array})
  path: Array<string>;

  @property({type: Array})
  dirs: Array<any>;

  @property({type: Array})
  keys: Array<any>;

  @property({type: Object})
  reg: RegistryApi;

  static init(
    breadcrumbs: Array<any>,
    path: Array<string>,
    dirs: Array<any>,
    keys: Array<any>,
    reg: RegistryApi
  ): RegistryPage {
    var inst = <RegistryPage> RegistryPage.create();
    inst.breadcrumbs = breadcrumbs;
    inst.path = path;
    inst.dirs = dirs;
    inst.keys = keys;
    inst.reg = reg;
    return inst;
  }
}

@component("labrad-page-grapher")
export class GrapherPage extends polymer.Base {
  @property({type: Array})
  path: Array<string>;

  @property({type: Array})
  dirs: Array<{name: string; url: string}>;

  @property({type: Array})
  datasets: Array<{name: string; url: string}>;

  static init(
    path: Array<string>,
    dirs: Array<{name: string; url: string}>,
    datasets: Array<{name: string; url: string}>
  ): GrapherPage {
    var inst = <GrapherPage> GrapherPage.create();
    inst.path = path;
    inst.dirs = dirs;
    inst.datasets = datasets;
    return inst;
  }
}

@component("labrad-page-dataset")
export class DatasetPage extends polymer.Base {

  @property({type: Array})
  path: Array<string>;

  @property({type: String})
  datasetName: string;

  @property({type: String})
  parentUrl: string;

  static init(
    path: Array<string>,
    dataset: string,
    parentUrl: string
  ): DatasetPage {
    var inst = <DatasetPage> DatasetPage.create();
    inst.path = path;
    inst.datasetName = dataset;
    inst.parentUrl = parentUrl;
    return inst;
  }
}
