/// <reference path="../../typings/tsd.d.ts" />

import page from "page";

import {Activity, ActivityState} from "./activity";
import {AsyncQueue} from './async-queue';
import {Lifetime} from "./lifetime";
import * as manager from "./manager";
import * as registry from "./registry";
import * as datavault from "./datavault";
import * as nodeApi from "./node";
import * as rpc from "./rpc";
import {obligate} from "./obligation";

import {LabradApp} from "../elements/labrad-app";
import {LabradGrapher} from "../elements/labrad-grapher";
import {LabradGrapherLive, LabeledPlot} from "../elements/labrad-grapher-live";
import {LabradManager} from "../elements/labrad-manager";
import {LabradNodes, LabradInstanceController, LabradNodeController} from "../elements/labrad-nodes";
import {LabradRegistry} from "../elements/labrad-registry";
import {LabradServer} from "../elements/labrad-server";
import {Plot} from "../elements/labrad-plot";


/**
 * Object containing login credentials.
 */
interface Creds {
  username: string;
  password: string;
}


// common methods for creating URLs
function pathStr(path: Array<string>, dir?: string): string {
  var url = '';
  path.forEach(function(seg) {
    url += encodeURIComponent(seg) + '/';
  });
  if (typeof dir !== 'undefined') {
    url += encodeURIComponent(dir) + '/';
  }
  return url;
}

function grapherUrl(path: Array<string>, dir?: string): string {
  return '/grapher/' + pathStr(path, dir);
}

function datasetUrl(path: Array<string>, dataset: string): string {
  return '/dataset/' + pathStr(path, dataset);
}

function registryUrl(path: Array<string>, dir?: string): string {
  return '/registry/' + pathStr(path, dir);
}

function serverUrl(name: string): string {
  return '/server/' + encodeURIComponent(name);
}


