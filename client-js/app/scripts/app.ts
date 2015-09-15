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

import {LabradApp} from "../elements/labrad-app";
import {LabradGrapher} from "../elements/labrad-grapher";
import {LabradManager} from "../elements/labrad-manager";
import {LabradNodes, LabradInstanceController, LabradNodeController} from "../elements/labrad-nodes";
import {LabradRegistry} from "../elements/labrad-registry";
import {LabradServer} from "../elements/labrad-server";
import {Plot, Plot1D} from "../elements/labrad-plot1d";
import {Plot2D} from "../elements/labrad-plot2d";


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
  LabradManager.register();
  LabradRegistry.register();
  LabradNodes.register();
  LabradInstanceController.register();
  LabradNodeController.register();
  LabradServer.register();
  Plot1D.register();
  Plot2D.register();

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

  function activate(newActivity: Activity): void {
    var p: Promise<void> = Promise.resolve(null);
    if (activity) {
      p = activity.stop();
    }
    p.then(
      (success) => {
        newActivity.start().then(
          (state) => {
            app.route = state.route;
            if (state.breadcrumbs) {
              app.hasBreadcrumbs = true;
              app.breadcrumbs = state.breadcrumbs;
            } else {
              app.hasBreadcrumbs = false;
            }
            var content = app.$.content;
            while (content.firstChild) {
              content.removeChild(content.firstChild);
            }
            content.appendChild(state.elem);
            activity = newActivity;
          },
          (error) => {
            console.log('error while starting activity', error);
          }
        )
      },
      (error) => {
        console.log('error while shutting down activity', error);
      }
    )
  }

  class RegistryActivity implements Activity {
    path: Array<string>;

    constructor(path: Array<string>) {
      this.path = path;
    }

    start(): Promise<ActivityState> {
      console.log('loading registry:', this.path);
      return reg.dir({path: this.path}).then((listing) => {
        var breadcrumbs = [];
        for (var i = 0; i <= this.path.length; i++) {
          breadcrumbs.push({
            name: (i == 0) ? 'registry' : this.path[i-1],
            isLink: i < this.path.length,
            url: registryUrl(this.path.slice(0, i))
          });
        }

        var dirs = [];
        for (var i = 0; i < listing.dirs.length; i++) {
          var dir = listing.dirs[i];
          dirs.push({
            name: dir,
            url: registryUrl(this.path, dir)
          });
        }
        var keys = [];
        for (var i = 0; i < listing.keys.length; i++) {
          keys.push({
            name: listing.keys[i],
            value: listing.vals[i]
          });
        }
        var elem = <LabradRegistry> LabradRegistry.create();
        elem.path = this.path;
        elem.dirs = dirs;
        elem.keys = keys;
        elem.socket = reg;

        return {
          elem: elem,
          route: 'registry',
          breadcrumbs: breadcrumbs
        };
      });
    }

    stop(): Promise<void> {
      return Promise.resolve(null);
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

    start(): Promise<ActivityState> {
      console.log('loading datavault:', this.path);
      this.api.newDir.add(x => this.onNewDir(), this.lifetime);
      this.api.newDataset.add(x => this.onNewDataset(), this.lifetime);
      return dv.dir(this.path).then((listing) => {
        var breadcrumbs = [];
        for (var i = 0; i <= this.path.length; i++) {
          breadcrumbs.push({
            name: (i == 0) ? 'grapher' : this.path[i-1],
            isLink: i < this.path.length,
            url: grapherUrl(this.path.slice(0, i))
          });
        }

        this.elem = <LabradGrapher> LabradGrapher.create();
        this.elem.path = this.path;
        this.elem.dirs = this.getDirs(listing);
        this.elem.datasets = this.getDatasets(listing);

        return {
          elem: this.elem,
          route: 'grapher',
          breadcrumbs: breadcrumbs
        };
      });
    }

    onNewDir() {
      dv.dir(this.path).then(listing => {
        this.elem.dirs = this.getDirs(listing);
      });
    }

    onNewDataset() {
      dv.dir(this.path).then(listing => {
        this.elem.datasets = this.getDatasets(listing);
      });
    }

    stop(): Promise<void> {
      this.lifetime.close();
      return Promise.resolve(null);
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

  class DatasetActivity implements Activity {
    path: Array<string>;
    dataset: number;

    private api: datavault.DataVaultService
    private lifetime = new Lifetime();
    private dataAvailable = new AsyncQueue<void>();

    private plot: Plot;

    constructor(api: datavault.DataVaultService, path: Array<string>, dataset: number) {
      this.api = api;
      this.path = path;
      this.dataset = dataset;
      this.lifetime.defer(() => this.dataAvailable.close());
    }

    start(): Promise<ActivityState> {
      console.log('loading dataset:', this.path, this.dataset);
      this.api.dataAvailable.add(x => this.dataAvailable.offer(null), this.lifetime);
      this.api.newParameter.add(x => this.onNewParameter(), this.lifetime);
      return this.api.datasetInfo({path: this.path, dataset: this.dataset}).then((info) => {
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
        switch (info.independents.length) {
          case 1:
            let p1D = <Plot1D> Plot1D.create();
            p1D.setAttribute('class', 'flex');
            p1D.xLabel = info.independents[0];
            p1D.yLabel = info.dependents[0];
            this.plot = p1D;
            elem = p1D;
            break;

          case 2:
            let p2D = <Plot2D> Plot2D.create();
            p2D.setAttribute('class', 'flex');
            p2D.xLabel = info.independents[0];
            p2D.yLabel = info.independents[1];
            this.plot = p2D;
            elem = p2D;
            break;

          default:
            elem = document.createElement('div');
            break;
        }

        this.requestData();

        return {
          elem: elem,
          route: 'dataset',
          breadcrumbs: breadcrumbs
        };
      });
    }

    onNewParameter(): void {
    }

    requestData(): void {
      this.api.data({limit: 100, startOver: false}).then(data => {
        this.addData(data);
        this.dataAvailable.take().then(
          (success) => this.requestData(),
          (error) => {} // queue closed; do nothing
        );
      });
    }

    addData(data: Array<Array<number>>): void {
      this.plot.addData(data);
    }

    stop(): Promise<void> {
      this.lifetime.close();
      return Promise.resolve(null);
    }
  }

  class ManagerActivity implements Activity {
    start(): Promise<ActivityState> {
      return mgr.connections().then((conns) => {
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
      });
    }

    stop(): Promise<void> {
      return Promise.resolve(null);
    }
  }

  class ServerActivity implements Activity {
    name: string;

    constructor(name: string) {
      this.name = name;
    }

    start(): Promise<ActivityState> {
      return mgr.serverInfo(this.name).then((info) => {
        var elem = <LabradServer> LabradServer.create();
        elem.info = info;
        return {
          elem: elem,
          route: 'server'
        }
      });
    }

    stop(): Promise<void> {
      return Promise.resolve(null);
    }
  }

  class NodesActivity implements Activity {
    start(): Promise<ActivityState> {
      return node.allNodes().then((nodesInfo) => {
        var elem = <LabradNodes> LabradNodes.create();
        elem.info = nodesInfo;
        elem.api = node;
        elem.managerApi = mgr;
        return {
          elem: elem,
          route: 'nodes'
        }
      });
    }

    stop(): Promise<void> {
      return Promise.resolve(null);
    }
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
    activate(new RegistryActivity([]));
  });
  function mkRegRoute(n: number) {
    page('/registry/' + pathRoute(n), (ctx, next) => {
      activate(new RegistryActivity(getPath(ctx)));
    })
  }
  for (var i = 0; i <= 20; i++) {
    mkRegRoute(i);
  }

  page('/grapher', function () {
    activate(new DatavaultActivity(dv, []));
  });
  function mkDvRoutes(n: number) {
    page('/grapher/' + pathRoute(n), (ctx, next) => {
      activate(new DatavaultActivity(dv, getPath(ctx)));
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
  function loginWithDialog() {
    app.$.loginButton.addEventListener('click', (event) => {
      var username = '',
          password = app.$.passwordInput.value,
          rememberPassword = app.$.rememberPassword.checked;
      mgr.login({username: username, password: password}).then(
        (result) => {
          var creds = {username: username, password: password};
          var storage = rememberPassword ? window.localStorage : window.sessionStorage;
          storage.setItem('labrad-credentials', JSON.stringify(creds));
          app.$.loginDialog.close();
          page({
            hashbang: false
          });
        },
        (error) => {
          app.loginError = error.message || error;
          loginWithDialog();
        }
      );
    });
    app.$.loginDialog.open();
    setTimeout(() => app.$.passwordInput.$.input.focus(), 0);
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
   * Attempt to login to labrad using credentials saved in the given Storage.
   *
   * If the login fails due to an invalid password, we clear the credentials
   * from this storage object.
   */
  function attemptLogin(storage: Storage): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      var creds = loadCreds(storage);
      if (creds === null) {
        reject('no credentials');
      } else {
        mgr.login({
          username: creds.username,
          password: creds.password
        }).then(
          (result) => {
            resolve(result);
          },
          (error) => {
            var errStr = String(error.message || error);
            if (errStr.indexOf('password') >= 0) {
              // if we had credentials, clear them out
              storage.removeItem('labrad-credentials');
            }
            reject(error);
          }
        );
      }
    });
  }

  // Login using credentials from session and then local storage.
  // If no valid credentials are found, prompt user with login dialog.
  var creds: Creds = loadCreds(window.sessionStorage) || loadCreds(window.localStorage);

  attemptLogin(window.sessionStorage)
    .catch(
      error => attemptLogin(window.localStorage)
    )
    .then(
      success => page({hashbang: false}),
      error => loginWithDialog()
    );
});
