/// <reference path="../../typings/tsd.d.ts" />

import page from "page";

import * as manager from "./manager";
import * as registry from "./registry";
import * as datavault from "./datavault";
import * as nodeApi from "./node";
import * as rpc from "./rpc";

import {LabradApp} from "../elements/labrad-app";
import {LabradNodes, LabradInstanceController, LabradNodeController} from "../elements/labrad-nodes";
import {LabradRegistry} from "../elements/labrad-registry";
import * as pages from "../elements/labrad-pages";


/**
 * Object containing login credentials.
 */
interface Creds {
  username: string;
  password: string;
}


window.addEventListener('WebComponentsReady', () => {

  // register our custom elements with polymer
  LabradApp.register();
  LabradRegistry.register();
  LabradNodes.register();
  LabradInstanceController.register();
  LabradNodeController.register();
  pages.ManagerPage.register();
  pages.ServerPage.register();
  pages.NodesPage.register();
  pages.RegistryPage.register();
  pages.GrapherPage.register();
  pages.DatasetPage.register();

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

  function setContent(elem: HTMLElement, route: string, breadcrumbs?: Array<{name: string; isLink: boolean; url?: string}>): void {
    app.route = route;
    if (breadcrumbs) {
      app.hasBreadcrumbs = true;
      app.breadcrumbs = breadcrumbs;
    } else {
      app.hasBreadcrumbs = false;
    }
    var content = app.$.content;
    while (content.firstChild) {
      content.removeChild(content.firstChild);
    }
    content.appendChild(elem);
  }

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

  function loadRegistry(path: Array<string>) {
    console.log('loading registry:', path);
    reg.dir({path: path}).then((listing) => {
      console.log(listing);

      var breadcrumbs = [];
      for (var i = 0; i <= path.length; i++) {
        breadcrumbs.push({
          name: (i == 0) ? 'registry' : path[i-1],
          isLink: i < path.length,
          url: '/registry/' + pathStr(path.slice(0, i))
        });
      }
      console.log('breadcrumbs', breadcrumbs);

      var dirs = [];
      for (var i = 0; i < listing.dirs.length; i++) {
        var dir = listing.dirs[i];
        dirs.push({
          name: dir,
          url: '/registry/' + pathStr(path, dir)
        });
      }
      var keys = [];
      for (var i = 0; i < listing.keys.length; i++) {
        keys.push({
          name: listing.keys[i],
          value: listing.vals[i]
        });
      }

      setContent(pages.RegistryPage.init(breadcrumbs, path, dirs, keys, reg), 'registry', breadcrumbs);
    });
  }

  function loadDatavault(path: Array<string>) {
    console.log('loading datavault:', path);
    dv.dir(path).then((listing) => {
      console.log(listing);

      var breadcrumbs = [];
      for (var i = 0; i <= path.length; i++) {
        breadcrumbs.push({
          name: (i == 0) ? 'grapher' : path[i-1],
          isLink: i < path.length,
          url: '/grapher/' + pathStr(path.slice(0, i))
        });
      }
      console.log('breadcrumbs', breadcrumbs);

      var dirs = [];
      for (var i = 0; i < listing.dirs.length; i++) {
        var dir = listing.dirs[i];
        dirs.push({
          name: dir,
          url: '/grapher/' + pathStr(path, dir)
        });
      }
      var datasets = [];
      for (var i = 0; i < listing.datasets.length; i++) {
        var name = listing.datasets[i];
        datasets.push({
          name: name,
          url: '/dataset/' + pathStr(path, name.slice(0, 5))
        });
      }

      setContent(pages.GrapherPage.init(path, dirs, datasets), 'grapher', breadcrumbs);
    });
  }

  function loadDataset(path: Array<string>, dataset: string) {
    console.log('loading dataset:', path, dataset);
    dv.dir(path).then((listing) => {
      var parentUrl = '/grapher/' + pathStr(path);
      setContent(pages.DatasetPage.init(path, dataset, parentUrl), 'dataset');
    });
  }

  // Set up page routing
  page('/', () => {
    mgr.connections().then((conns) => {
      var connsWithUrl = conns.map((c) => {
        var x = <any> c;
        if (c.server) {
          x['url'] = `/server/${encodeURIComponent(c.name)}`;
        }
        return x;
      });
      setContent(pages.ManagerPage.init(connsWithUrl), 'manager');
    });
  });

  page('/server/:name', (ctx, next) => {
    mgr.serverInfo(ctx.params['name']).then((info) => {
      setContent(pages.ServerPage.init(info), 'server');
    });
  });

  page('/nodes', () => {
    node.allNodes().then((nodesInfo) => {
      setContent(pages.NodesPage.init(nodesInfo, node, mgr), 'nodes');
    });
  });

  page('/registry', () => {
    loadRegistry([]);
  });

  // TODO: why does this wildcard route not work??
  //page('/registry/*', function (ctx, next) {
  //  loadRegistry([ctx.params[0]]);
  //});
  function mkRegRoute(n: number) {
    var route = '/registry/';
    for (var i = 0; i < n; i++) {
      route += ':p' + i + '/';
    }
    page(route, (ctx, next) => {
      var path = [];
      for (var i = 0; i < n; i++) {
        path.push(ctx.params['p' + i]);
      }
      loadRegistry(path);
    })
  }
  for (var i = 0; i <= 20; i++) {
    mkRegRoute(i);
  }

  page('/grapher', function () {
    loadDatavault([]);
  });

  // TODO: use wildcard route instead
  //page('/grapher/*', function (ctx) {
  //  app.route = 'grapher';
  //  app.path = ctx.params[0];
  //});
  function mkDvRoutes(n: number) {
    var route = '/grapher/';
    var dsroute = '/dataset/';
    for (var i = 0; i < n; i++) {
      route += ':p' + i + '/';
      dsroute += ':p' + i + '/';
    }
    page(route, (ctx, next) => {
      var path = [];
      for (var i = 0; i < n; i++) {
        path.push(ctx.params['p' + i]);
      }
      loadDatavault(path);
    });
    page(dsroute + ':dataset', (ctx, next) => {
      var path = [];
      for (var i = 0; i < n; i++) {
        path.push(ctx.params['p' + i]);
      }
      loadDataset(path, ctx.params['dataset']);
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
