import {Activity, ActivityState} from "./activity";
import {AsyncQueue} from "./async-queue";
import {Lifetime} from "./lifetime";
import * as manager from "./manager";
import * as places from "./places";
import * as registry from "./registry";
import * as datavault from "./datavault";
import * as node from "./node";

import {LabradGrapher} from "../elements/labrad-grapher";
import {LabradGrapherLive, LabeledPlot} from "../elements/labrad-grapher-live";
import {LabradManager} from "../elements/labrad-manager";
import {LabradNodes} from "../elements/labrad-nodes";
import {LabradRegistry} from "../elements/labrad-registry";
import {LabradServer} from "../elements/labrad-server";
import {Plot} from "../elements/labrad-plot";

export class RegistryActivity implements Activity {
  private elem: LabradRegistry;
  private lifetime = new Lifetime();

  constructor(private api: registry.RegistryApi, public path: Array<string>) {}

  async start(): Promise<ActivityState> {
    this.api.newItem.add(() => this.onNewItem(), this.lifetime);
    console.log('loading registry:', this.path);
    await this.api.watch({path: this.path});
    var listing = await this.api.dir({path: this.path});
    var breadcrumbs = [];
    for (var i = 0; i <= this.path.length; i++) {
      breadcrumbs.push({
        name: (i == 0) ? 'registry' : this.path[i-1],
        isLink: i < this.path.length,
        url: places.registryUrl(this.path.slice(0, i))
      });
    }

    var elem = <LabradRegistry> LabradRegistry.create();

    elem.path = this.path;
    elem.dirs = [];
    elem.keys = [];
    elem.socket = this.api;
    elem.repopulateList();

    this.elem = elem;

    return {
      elem: elem,
      route: 'registry',
      breadcrumbs: breadcrumbs
    };
  }

  onNewItem() {
    this.elem.repopulateList();
  }

  async stop(): Promise<void> {
    await this.api.unwatch({path: this.path});
  }
}

export class DatavaultActivity implements Activity {
  private elem: LabradGrapher;
  private lifetime = new Lifetime();

  constructor(private api: datavault.DataVaultService,
              public path: Array<string>) {}

  async start(): Promise<ActivityState> {
    console.log('loading datavault:', this.path);
    this.api.newDir.add(x => this.onNewDir(), this.lifetime);
    this.api.newDataset.add(x => this.onNewDataset(), this.lifetime);
    var listing = await this.api.dir(this.path);
    var breadcrumbs = [];
    for (var i = 0; i <= this.path.length; i++) {
      breadcrumbs.push({
        name: (i == 0) ? 'grapher' : this.path[i-1],
        isLink: i < this.path.length,
        url: places.grapherUrl(this.path.slice(0, i))
      });
    }
    var breadcrumbExtras = [
      { name: 'dir view',
        isLink: false,
        url: ''
      },
      { name: 'live view',
        isLink: true,
        url: places.grapherUrl(this.path) + '?live'
      }
    ];

    this.elem = <LabradGrapher> LabradGrapher.create();
    this.elem.path = this.path;
    this.elem.dirs = this.getDirs(listing);
    this.elem.datasets = this.getDatasets(listing);

    return {
      elem: this.elem,
      route: 'grapher',
      breadcrumbs: breadcrumbs,
      breadcrumbExtras: breadcrumbExtras
    };
  }

  async onNewDir() {
    var listing = await this.api.dir(this.path);
    this.elem.dirs = this.getDirs(listing);
  }

  async onNewDataset() {
    var listing = await this.api.dir(this.path);
    this.elem.datasets = this.getDatasets(listing);
  }

  async stop(): Promise<void> {
    this.lifetime.close();
  }

  private getDirs(listing: datavault.DataVaultListing) {
    return listing.dirs.map(name => {
      return {name: name, url: places.grapherUrl(this.path, name)};
    });
  }

  private getDatasets(listing: datavault.DataVaultListing) {
    return listing.datasets.map(name => {
      return {name: name, url: places.datasetUrl(this.path, name.slice(0, 5))};
    });
  }
}

export class DatavaultLiveActivity implements Activity {
  private elem: LabradGrapherLive;
  private plots: Array<Plot> = [];
  private lifetime = new Lifetime();
  private activities: Array<DatasetActivity> = [];

  constructor(private api: datavault.DataVaultApi,
              public path: Array<string>) {}

  async start(): Promise<ActivityState> {
    this.api.newDataset.add(item => this.onNewDataset(item.name), this.lifetime);
    var listing = await this.api.dir(this.path);
    var datasets = listing.datasets.slice(-3);

    var breadcrumbs = [];
    for (var i = 0; i <= this.path.length; i++) {
      breadcrumbs.push({
        name: (i == 0) ? 'grapher' : this.path[i-1],
        isLink: i < this.path.length,
        url: places.grapherUrl(this.path.slice(0, i))
      });
    }
    var breadcrumbExtras = [
      { name: 'dir view',
        isLink: true,
        url: places.grapherUrl(this.path)
      },
      { name: 'live view',
        isLink: false
      }
    ];

    this.elem = <LabradGrapherLive> LabradGrapherLive.create();
    this.elem.path = this.path;

    this.addInitialDatasets(datasets);

    return {
      elem: this.elem,
      route: 'grapher',
      breadcrumbs: breadcrumbs,
      breadcrumbExtras: breadcrumbExtras
    };
  }

