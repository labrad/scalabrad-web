/// <reference types="polymer-ts" />

export interface BreadcrumbItem {
  name: string;
  isLink: boolean;
  url?: string;
}

@component('labrad-breadcrumbs')
export class LabradBreadcrumbs extends polymer.Base {
  @property({type: Array, notify: true})
  breadcrumbs: BreadcrumbItem[];

  @property({type: Array, notify: true})
  extras: BreadcrumbItem[];
}
