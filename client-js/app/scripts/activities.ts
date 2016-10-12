import {Activity, ActivityState} from "./activity";
import {AsyncQueue} from "./async-queue";
import {Lifetime} from "./lifetime";
import * as manager from "./manager";
import {Places} from "./places";
import * as registry from "./registry";
import * as datavault from "./datavault";
import * as node from "./node";

import {LabradGrapher} from "../elements/labrad-grapher";
import {LabradGrapherLive, LabeledPlot} from "../elements/labrad-grapher-live";
import {LabradManager} from "../elements/labrad-manager";
import {LabradNodes} from "../elements/labrad-nodes";
import {LabradRegistry} from "../elements/labrad-registry";
import {LabradServer} from "../elements/labrad-server";
import {LabradSetting} from "../elements/labrad-setting";
import {Plot} from "../elements/labrad-plot";

export class RegistryActivity implements Activity {
  private elem: LabradRegistry;
  private lifetime = new Lifetime();

  constructor(private places: Places,
              private api: registry.RegistryApi,
              public path: string[]) {}

  async start(): Promise<ActivityState> {
    this.api.newItem.add(() => this.onNewItem(), this.lifetime);
    console.info('Loading registry:', this.path);
    await this.api.watch({path: this.path});
    var listing = await this.api.dir({path: this.path});
    var breadcrumbs = [];
    for (var i = 0; i <= this.path.length; i++) {
      breadcrumbs.push({
        name: (i == 0) ? 'registry' : this.path[i-1],
        isLink: i < this.path.length,
        url: this.places.registryUrl(this.path.slice(0, i))
      });
    }

    var elem = <LabradRegistry> LabradRegistry.create();

    elem.path = this.path;
    elem.dirs = [];
    elem.keys = [];
    elem.socket = this.api;
    elem.places = this.places;
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

  constructor(private places: Places,
              private api: datavault.DataVaultApi,
              public path: string[]) {}

  async start(): Promise<ActivityState> {
    console.info('Loading datavault:', this.path);
    this.api.newDir.add(x => this.onNewDir(x), this.lifetime);
    this.api.newDataset.add(x => this.onNewDataset(x), this.lifetime);
    this.api.tagsUpdated.add(x => this.tagsUpdated(), this.lifetime);

    var breadcrumbs = [];
    for (var i = 0; i <= this.path.length; i++) {
      breadcrumbs.push({
        name: (i == 0) ? 'grapher' : this.path[i-1],
        isLink: i < this.path.length,
        url: this.places.grapherUrl(this.path.slice(0, i))
      });
    }

    var breadcrumbExtras = [
      { name: 'dir view',
        isLink: false,
        url: ''
      },
      { name: 'live view',
        isLink: true,
        url: this.places.grapherUrl(this.path) + '?live'
      }
    ];

    this.elem = <LabradGrapher> LabradGrapher.create();
    this.elem.api = this.api;
    this.elem.places = this.places;
    this.elem.path = this.path;

    try {
      var listing = await this.api.dir(this.path);
      this.elem.dirs = this.getDirs(listing);
      this.elem.datasets = this.getDatasets(listing);
    } catch (e) {
      this.elem.openUnableToConnectDialog(e.message);
      this.elem.dirs = [];
      this.elem.datasets = [];
    }

    return {
      elem: this.elem,
      route: 'grapher',
      breadcrumbs: breadcrumbs,
      breadcrumbExtras: breadcrumbExtras
    };
  }

  private onNewDir(item: {name: string, tags?: string[]}) {
    this.elem.newDir({
      name: item.name,
      url: this.places.grapherUrl(this.path, item.name),
      tags: (item.tags) ? item.tags : []
    });
  }

  private onNewDataset(item: {name: string, tags?: string[]}) {
    this.elem.newDataset({
      name: item.name,
      url: this.places.datasetUrl(this.path, item.name.split(" - ")[0]),
      tags: (item.tags) ? item.tags : []
    });
  }

  async tagsUpdated() {
    var listing = await this.api.dir(this.path);
    this.elem.dirs = this.getDirs(listing);
    this.elem.datasets = this.getDatasets(listing);
  }

  async stop(): Promise<void> {
    this.lifetime.close();
  }

  private getDirs(listing: datavault.DataVaultListing) {
    return listing.dirs.map(item => {
      return {
        name: item.name,
        url: this.places.grapherUrl(this.path, item.name),
        tags: item.tags
      };
    });
  }

  private getDatasets(listing: datavault.DataVaultListing) {
    return listing.datasets.map(item => {
      return {
        name: item.name,
        url: this.places.datasetUrl(this.path, item.name.split(" - ")[0]),
        tags: item.tags
      };
    });
  }
}

export class DatavaultLiveActivity implements Activity {
  private elem: LabradGrapherLive;
  private plots: Plot[] = [];
  private lifetime = new Lifetime();
  private activities: DatasetActivity[] = [];

