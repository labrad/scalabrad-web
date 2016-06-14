/// <reference path="../../typings/tsd.d.ts" />

import page from "page";

import {Activity} from "./activity";
import * as activities from "./activities";
import * as manager from "./manager";
import * as registry from "./registry";
import * as datavault from "./datavault";
import * as nodeApi from "./node";
import {Places} from "./places";
import * as promises from "./promises";
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


interface Services {
  places?: Places;
  socket: rpc.JsonRpcSocket;
  mgr: manager.ManagerApi;
  reg: registry.RegistryApi;
  dv: datavault.DataVaultApi;
  node: nodeApi.NodeApi;
}


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
    route += `:p${i}/`;
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
    var name = `p${i}`;
    if (ctx.params.hasOwnProperty(name)) {
      path.push(ctx.params[name]);
    } else {
      return path;
    }
    i++;
  }
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

  var prefix = "";
  var prefixElem = document.querySelector("base");
  if (prefixElem !== null) {
    prefix = prefixElem.getAttribute("href");
  }
  console.log('urlPrefix', prefix);

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
  var apiUrl = (window['apiHost'] || relativeWebSocketUrl()) + prefix + "/api/socket";

  // The current activity, which encapsulates the current URL and the UI
  // rendered for that URL.
  var activity: Activity = null;

  // The name of the manager to which we are currently logged in
  var loggedInTo: string = null;
  var services: Services = null;

  // Stop the current activity and start a new one. This allows activities to
  // do cleanup work before their UI is replaced, such as removing event
  // listeners.
  async function activate(manager: string, newActivityFunc: (Services) => Activity): Promise<void> {
    try {
      if (activity) {
        await activity.stop();
      }
      if (loggedInTo !== manager) {
        if (services) {
          services.socket.close();
        }
        services = await login(manager);
        services.places = new Places(prefix, manager);
        loggedInTo = manager;
        app.host = manager;
        app.places = services.places;
      }
      var newActivity = newActivityFunc(services);
      var state = await newActivity.start();
      if (document) {
        document.title = `${manager || "Labrad"} - ${state.route}`;
      }
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

  function createRoutes(withManager: boolean) {
    // Set up page routing using page.js. When URL transitions are triggered that
    // match the routes specified here, we create a corresponding activity and
    // activate it after shutting down the current activity. Note that these
    // routes correspond to the functions for creating URLs defined in the places
    // module.
    var pref = prefix;
    if (withManager) {
      pref += '/:manager';
    }

    function getManager(ctx): string {
      if (withManager) {
        return ctx.params['manager'];
      } else {
        return '';
      }
    }

    page(pref + '/', (ctx, next) => {
      activate(getManager(ctx), (s) => new activities.ManagerActivity(s.places, s.mgr));
    });

    page(pref + '/server/:name', (ctx, next) => {
      activate(getManager(ctx), (s) => new activities.ServerActivity(s.mgr, ctx.params['name']));
    });

    page(pref + '/nodes', (ctx, next) => {
      activate(getManager(ctx), (s) => new activities.NodesActivity(s.places, s.mgr, s.node));
    });

    function mkRegRoute(n: number) {
      page(pref + '/registry/' + pathRoute(n), (ctx, next) => {
        activate(getManager(ctx), (s) => new activities.RegistryActivity(s.places, s.reg, getPath(ctx)));
      })
    }
    for (var i = 0; i <= 20; i++) {
      mkRegRoute(i);
    }

    function mkDvRoutes(n: number) {
      page(pref + '/grapher/' + pathRoute(n), (ctx, next) => {
        var path = getPath(ctx);
        if (ctx.querystring === "live") {
          activate(getManager(ctx), (s) => new activities.DatavaultLiveActivity(s.places, s.dv, path));
        } else {
          activate(getManager(ctx), (s) => new activities.DatavaultActivity(s.places, s.dv, path));
        }
      });
      page(pref + '/dataset/' + pathRoute(n) + ':dataset', (ctx, next) => {
        activate(getManager(ctx), (s) => new activities.DatasetActivity(s.places, s.dv, getPath(ctx), Number(ctx.params['dataset'])));
      });
    }
    for (var i = 0; i <= 20; i++) {
      mkDvRoutes(i);
    }
  }
  createRoutes(false);
  createRoutes(true);

  /**
   * Launch a dialog box to let the user log in to labrad.
   */
  function loginWithDialog(mgr: manager.ManagerApi, manager: string): Promise<void> {
    var {obligation, promise} = obligate<void>();
    async function doLogin() {
      var username = '',
          password = app.$.passwordInput.value,
          rememberPassword = app.$.rememberPassword.checked;
      try {
        var result = await mgr.login({username: username, password: password, host: manager});
        var creds = {username: username, password: password};
        var storage = rememberPassword ? window.localStorage : window.sessionStorage;
        saveCreds(manager, storage, creds);
        app.$.loginDialog.close();
        obligation.resolve();
      } catch (error) {
        app.loginError = error.message || error;
        setTimeout(() => app.$.passwordInput.$.input.focus(), 0);
      }
    }
    app.host = manager;
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
  function loadCreds(manager: string, storage: Storage): Creds {
    var key = 'labrad-credentials';
    if (manager) {
      key += '.' + manager;
    }
    try {
      var creds = JSON.parse(storage.getItem(key));
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
  function saveCreds(manager: string, storage: Storage, creds: Creds) {
    var key = 'labrad-credentials';
    if (manager) {
      key += '.' + manager;
    }
    storage.setItem(key, JSON.stringify(creds));
  }

  function isPasswordError(error): boolean {
    var errStr = String(error.message || error);
    return errStr.indexOf('password') >= 0;
  }

  /**
   * Attempt to login to labrad using credentials saved in the given Storage.
   *
   * If the login fails due to an invalid password, we clear the credentials
   * from this storage object.
   */
  async function attemptLogin(mgr: manager.ManagerApi, manager: string, storage: Storage): Promise<void> {
    var key = 'labrad-credentials';
    if (manager) {
      key += '.' + manager;
    }
    var creds = loadCreds(manager, storage);
    if (creds === null) {
      throw new Error('no credentials');
    } else {
      try {
        await mgr.login({
          username: creds.username,
          password: creds.password,
          host: manager
        });
      } catch (error) {
        if (isPasswordError(error)) {
          // if we had credentials, clear them out
          storage.removeItem(key);
        }
        throw error;
      }
    }
  }

  /**
   * Login to labrad and then load the page.
   *
   * We attempt to login first with credentials stored in sessionStorage,
   * then localStorage, and finally by prompting the user to enter credentials
   * if neither of those work.
   */
  async function login(host: string, topLevel: boolean = true): Promise<Services> {
    async function reconnect(message: string) {
      app.connectionError = message;
      app.$.errorDialog.open();
      while (true) {
        await promises.sleep(5000);
        var services: Services = null;
        try {
          console.log('attempting to connect');
          services = await login(host, false);
          break;
        } catch (e) {
          console.log('connection failed', e);
          if (isPasswordError(e)) {
            break;
          }
        } finally {
          if (services) {
            await services.socket.close();
          }
        }
      }
      location.reload();
    }

    var socket = new rpc.JsonRpcSocket(apiUrl);
    try {
      await socket.openPromise;
    } catch (e) {
      await reconnect("Unable to establish websocket connection.");
    }

    if (topLevel) {
      socket.connectionClosed.add((event) => {
        if (event.code !== 1000) {
          reconnect("WebSocket connection closed.");
        }
      });
    }

    var mgr = new manager.ManagerServiceJsonRpc(socket);
    if (topLevel) {
      mgr.disconnected.add((msg) => {
        reconnect("Manager connection closed.");
      });
    }

    try {
      await attemptLogin(mgr, host, window.sessionStorage);
    } catch (e) {
      try {
        await attemptLogin(mgr, host, window.localStorage);
      } catch (e) {
        if (topLevel) {
          await loginWithDialog(mgr, host);
        } else {
          throw e;
        }
      }
    }

    var id = setInterval(() => {
      mgr.ping();
    }, 5000);
    if (topLevel) {
      socket.connectionClosed.add((event) => {
        clearInterval(id);
      })
    }

    return {
      places: new Places(prefix, host),
      socket: socket,
      mgr: mgr,
      reg: new registry.RegistryServiceJsonRpc(socket),
      dv: new datavault.DataVaultService(socket),
      node: new nodeApi.NodeService(socket)
    };
  }

  page({hashbang: false});
});
