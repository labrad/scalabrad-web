/// <reference path="../../typings/tsd.d.ts" />

import page from "page";

import * as manager from "./manager";
import * as registry from "./registry";
import * as datavault from "./datavault";
import * as nodeApi from "./node";
import * as rpc from "./rpc";

import {LabradNodes, LabradInstanceController, LabradNodeController} from "../elements/labrad-nodes";
import {LabradRegistry} from "../elements/labrad-registry";
import * as pages from "../elements/labrad-pages";

// autobinding template which is the main ui container
var app: any = document.querySelector('#app');

// Close drawer after menu item is selected if drawerPanel is narrow
app.onMenuSelect = function() {
  var drawerPanel: any = document.querySelector('#paperDrawerPanel');
  if (drawerPanel.narrow) {
    drawerPanel.closeDrawer();
  }
};

window.addEventListener('WebComponentsReady', function() {
  // register our custom elements with polymer
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

  function setContent(elem): void {
    var content = app.$.content;
    console.log('container', content);
    console.log('contents', elem);
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

      app.route = 'registry';
      setContent(pages.RegistryPage.init(breadcrumbs, path, dirs, keys, reg));
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

      app.route = 'grapher';
      setContent(pages.GrapherPage.init(path, breadcrumbs, dirs, datasets));
    });
  }

  function loadDataset(path: Array<string>, dataset: string) {
    console.log('loading dataset:', path, dataset);
    dv.dir(path).then((listing) => {
      app.route = 'dataset';
      var parentUrl = '/grapher/' + pathStr(path);
      setContent(pages.DatasetPage.init(path, dataset, parentUrl));
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
      app.route = 'manager';
      setContent(pages.ManagerPage.init(connsWithUrl));
    });
  });

  page('/server/:name', (ctx, next) => {
    mgr.serverInfo(ctx.params['name']).then((info) => {
      app.route = 'server';
      setContent(pages.ServerPage.init(info));
    });
  });

  page('/nodes', () => {
    node.allNodes().then((nodesInfo) => {
      app.route = 'nodes';
      setContent(pages.NodesPage.init(nodesInfo, node, mgr));
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

  // add #! before urls
  page({
    hashbang: false
  });

  // Ensure the drawer is hidden on desktop/tablet
  var drawerPanel: any = document.querySelector('#paperDrawerPanel');
  drawerPanel.forceNarrow = true;
});
