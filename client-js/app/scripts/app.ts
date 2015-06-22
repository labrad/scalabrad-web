/// <reference path="../../typings/tsd.d.ts" />

import page = require("page");

import registry = require("./registry");
import datavault = require("./datavault");

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
  var body = document.querySelector('body');
  body.removeAttribute('unresolved');
  body.addEventListener('app-link-click', (e: any) => {
    page(e.detail.path);
  });

  var reg = new registry.RegistryService('http://localhost:9000');
  var dv = new datavault.DataVaultService('http://localhost:9000');

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
    reg.dir(path).then((listing) => {
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
      app.breadcrumbs = breadcrumbs;
      app.path = path;
      app.registryDirs = dirs;
      app.registryKeys = keys;
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
      app.breadcrumbs = breadcrumbs;
      app.path = path;
      app.datavaultDirs = dirs;
      app.datavaultDatasets = datasets;
    });
  }

  function loadDataset(path: Array<string>, dataset: String) {
    console.log('loading dataset:', path, dataset);
    dv.dir(path).then((listing) => {
      app.route = 'dataset';
      app.path = path;
      app.dataset = dataset;
    });
  }

  // Set up page routing
  page('/', function () {
    app.route = 'manager';
  });

  page('/nodes', function () {
    app.route = 'nodes';
  });

  page('/registry', function () {
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
