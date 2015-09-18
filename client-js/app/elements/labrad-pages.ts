import ng from 'angular2/angular2';

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
  breadcrumbs: Array<any>;

  @property({type: Array})
  path: Array<string>;

  @property({type: Array})
  datavaultDirs: Array<any>;

  @property({type: Array})
  datavaultDatasets: Array<any>;

  constructor(path: Array<string>, breadcrumbs: Array<any>, dirs: Array<any>, datasets: Array<any>) {
    super();
    //this.path = path;
    //this.breadcrumbs = breadcrumbs;
    //this.datavaultDirs = dirs;
    //this.datavaultDatasets = datasets;
  }
}


console.log('Component', ng.Component);

@ng.Component({
  selector: 'labrad-page-dataset-ng'
})
@ng.View({
  templateUrl: '/elements/labrad-page-grapher-ng.html'
})
export class GrapherPageNg {
  breadcrumbs: Array<any>;
  path: Array<string>;
  dirs: Array<any>;
  datasets: Array<any>;

  constructor(path: Array<string>, breadcrumbs: Array<any>, dirs: Array<any>, datasets: Array<any>) {
    this.path = path;
    this.breadcrumbs = breadcrumbs;
    this.dirs = dirs;
    this.datasets = datasets;
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
