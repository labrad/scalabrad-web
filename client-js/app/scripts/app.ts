/// <reference path="../../typings/tsd.d.ts" />

import page from "page";
import "whatwg-fetch";

import {Activity} from "./activity";
import * as activities from "./activities";
import {Credential, Password, OAuthToken, loadCredential, saveCredential} from "./credentials";
import {ManagerApi, ManagerApiImpl} from "./manager";
import * as registry from "./registry";
import * as datavault from "./datavault";
import * as nodeApi from "./node";
import {Places} from "./places";
import * as promises from "./promises";
import * as rpc from "./rpc";
import {obligate} from "./obligation";
import {encodeQueryString, decodeQueryString} from "./util";

import {AppLink} from "../elements/app-link";
import {LabradApp} from "../elements/labrad-app";
import {LabradBreadcrumbs} from "../elements/labrad-breadcrumbs";
import {LabradGrapher} from "../elements/labrad-grapher";
import {LabradGrapherLive, LabeledPlot} from "../elements/labrad-grapher-live";
import {LabradManager} from "../elements/labrad-manager";
import {LabradExceptionHandler, LabradNodes, LabradInstanceController, LabradNodeController} from "../elements/labrad-nodes";
import {LabradRegistry} from "../elements/labrad-registry";
import {LabradServer} from "../elements/labrad-server";
import {LabradSetting} from "../elements/labrad-setting";
import {Plot} from "../elements/labrad-plot";
import {SelectableTable} from "../elements/selectable-table";


