import {ConnectionInfo} from '../scripts/manager';

@component('labrad-manager')
export class LabradManager extends polymer.Base {

  @property({type: Array, notify: true})
  connections: Array<ConnectionInfo>;

}
