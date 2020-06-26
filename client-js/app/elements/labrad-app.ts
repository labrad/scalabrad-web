import {PolymerElement, html} from "@polymer/polymer";
import {customElement, property} from "@polymer/decorators";

import {BreadcrumbItem} from './labrad-breadcrumbs';
import {Places} from '../scripts/places';
import "@polymer/paper-checkbox/paper-checkbox.js";

@customElement('labrad-app')
export class LabradApp extends PolymerElement {

  static get template(): HTMLTemplateElement {
    return html`
      <style is="custom-style">
      paper-header-panel {
        --paper-header-panel-standard-container: {
          display: flex;
          flex-direction: column;
        };
      }
      </style>
      <style>
        paper-menu iron-icon {
          margin-right: 33px;
          opacity: 0.54;
        }

        .paper-menu > .iron-selected {
          color: var(--default-primary-color);
        }

        #mainToolbar {
          font-size: 20px;
        }

        paper-menu a {
          text-decoration: none;
          color: var(--menu-link-color);
          display: -ms-flexbox;
          display: -webkit-flex;
          display: flex;
          -ms-flex-direction: row;
          -webkit-flex-direction: row;
          flex-direction: row;
          -ms-flex-align: center;
          -webkit-align-items: center;
          align-items: center;
          font-family: 'Roboto', 'Noto', sans-serif;
          -webkit-font-smoothing: antialiased;
          text-rendering: optimizeLegibility;
          font-size: 14px;
          font-weight: 400;
          line-height: 24px;
          min-height: 48px;
          padding: 0px 16px;
        }

        #toggle {
          width: 45px;
          height: 45px;
          border: none;
          color: var(--drawer-menu-color);
          background-color: transparent;
          margin-right: 16px;
          padding: 8px;
        }

        #content {
          flex: 1;
        }

        #location {
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
        }
        #locationInner {
          float: right;
        }
        #location labrad-breadcrumbs {
          display: inline;
        }

        #tech-info {
          margin: 20px;
        }
        #tech-info h1 {
          font-size: 16px;
        }
        #tech-info p {
          font-size: 12px;
          font-family: monospace;
        }

        #footer {
          height: 25px;
          background-color: var(--paper-indigo-500);
          flex-shrink: 0;
        }

        paper-dialog hr {
          margin: 0 0 0 0;
        }
      </style>

      <paper-drawer-panel id="drawerPanel" force-narrow disable-edge-swipe>
        <div drawer>
          <!-- Drawer Toolbar -->
          <paper-toolbar id="drawerToolbar">
            <span>LabRAD</span>
          </paper-toolbar>

          <!-- Drawer Content -->
          <paper-menu class="list" attr-for-selected="data-route" selected="{{route}}" on-iron-select="onMenuSelect">
            <a data-route="manager" href="{{managerUrl}}">
              <iron-icon icon="home"></iron-icon>
              <span>Manager</span>
            </a>

            <a data-route="nodes" href="{{nodesUrl}}">
              <iron-icon icon="hardware:device-hub"></iron-icon>
              <span>Nodes</span>
            </a>

            <a data-route="registry" href="{{registryUrl}}">
              <iron-icon icon="description"></iron-icon>
              <span>Registry</span>
            </a>

            <a data-route="grapher" href="{{grapherUrl}}">
              <iron-icon icon="editor:insert-chart"></iron-icon>
              <span>Grapher</span>
            </a>
          </paper-menu>

          <div id="tech-info">
            <h1>Technical Info</h1>
            <p>client: <span>{{clientVersion}}</span></p>
            <p>server: <span>{{serverVersion}}</span></p>
          </div>
        </div>

        <paper-header-panel main mode="standard">
          <!-- Main Toolbar -->
          <paper-toolbar id="mainToolbar">
            <button tabindex="1" id="toggle" paper-drawer-toggle>
              <iron-icon icon="menu" paper-drawer-toggle></iron-icon>
            </button>

            <!-- Application name -->
            <div id="location">
              <div id="locationInner">
                <span>Labrad -</span>
                <template is="dom-if" if="{{!hasBreadcrumbs}}">
                  <span>{{route}}</span>
                </template>
                <template is="dom-if" if="{{hasBreadcrumbs}}">
                  <labrad-breadcrumbs breadcrumbs={{breadcrumbs}} extras={{breadcrumbExtras}}></labrad-breadcrumbs>
                </template>
              </div>
            </div>

            <span class="flex"></span>

            <!-- Logout button -->
            <paper-button id="logout" on-click="doLogout">logout</paper-button>
          </paper-toolbar>

          <!-- Main Content -->
          <div id="content"></div>

          <div id="footer"></div>

        </paper-header-panel>
      </paper-drawer-panel>

      <paper-dialog id="loginDialog" modal>
        <h1>Login to Labrad</h1>
        <template is="dom-if" if="{{host}}">
          <h2>on <span>{{host}}</span></h2>
        </template>
        <div class="buttons" hidden$={{!allowOAuthLogin}}>
          <paper-button id="oauthButton">Login with Google</paper-button>
        </div>
        <hr hidden$={{!allowOAuthLogin}}>
        <div hidden$={{allowOAuthLogin}}>
          <form id="loginForm">
            <paper-input id="usernameInput" label="username" always-float-label hidden$={{!allowUsernameLogin}}></paper-input>
            <paper-input id="passwordInput" label="password" always-float-label type="password"></paper-input>
          </form>
          <div class="buttons">
            <paper-button id="loginButton">Login with Password</paper-button>
          </div>
        </div>
        <hr hidden$={{allowOAuthLogin}}>
        <div>
          <paper-checkbox id="rememberPassword">Remember me</paper-checkbox>
        </div>
        <div>
          <span>{{loginError}}</span>
        </div>
      </paper-dialog>

      <paper-dialog id="errorDialog" modal>
        <h1>Lost connection to Labrad</h1>
        <div>
          <span>{{connectionError}}</span>
        </div>
        <div>
          Attempting to reconnect.
        </div>
      </paper-dialog>
    `;
  }