interface Services {
  places?: Places;
  socket: rpc.JsonRpcSocket;
  mgr: ManagerApi;
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
function getPath(ctx): string[] {
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
  AppLink.register();
  LabradApp.register();
  LabradBreadcrumbs.register();
  LabradGrapher.register();
  LabradGrapherLive.register();
  LabradManager.register();
  LabradRegistry.register();
  LabradNodes.register();
  LabradInstanceController.register();
  LabradExceptionHandler.register();
  LabradNodeController.register();
  LabeledPlot.register();
  LabradServer.register();
  LabradSetting.register();
  Plot.register();
  SelectableTable.register();

  var prefix = "";
  var baseElem = document.querySelector("base");
  if (baseElem !== null) {
    var href = baseElem.getAttribute("href");

    // If href does not end with a trailing slash, remove the last segment.
    // Resolving relative URLs against /a/b/c.html is the same as against /a/b/
    // and we don't want c.html in the prefix.
    if (!href.endsWith("/")) {
      var segments = href.split("/");
      segments[segments.length - 1] = "";
      href = segments.join("/");
    }

    // Strip trailing slash, since routes have leading slash already.
    prefix = href.substring(0, href.length - 1);
  }

  function getMeta(name: string): string {
    var elem = document.querySelector(`meta[name=${name}]`);
    if (elem === null) {
      return null;
    }
    return elem.getAttribute("content");
  }

  function getMetaJSON<A>(name: string, fallback: A): A {
    var value = getMeta(name);
    if (value === null) {
      return fallback;
    }
    return <A>JSON.parse(value);
  }

  var clientVersion = getMeta("labrad-clientVersion");
  var redirectGrapher = getMetaJSON<boolean>("labrad-redirectGrapher", false);
  var redirectRegistry = getMetaJSON<boolean>("labrad-redirectRegistry", false);

  var body = document.querySelector('body');
  body.removeAttribute('unresolved');
  body.addEventListener('app-link-click', (e: any) => {
    page(e.detail.path);
  });

  var app = <LabradApp> LabradApp.create();
  app.clientVersion = clientVersion;
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
  var apiUrl = (getMeta("labrad-apiHost") || relativeWebSocketUrl()) + prefix + "/api/socket";

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
      console.error('Error while starting activity', error);
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
        if (withManager && redirectRegistry && !ctx.params['manager'].includes(".")) {
          page.redirect(prefix + '/registry/' + pathRoute(n));
        } else {
          activate(getManager(ctx), (s) => new activities.RegistryActivity(s.places, s.reg, getPath(ctx)));
        }
      })
    }
    for (var i = 0; i <= 20; i++) {
      mkRegRoute(i);
    }

    function mkDvRoutes(n: number) {
      page(pref + '/grapher/' + pathRoute(n), (ctx, next) => {
        if (withManager && redirectGrapher && !ctx.params['manager'].includes(".")) {
          page.redirect(prefix + '/grapher/' + pathRoute(n));
        } else {
          var path = getPath(ctx);
          if (ctx.querystring === "live") {
            activate(getManager(ctx), (s) => new activities.DatavaultLiveActivity(s.places, s.dv, path));
          } else {
            activate(getManager(ctx), (s) => new activities.DatavaultActivity(s.places, s.dv, path));
          }
        }
      });
      page(pref + '/dataset/' + pathRoute(n) + ':dataset', (ctx, next) => {
        if (withManager && redirectGrapher && !ctx.params['manager'].includes(".")) {
          page.redirect(prefix + '/dataset/' + pathRoute(n));
        } else {
          activate(getManager(ctx), (s) => new activities.DatasetActivity(s.places, s.dv, getPath(ctx), Number(ctx.params['dataset'])));
        }
      });
    }
    for (var i = 0; i <= 20; i++) {
      mkDvRoutes(i);
    }
  }

  // Create route for OAuth login callback.
  page(prefix + '/oauth2callback', (ctx, next) => {
    finishOAuthLogin(ctx.querystring);
  });

  // Create the rest of the application routes.
  createRoutes(false);
  createRoutes(true);

  /**
   * Launch a dialog box to let the user log in to labrad.
   */
  async function loginWithDialog(mgr: ManagerApi, manager: string): Promise<void> {
    const {obligation, promise} = obligate<void>();
    async function doLogin() {
      const username = app.$.usernameInput.value,
            password = app.$.passwordInput.value,
            rememberPassword = app.$.rememberPassword.checked;
      try {
        const result = await mgr.login({
          username: username,
          password: password,
          manager: manager
        });
        const credential: Password = {
          kind: 'username+password',
          username: username,
          password: password
        };
        const storage = rememberPassword ? window.localStorage
                                       : window.sessionStorage;
        saveCredential(manager, storage, credential);
        app.$.loginDialog.close();
        obligation.resolve();
      } catch (error) {
        app.loginError = error.message || error;
        setTimeout(() => app.$.passwordInput.$.input.focus(), 0);
      }
    }

    const authMethods = await mgr.authMethods({manager: manager});
    app.host = manager;
    app.allowUsernameLogin = authMethods.indexOf('username+password') >= 0;
    app.allowOAuthLogin = authMethods.indexOf('oauth_token') >= 0;
    app.$.loginButton.addEventListener('click', (event) => doLogin());
    app.$.loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      event.stopPropagation();
      doLogin();
    });
    if (app.allowOAuthLogin) {
      app.$.oauthButton.addEventListener('click', (event) => {
        startOAuthLogin(mgr, manager)
      });
    }
    app.$.loginDialog.open();
    setTimeout(() => app.$.passwordInput.$.input.focus(), 0);
    return promise;
  }

  async function startOAuthLogin(mgr: ManagerApi, manager: string) {
    const rememberMe = app.$.rememberPassword.checked;
    try {
      const {clientId, clientSecret} = await mgr.oauthInfo({ manager: manager });
      const redirectUri = `${location.protocol}//${location.host}${prefix}/oauth2callback`;
      const params = {
        'response_type': 'code',
        'client_id': clientId,
        'redirect_uri': redirectUri,
        'scope': 'openid email profile',
        'state': JSON.stringify({
          path: location.pathname + location.search + location.hash,
          manager: manager,
          client_id: clientId,
          client_secret: clientSecret,
          redirect_uri: redirectUri,
          remember_me: rememberMe
        })
      };
      const baseUrl = 'https://accounts.google.com/o/oauth2/v2/auth'
      const url = `${baseUrl}?${encodeQueryString(params)}`;
      window.location.href = url;
    } catch (error) {
      app.loginError = error.message || error;
      setTimeout(() => app.$.passwordInput.$.input.focus(), 0);
    }
  }

  async function finishOAuthLogin(queryString: string) {
    const params = decodeQueryString(queryString);
    const state = JSON.parse(params['state']);

    // Exchange the access token for an ID token.
    const requestParams = {
      code: params['code'],
      client_id: state['client_id'],
      client_secret: state['client_secret'],
      redirect_uri: state['redirect_uri'],
      grant_type: 'authorization_code'
    }
    const response = await fetch('https://www.googleapis.com/oauth2/v4/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: encodeQueryString(requestParams)
    });
    const responseParams = await response.json();
    const storage = state['remember_me'] ? window.localStorage
                                         : window.sessionStorage;
    saveCredential(state['manager'], storage, {
      kind: 'oauth_token',
      clientId: state['client_id'],
      clientSecret: state['client_secret'],
      accessToken: responseParams['access_token'],
      expiresAt: responseParams['expires_in'] + new Date().getTime(),
      idToken: responseParams['id_token'],
      refreshToken: responseParams['refresh_token']
    });
    page.redirect(state['path']);
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
  async function attemptLogin(mgr: ManagerApi, manager: string, storage: Storage): Promise<void> {
    var key = 'labrad-credentials';
    if (manager) {
      key = `${key}.${manager}`;
    }
    var credential = loadCredential(manager, storage);
    if (credential === null) {
      throw new Error('no credentials');
    }
    try {
      // TODO(maffoo): TS2 compiler understands .kind; can then remove casts.
      switch (credential.kind) {
        case 'oauth_token':
          await mgr.oauthLogin({
            idToken: (credential as OAuthToken).idToken,
            manager: manager
          });
          break;

        case 'username+password':
          await mgr.login({
            username: (credential as Password).username,
            password: (credential as Password).password,
            manager: manager
          });
          break;
      }
    } catch (error) {
      if (isPasswordError(error)) {
        // If we had credentials, clear them out.
        storage.removeItem(key);
      }
      throw error;
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
          console.info('Attempting to connect');
          services = await login(host, false);
          break;
        } catch (e) {
          console.error('Connection failed', e);
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

    var mgr = new ManagerApiImpl(socket);
    if (topLevel) {
      mgr.version().then((version) => {
        app.serverVersion = version;
      });
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
