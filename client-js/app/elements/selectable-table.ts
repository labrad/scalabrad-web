@component('selectable-table')
@behavior((<any>Polymer).IronSelectableBehavior)
@extend('tbody')
export class SelectableTable extends polymer.Base {}
