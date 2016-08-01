@component('labrad-setting')
export class LabradSetting extends polymer.Base {
  @property({type: Object, notify: true})
  info: Object;
}
