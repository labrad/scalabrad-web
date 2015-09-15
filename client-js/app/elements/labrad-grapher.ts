import {DataVaultApi} from '../scripts/datavault';

@component('labrad-grapher')
export class LabradGrapher extends polymer.Base {
  @property({type: Array, notify: true})
  dirs: Array<any>;

  @property({type: Array, notify: true})
  datasets: Array<any>;

  @property({type: Array, notify: true})
  path: Array<string>;
}
