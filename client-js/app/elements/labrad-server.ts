import 'polymer-ts';
import {ServerInfo, SettingInfo} from '../scripts/manager';

@component('labrad-server')
export class LabradServer extends polymer.Base {

  @property({type: Object})
  info: ServerInfo;

}
