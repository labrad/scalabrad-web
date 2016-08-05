@component('labrad-breadcrumbs')
export class LabradBreadcrumbs extends polymer.Base {
  @property({type: Array, notify: true})
  breadcrumbs: {name: string; isLink: boolean; url?: string}[];

  @property({type: Array, notify: true})
  extras: {name: string; isLink: boolean; url?: string}[];
}
