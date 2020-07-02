import {PolymerElement, html} from "@polymer/polymer";
import {customElement, property} from "@polymer/decorators";

@customElement('menu-button')
export class MenuButton extends PolymerElement {

  static get template(): HTMLTemplateElement {
    return html`
      <style>
        #caption {
          color: #757575;
          font-size: 11px;
          margin-top: 16px;
          overflow: hidden;
          text-align: center;
          text-overflow: ellipsis;
          white-space: nowrap;
          width: 100px;
        }
        .paper-button {
          padding: -10px 0px;
        }
      </style>
      <paper-button disabled={{disabled}}>
        <iron-icon icon="{{iconName}}"></iron-icon>
        <div id="caption">{{name}}</div>
      </paper-button>
    `;
  }

  @property({type: String, notify: true})
  iconName: String;

  @property({type: String, notify: true})
  name: String

  @property({type: Boolean, notify: true})
  disabled: Boolean
}