  onNewDataset(name: string) {
    this.addDataset(name);
  }

  private async addInitialDatasets(datasets: Array<string>) {
    for (let dataset of datasets) {
      await this.addDataset(dataset);
    }
  }

  private async addDataset(name: string) {
    var numStr = name.split(" - ")[0];
    var num = Number(numStr);
    var activity = new DatasetActivity(this.api, this.path, num);
    var state = await activity.start();
    var plot = state.elem;
    var labeled = <LabeledPlot> LabeledPlot.create();
    labeled.name = name;
    labeled.url = places.datasetUrl(this.path, numStr);
    labeled.$.plot.appendChild(plot);
    this.elem.addPlot(labeled);
    this.activities.push(activity);
    while (this.activities.length > 3) {
      var activity = this.activities.shift();
      activity.stop();
      this.elem.removeLastPlot();
    }
  }

  async stop(): Promise<void> {
    this.lifetime.close();
    var stops = this.activities.map(activity => activity.stop());
    await Promise.all(stops);
  }

  private getDatasets(listing: datavault.DataVaultListing) {
    return listing.datasets.map(name => {
      return {name: name, url: places.datasetUrl(this.path, name.slice(0, 5))};
    });
  }
}

export class DatasetActivity implements Activity {
  private lifetime = new Lifetime();
  private dataAvailable = new AsyncQueue<void>();
  private token = String(Math.random());

  private plot: Plot;

  constructor(private api: datavault.DataVaultApi,
              public path: Array<string>,
              public dataset: number) {
    this.lifetime.defer(() => this.dataAvailable.close());
  }

  async start(): Promise<ActivityState> {
    console.log('loading dataset:', this.path, this.dataset);
    this.api.dataAvailable.add(msg => {
      if (msg.token === this.token) this.dataAvailable.offer(null);
    }, this.lifetime);
    this.api.newParameter.add(x => this.onNewParameter(), this.lifetime);
    var info = await this.api.datasetInfo({path: this.path, dataset: this.dataset});
    var breadcrumbs = [];
    for (var i = 0; i <= this.path.length; i++) {
      breadcrumbs.push({
        name: (i == 0) ? 'grapher' : this.path[i-1],
        isLink: true,
        url: places.grapherUrl(this.path.slice(0, i))
      });
    }
    breadcrumbs.push({
      name: info.name,
      isLink: false,
      url: places.datasetUrl(this.path, String(info.num))
    });

    var elem: HTMLElement = null;
    if (info.independents.length <= 2) {
      let plot = <Plot> Plot.create();
      plot.setAttribute('class', 'flex');
      plot.numIndeps = info.independents.length;
      plot.xLabel = datavault.makeAxisLabel(info.independents[0]);
      if (plot.numIndeps == 1) {
        plot.yLabel = datavault.makeAxisLabel(info.dependents[0]);
      } else {
        plot.yLabel = datavault.makeAxisLabel(info.independents[1]);
      }
      this.plot = plot;
      elem = plot;
    } else {
      // TODO: do something more informative here, even if we can't plot
      // the data in a meaningful way. For example, show data in a table.
      elem = document.createElement('div');
    }

    await this.api.dataStreamOpen({
      token: this.token,
      path: this.path,
      dataset: this.dataset
    });
    this.requestData();

    return {
      elem: elem,
      route: 'dataset',
      breadcrumbs: breadcrumbs
    };
  }

  onNewParameter(): void {
  }

  async requestData() {
    var addedData = false
    var done = false;
    while (!done) {
      var data = await this.api.dataStreamGet({token: this.token, limit: 2000});
      this.plot.addData(data);
      try {
        await this.dataAvailable.take();
      } catch (error) {
        done = true; // queue closed
      }
    }
  }

  async stop(): Promise<void> {
    this.lifetime.close();
    await this.api.dataStreamClose({token: this.token});
  }
}

export class ManagerActivity implements Activity {
  constructor(private api: manager.ManagerApi) {}

  async start(): Promise<ActivityState> {
    var conns = await this.api.connections();
    var connsWithUrl = conns.map((c) => {
      var x = <any> c;
      if (c.server) {
        x['url'] = places.serverUrl(c.name);
      }
      return x;
    });
    var elem = <LabradManager> LabradManager.create();
    elem.connections = connsWithUrl;
    return {
      elem: elem,
      route: 'manager'
    };
  }

  async stop(): Promise<void> {}
}

export class ServerActivity implements Activity {
  constructor(private api: manager.ManagerApi, public name: string) {}

  async start(): Promise<ActivityState> {
    var info = await this.api.serverInfo(this.name);
    var elem = <LabradServer> LabradServer.create();
    elem.info = info;
    return {
      elem: elem,
      route: 'server'
    };
  }

  async stop(): Promise<void> {}
}

export class NodesActivity implements Activity {
  constructor(private mgrApi: manager.ManagerApi,
              private nodeApi: node.NodeApi) {}

  async start(): Promise<ActivityState> {
    var nodesInfo = await this.nodeApi.allNodes();
    var elem = <LabradNodes> LabradNodes.create();
    elem.info = nodesInfo;
    elem.api = this.nodeApi;
    elem.managerApi = this.mgrApi;
    return {
      elem: elem,
      route: 'nodes'
    };
  }

  async stop(): Promise<void> {}
}
