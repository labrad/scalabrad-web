import {BreadcrumbItem} from './labrad-breadcrumbs';
import {Places} from '../scripts/places';

@component('labrad-app')
export class LabradApp extends polymer.Base {
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