  @property({type: String, value: '<unknown>'})
  clientVersion: string;

  @property({type: String, value: '<unknown>'})
  serverVersion: string;

  @property({type: String, value: ''})
  host: string;

  @property({type: String})
  route: string;

  @property()
  places: Places;

  @property({type: Boolean})
  hasBreadcrumbs: boolean;

  @property({type: Array})
  breadcrumbs: BreadcrumbItem[];

  @property({type: Array, value: () => []})
  breadcrumbExtras: BreadcrumbItem[];

  @property({type: Boolean})
  allowUsernameLogin: boolean;

  @property({type: Boolean})
  allowOAuthLogin: boolean;

  @property({type: String})
  loginError: string;

  @property({type: String})
  connectionError: string;

  @computed()
  managerUrl(places: Places): string {
    return places.managerUrl();
  }

  @computed()
  nodesUrl(places: Places): string {
    return places.nodesUrl();
  }

  @computed()
  registryUrl(places: Places): string {
    return places.registryUrl([]);
  }

  @computed()
  grapherUrl(places: Places): string {
    return places.grapherUrl([]);
  }

  ready() {
    // Ensure the drawer is hidden on desktop/tablet
    this.$.drawerPanel.forceNarrow = true;
  }

  // Close drawer after menu item is selected if drawerPanel is narrow
  onMenuSelect(event) {
    var drawerPanel = this.$.drawerPanel;
    if (drawerPanel.narrow) {
      drawerPanel.closeDrawer();
    }
  }

  doLogout(event) {
    var key = 'labrad-credentials';
    if (this.host) {
      key += '.' + this.host;
    }
    window.localStorage.removeItem(key);
    window.sessionStorage.removeItem(key);
    window.location.reload();
  }
}
