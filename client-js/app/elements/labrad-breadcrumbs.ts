@component('labrad-breadcrumbs')
export class LabradBreadcrumbs extends polymer.Base {
  @property({type: Array, notify: true})
  breadcrumbs: Array<{name: string; isLink: boolean; url?: string}>;

  @property({type: Array, notify: true})
  extras: Array<{name: string; isLink: boolean; url?: string}>;
}
