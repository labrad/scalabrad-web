import {PolymerElement, html} from "@polymer/polymer";
import {customElement, property} from "@polymer/decorators";

@customElement('labrad-setting')
export class LabradSetting extends PolymerElement {

  static get template(): HTMLTemplateElement {
    return html`
      <div>
        <h3>{{info.id}}</span>: <span>{{info.name}}</span></h3>
        <div>{{info.doc}}</div>
        <div>
          <div>
            <span>Accepts:</span>
            <ul>
              <template is="dom-repeat" items="{{info.acceptedTypes}}">
                <li>{{item}}</li>
              </template>
            </ul>
          </div>
          <div>
            <span>Returns:</span>
            <ul>
              <template is="dom-repeat" items="{{info.returnedTypes}}">
                <li>{{item}}</li>
              </template>
            </ul>
          </div>
        </div>
      </div>
    `;
  }

  @property({type: Object, notify: true})
  info: Object;
}
