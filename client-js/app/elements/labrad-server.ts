import {PolymerElement, html} from "@polymer/polymer";
import {customElement, property} from "@polymer/decorators";

import {ServerInfo} from '../scripts/manager';

import "./labrad-setting";

@customElement('labrad-server')
export class LabradServer extends PolymerElement {

  static get template(): HTMLTemplateElement {
    return html`
      <style>
        :host {
          display: block;
        }
      </style>
      <div>
        <h1><span>{{info.id}}</span>: <span>{{info.name}}</span></h1>
        <div>{{info.version}}</div>
        <div>{{info.description}}</div>
        <div>
          <template is="dom-repeat" items="{{info.settings}}">
            <labrad-setting info={{item}}></labrad-setting>
          </template>
        </div>
      </div>
    `;    
  }

  @property({type: Object})
  info: ServerInfo;

}
