@component("labrad-page-manager")
export class ManagerPage extends polymer.Base {
  @property({type: Array})
  connections: Array<any>;
}

@component("labrad-page-server")
export class ServerPage extends polymer.Base {
  @property({type: Object})
  serverInfo: any;
}

@component("labrad-page-nodes")
export class NodesPage extends polymer.Base {
  @property({type: Array})
  nodesInfo: Array<any>;

  @property({type: Object})
  nodeApi: any;

  @property({type: Object})
  managerApi: any;
}

@component("labrad-page-registry")
export class RegistryPage extends polymer.Base {
  @property({type: Array})
  breadcrumbs: Array<any>;

  @property({type: Array})
  path: Array<string>;

  @property({type: Array})
  registryDirs: Array<any>;

  @property({type: Array})
  registryKeys: Array<any>;

  @property({type: Object})
  reg: any;
}

@component("labrad-page-grapher")
export class GrapherPage extends polymer.Base {
  @property({type: Array})
  breadcrumbs: Array<{name: string; isLink: boolean; url: string}>;

  @property({type: Array})
  path: Array<string>;

  @property({type: Array})
  datavaultDirs: Array<{name: string; url: string}>;

  @property({type: Array})
  datavaultDatasets: Array<{name: string; url: string}>;

  static init(
    path: Array<string>,
    breadcrumbs: Array<{name: string; isLink: boolean; url: string}>,
    dirs: Array<{name: string; url: string}>,
    datasets: Array<{name: string; url: string}>
  ): GrapherPage {
    var inst = <GrapherPage> GrapherPage.create();
    inst.path = path;
    inst.breadcrumbs = breadcrumbs;
    inst.datavaultDirs = dirs;
    inst.datavaultDatasets = datasets;
    return inst;
  }
}

@component("labrad-page-dataset")
export class DatasetPage extends polymer.Base {
  @property({type: Array})
  path: Array<string>;

  @property({type: String})
  dataset: string;

  @property({type: String})
  parentUrl: string;
}