  constructor(private places: Places,
              private api: datavault.DataVaultApi,
              public path: string[]) {}

  async start(): Promise<ActivityState> {
    this.api.newDataset.add(item => this.onNewDataset(item.name), this.lifetime);
    var listing = await this.api.dir(this.path);
    var datasets = listing.datasets.slice(-3).map(item => item.name);

    var breadcrumbs = [];
    for (var i = 0; i <= this.path.length; i++) {
      breadcrumbs.push({
        name: (i == 0) ? 'grapher' : this.path[i-1],
        isLink: i < this.path.length,
        url: this.places.grapherUrl(this.path.slice(0, i))
      });
    }
    var breadcrumbExtras = [
      { name: 'dir view',
        isLink: true,
        url: this.places.grapherUrl(this.path)
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

  private async addInitialDatasets(datasets: string[]) {
    for (let dataset of datasets) {
      await this.addDataset(dataset);
    }
  }

  private async addDataset(name: string) {
    var numStr = name.split(" - ")[0];
    var num = Number(numStr);
    var activity = new DatasetActivity(this.places, this.api, this.path, num);
    var state = await activity.start();
    var plot = state.elem;
    var labeled = <LabeledPlot> LabeledPlot.create();
    labeled.name = name;
    labeled.url = this.places.datasetUrl(this.path, numStr);
    labeled.$.plot.appendChild(plot);
    this.elem.addPlot(labeled);
    this.activities.push(activity);

    // If there were fewer than three activities before adding the new one,
    // resize all plots to ensure they fit the view.
    if (this.activities.length <= 3) {
      for (const activity of this.activities) {
        activity.plot.redrawScene();
      }
    }

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
    return listing.datasets.map(item => {
      return {
        name: item.name,
        url: this.places.datasetUrl(this.path, item.name.split(" - ")[0])
      };
    });
  }
}

export class DatasetActivity implements Activity {
  private lifetime = new Lifetime();
  private dataAvailable = new AsyncQueue<void>();
  private token = String(Math.random());

  plot: Plot;

  constructor(private places: Places,
              private api: datavault.DataVaultApi,
              public path: string[],
              public dataset: number) {
    this.lifetime.defer(() => this.dataAvailable.close());
  }

  async start(): Promise<ActivityState> {
    console.info('Loading dataset:', this.path, this.dataset);
    this.api.dataAvailable.add(msg => {
      if (msg.token === this.token) this.dataAvailable.offer(null);
    }, this.lifetime);
    this.api.newParameter.add(x => this.onNewParameter(), this.lifetime);
    var info = await this.api.datasetInfo({
      path: this.path,
      dataset: this.dataset,
      includeParams: false
    });
    var breadcrumbs = [];
    for (var i = 0; i <= this.path.length; i++) {
      breadcrumbs.push({
        name: (i == 0) ? 'grapher' : this.path[i-1],
        isLink: true,
        url: this.places.grapherUrl(this.path.slice(0, i))
      });
    }
    breadcrumbs.push({
      name: info.name,
      isLink: false,
      url: this.places.datasetUrl(this.path, String(info.num))
    });

    var elem: HTMLElement = null;
    if (info.independents.length > 0 && info.independents.length <= 2) {
      let plot = <Plot> Plot.create();
      plot.backUrl = this.places.grapherUrl(this.path);
      plot.setAttribute('class', 'flex');
      plot.numIndeps = info.independents.length;
      plot.xLabel = datavault.makeAxisLabel(info.independents[0]);
      plot.deps = info.dependents;
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
  constructor(private places: Places,
              private api: manager.ManagerApi) {}

  async start(): Promise<ActivityState> {
    var connections = await this.api.connections();
    var elem = <LabradManager> LabradManager.create();
    elem.mgr = this.api;
    elem.places = this.places;
    elem.setConnections(connections);
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
  constructor(private places: Places,
              private mgrApi: manager.ManagerApi,
              private nodeApi: node.NodeApi) {}

  async start(): Promise<ActivityState> {
    var elem = <LabradNodes> LabradNodes.create();

    var nodesInfo = await this.nodeApi.allNodes();
    for (const node of nodesInfo) {
      var list = await this.nodeApi.autostartList(node.name);
      node.autostartList = list;
      elem.addItemToList(node);
    }

    elem.places = this.places;
    elem.api = this.nodeApi;
    elem.managerApi = this.mgrApi;
    return {
      elem: elem,
      route: 'nodes'
    };
  }

  async stop(): Promise<void> {}
}
