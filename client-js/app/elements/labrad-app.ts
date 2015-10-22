@component('labrad-app')
export class LabradApp extends polymer.Base {
  @property({type: String})
  route: string;

  @property({type: Boolean})
  hasBreadcrumbs: boolean;

  @property({type: Array})
  breadcrumbs: Array<{name: string; isLink: boolean; url?: string}>;

  @property({type: Array, value: []})
  breadcrumbExtras: Array<{name: string; isLink: boolean; url?: string}>;

  @property({type: String})
  loginError: string;

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
    window.localStorage.removeItem('labrad-credentials');
    window.sessionStorage.removeItem('labrad-credentials');
    window.location.reload();
  }
}