window.addEventListener('WebComponentsReady', () => {

  // register our custom elements with polymer
  LabradApp.register();
  LabradGrapher.register();
  LabradGrapherLive.register();
  LabradManager.register();
  LabradRegistry.register();
  LabradNodes.register();
  LabradInstanceController.register();
  LabradNodeController.register();
  LabradServer.register();
  Plot.register();
  LabeledPlot.register();

  var body = document.querySelector('body');
  body.removeAttribute('unresolved');
  body.addEventListener('app-link-click', (e: any) => {
    page(e.detail.path);
  });

  var app = <LabradApp> LabradApp.create();
  body.appendChild(<any> app);

  // Construct a websocket url relative to this page based on window.location
  // Note that window.location.protocol includes a trailing colon, but
  // window.location.port does not include a leading colon.
  function relativeWebSocketUrl(): string {
    var loc = window.location;
    var protocol = loc.protocol === 'https:' ? 'wss:' : 'ws:';
    var port = loc.port === '' ? '' : `:${loc.port}`;
    return `${protocol}//${loc.hostname}${port}`;
  }

  // Get the url for the api backend websocket connection.
  // If the apiHost variable has been set globally, use that,
  // otherwise construct a url relative to the page host.
  var apiUrl = (window['apiHost'] || relativeWebSocketUrl()) + "/api/socket";

  var socket = new rpc.JsonRpcSocket(apiUrl);
  var mgr = new manager.ManagerServiceJsonRpc(socket);
  var reg = new registry.RegistryServiceJsonRpc(socket);
  var dv = new datavault.DataVaultService(socket);
  var node = new nodeApi.NodeService(socket);

  var activity: Activity = null;

  async function activate(newActivity: Activity): Promise<void> {
    try {
      if (activity) {
        await activity.stop();
      }
      var state = await newActivity.start();
      app.route = state.route;
      if (state.breadcrumbs) {
        app.hasBreadcrumbs = true;
        app.breadcrumbs = state.breadcrumbs;
        app.breadcrumbExtras = state.breadcrumbExtras;
      } else {
        app.hasBreadcrumbs = false;
      }
      var content = app.$.content;
      while (content.firstChild) {
        content.removeChild(content.firstChild);
      }
      content.appendChild(state.elem);
      activity = newActivity;
    } catch (error) {
      console.log('error while starting activity', error);
    }
  }

  class RegistryActivity implements Activity {
    path: Array<string>;
    private elem: LabradRegistry;

    private api: registry.RegistryApi;
    private lifetime = new Lifetime();

    constructor(api: registry.RegistryApi, path: Array<string>) {
      this.api = api;
      this.path = path;
    }

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
          url: registryUrl(this.path.slice(0, i))
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
      return this.api.unwatch({path: this.path});
    }
  }

  class DatavaultActivity implements Activity {
    path: Array<string>;

    private elem: LabradGrapher;

    private api: datavault.DataVaultService;
    private lifetime = new Lifetime();

    constructor(api: datavault.DataVaultService, path: Array<string>) {
      this.api = api;
      this.path = path;
    }

    async start(): Promise<ActivityState> {
      console.log('loading datavault:', this.path);
      this.api.newDir.add(x => this.onNewDir(), this.lifetime);
      this.api.newDataset.add(x => this.onNewDataset(), this.lifetime);
      var listing = await dv.dir(this.path);
      var breadcrumbs = [];
      for (var i = 0; i <= this.path.length; i++) {
        breadcrumbs.push({
          name: (i == 0) ? 'grapher' : this.path[i-1],
          isLink: i < this.path.length,
          url: grapherUrl(this.path.slice(0, i))
        });
      }
      var breadcrumbExtras = [
        { name: 'dir view', isLink: false, url: '' },
        { name: 'live view', isLink: true, url: grapherUrl(this.path) + '?live' }
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
      var listing = await dv.dir(this.path);
      this.elem.dirs = this.getDirs(listing);
    }

    async onNewDataset() {
      var listing = await dv.dir(this.path);
      this.elem.datasets = this.getDatasets(listing);
    }

    async stop(): Promise<void> {
      this.lifetime.close();
    }

    private getDirs(listing: datavault.DataVaultListing) {
      return listing.dirs.map(name => {
        return {name: name, url: grapherUrl(this.path, name)};
      });
    }

    private getDatasets(listing: datavault.DataVaultListing) {
      return listing.datasets.map(name => {
        return {name: name, url: datasetUrl(this.path, name.slice(0, 5))};
      });
    }
  }

  class DatavaultLiveActivity implements Activity {
    path: Array<string>;

    private elem: LabradGrapherLive;
    private plots: Array<Plot> = [];

    private api: datavault.DataVaultApi;
    private lifetime = new Lifetime();
    private activities: Array<DatasetActivity> = [];

    constructor(api: datavault.DataVaultApi, path: Array<string>) {
      this.api = api;
      this.path = path;
    }

    async start(): Promise<ActivityState> {
      this.api.newDataset.add(item => this.onNewDataset(item.name), this.lifetime);
      var listing = await dv.dir(this.path);
      var datasets = listing.datasets.slice(-3);

      var breadcrumbs = [];
      for (var i = 0; i <= this.path.length; i++) {
        breadcrumbs.push({
          name: (i == 0) ? 'grapher' : this.path[i-1],
          isLink: i < this.path.length,
          url: grapherUrl(this.path.slice(0, i))
        });
      }
      var breadcrumbExtras = [
        { name: 'dir view', isLink: true, url: grapherUrl(this.path) },
        { name: 'live view', isLink: false }
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
      labeled.url = datasetUrl(this.path, numStr);
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
        return {name: name, url: datasetUrl(this.path, name.slice(0, 5))};
      });
    }
  }

  class DatasetActivity implements Activity {
    path: Array<string>;
    dataset: number;

    private api: datavault.DataVaultApi
    private lifetime = new Lifetime();
    private dataAvailable = new AsyncQueue<void>();
    private token = String(Math.random());

    private plot: Plot;

    constructor(api: datavault.DataVaultApi, path: Array<string>, dataset: number) {
      this.api = api;
      this.path = path;
      this.dataset = dataset;
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
          url: grapherUrl(this.path.slice(0, i))
        });
      }
      breadcrumbs.push({
        name: info.name,
        isLink: false,
        url: datasetUrl(this.path, String(info.num))
      });

      var elem: HTMLElement = null;
      if (info.independents.length <= 2) {
        let plot = <Plot> Plot.create();
        plot.setAttribute('class', 'flex');
        plot.numIndeps = info.independents.length;
        plot.xLabel = info.independents[0];
        if (plot.numIndeps == 1) {
          plot.yLabel = info.dependents[0];
        } else {
          plot.yLabel = info.independents[1];
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
        var data = await this.api.dataStreamGet({token: this.token, limit: 100});
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

  class ManagerActivity implements Activity {
    async start(): Promise<ActivityState> {
      var conns = await mgr.connections();
      var connsWithUrl = conns.map((c) => {
        var x = <any> c;
        if (c.server) {
          x['url'] = serverUrl(c.name);
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

  class ServerActivity implements Activity {
    name: string;

    constructor(name: string) {
      this.name = name;
    }

    async start(): Promise<ActivityState> {
      var info = await mgr.serverInfo(this.name);
      var elem = <LabradServer> LabradServer.create();
      elem.info = info;
      return {
        elem: elem,
        route: 'server'
      };
    }

    async stop(): Promise<void> {}
  }

  class NodesActivity implements Activity {
    async start(): Promise<ActivityState> {
      var nodesInfo = await node.allNodes();
      var elem = <LabradNodes> LabradNodes.create();
      elem.info = nodesInfo;
      elem.api = node;
      elem.managerApi = mgr;
      return {
        elem: elem,
        route: 'nodes'
      };
    }

    async stop(): Promise<void> {}
  }

  // Set up page routing
  page('/', () => {
    activate(new ManagerActivity());
  });

  page('/server/:name', (ctx, next) => {
    activate(new ServerActivity(ctx.params['name']));
  });

  page('/nodes', () => {
    activate(new NodesActivity());
  });

  /**
   * Make a route with n path segments labeled p<i>.
   *
   * On a page change, the path can be extracted using the getPath function.
   * TODO: figure out a way to use wildcard routes instead of multiple routes
   * each with a fixed number of segments.
   */
  function pathRoute(n: number): string {
    var route = '';
    for (var i = 0; i < n; i++) {
      route += ':p' + i + '/';
    }
    return route;
  }

  /**
   * Get a path from the given page context.
   *
   * This is a helper to be used with heirarchical routes for the registry and
   * datavault, as created by the pathRoute function.
   */
  function getPath(ctx): Array<string> {
    var path = [], i = 0;
    while (true) {
      var name = 'p' + i;
      if (ctx.params.hasOwnProperty(name)) {
        path.push(ctx.params[name]);
      } else {
        return path;
      }
      i++;
    }
  }

  page('/registry', () => {
    activate(new RegistryActivity(reg, []));
  });
  function mkRegRoute(n: number) {
    page('/registry/' + pathRoute(n), (ctx, next) => {
      activate(new RegistryActivity(reg, getPath(ctx)));
    })
  }
  for (var i = 0; i <= 20; i++) {
    mkRegRoute(i);
  }

  page('/grapher', function (ctx) {
    if (ctx.querystring === "live") {
      activate(new DatavaultLiveActivity(dv, []));
    } else {
      activate(new DatavaultActivity(dv, []));
    }
  });
  function mkDvRoutes(n: number) {
    page('/grapher/' + pathRoute(n), (ctx, next) => {
      var path = getPath(ctx);
      if (ctx.querystring === "live") {
        activate(new DatavaultLiveActivity(dv, path));
      } else {
        activate(new DatavaultActivity(dv, path));
      }
    });
    page('/dataset/' + pathRoute(n) + ':dataset', (ctx, next) => {
      activate(new DatasetActivity(dv, getPath(ctx), Number(ctx.params['dataset'])));
    });
  }
  for (var i = 0; i <= 20; i++) {
    mkDvRoutes(i);
  }

  /**
   * Launch a dialog box to let the user log in to labrad.
   */
  function loginWithDialog(): Promise<void> {
    var {obligation, promise} = obligate<void>();
    async function doLogin() {
      var username = '',
          password = app.$.passwordInput.value,
          rememberPassword = app.$.rememberPassword.checked;
      try {
        var result = await mgr.login({username: username, password: password});
        var creds = {username: username, password: password};
        var storage = rememberPassword ? window.localStorage : window.sessionStorage;
        saveCreds(storage, creds);
        app.$.loginDialog.close();
        obligation.resolve();
      } catch (error) {
        app.loginError = error.message || error;
        setTimeout(() => app.$.passwordInput.$.input.focus(), 0);
      }
    }
    app.$.loginButton.addEventListener('click', (event) => doLogin());
    app.$.loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      event.stopPropagation();
      doLogin();
    });
    app.$.loginDialog.open();
    setTimeout(() => app.$.passwordInput.$.input.focus(), 0);
    return promise;
  }

  /**
   * Load credentials from the given Storage object (session or local).
   *
   * If valid credentials are not found, return null.
   */
  function loadCreds(storage: Storage): Creds {
    try {
      var creds = JSON.parse(storage.getItem('labrad-credentials'));
      if (creds.hasOwnProperty('username') &&
          creds.hasOwnProperty('password')) {
        return {
          username: creds.username,
          password: creds.password
        };
      }
    } catch (e) {}
    return null;
  }

  /**
   * Save credentials to the given Storage object, to be loaded by loadCreds.
   */
  function saveCreds(storage: Storage, creds: Creds) {
    storage.setItem('labrad-credentials', JSON.stringify(creds));
  }

  /**
   * Attempt to login to labrad using credentials saved in the given Storage.
   *
   * If the login fails due to an invalid password, we clear the credentials
   * from this storage object.
   */
  async function attemptLogin(storage: Storage): Promise<void> {
    var creds = loadCreds(storage);
    if (creds === null) {
      throw new Error('no credentials');
    } else {
      try {
        await mgr.login({
          username: creds.username,
          password: creds.password
        });
      } catch (error) {
        var errStr = String(error.message || error);
        if (errStr.indexOf('password') >= 0) {
          // if we had credentials, clear them out
          storage.removeItem('labrad-credentials');
        }
        throw error;
      }
    }
  }

  // Login using credentials from session and then local storage.
  // If no valid credentials are found, prompt user with login dialog.
  var creds: Creds = loadCreds(window.sessionStorage) || loadCreds(window.localStorage);

  /**
   * Login to labrad and then load the page.
   *
   * We attempt to login first with credentials stored in sessionStorage,
   * then localStorage, and finally by prompting the user to enter credentials
   * if neither of those work.
   */
  async function main() {
    try {
      await attemptLogin(window.sessionStorage);
    } catch (e) {
      try {
        await attemptLogin(window.localStorage);
      } catch (e) {
        await loginWithDialog();
      }
    }
    page({hashbang: false});
  }
  main();
});
