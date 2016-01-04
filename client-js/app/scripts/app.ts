/// <reference path="../../typings/tsd.d.ts" />

import page from "page";

import {Activity} from "./activity";
import * as activities from "./activities";
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
  body.appendChild(app);

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

  // The current activity, which encapsulates the current URL and the UI
  // rendered for that URL.
  var activity: Activity = null;

  // Stop the current activity and start a new one. This allows activities to
  // do cleanup work before their UI is replaced, such as removing event
  // listeners.
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

  // Set up page routing using page.js. When URL transitions are triggered that
  // match the routes specified here, we create a corresponding activity and
  // activate it after shutting down the current activity. Note that these
  // routes correspond to the functions for creating URLs defined in the places
  // module.
  page('/', () => {
    activate(new activities.ManagerActivity(mgr));
  });

  page('/server/:name', (ctx, next) => {
    activate(new activities.ServerActivity(mgr, ctx.params['name']));
  });

  page('/nodes', () => {
    activate(new activities.NodesActivity(mgr, node));
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

  function mkRegRoute(n: number) {
    page('/registry/' + pathRoute(n), (ctx, next) => {
      activate(new activities.RegistryActivity(reg, getPath(ctx)));
    })
  }
  for (var i = 0; i <= 20; i++) {
    mkRegRoute(i);
  }

  function mkDvRoutes(n: number) {
    page('/grapher/' + pathRoute(n), (ctx, next) => {
      var path = getPath(ctx);
      if (ctx.querystring === "live") {
        activate(new activities.DatavaultLiveActivity(dv, path));
      } else {
        activate(new activities.DatavaultActivity(dv, path));
      }
    });
    page('/dataset/' + pathRoute(n) + ':dataset', (ctx, next) => {
      activate(new activities.DatasetActivity(dv, getPath(ctx), Number(ctx.params['dataset'])));
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
