import {PolymerElement, html} from "@polymer/polymer";
import {customElement, property} from "@polymer/decorators";

@customElement('dir-item')
export class DirItem extends PolymerElement {

  static get template(): HTMLTemplateElement {
    return html`
      <paper-icon-item>
        <iron-icon icon="{{dirIcon}}" item-icon></iron-icon>
        <content></content>
      </paper-icon-item>
    `;
  }

  @property({type: String})
  dirName: String;

  @property({type: String})
  kind: String;

  @property({type: String, computed: 'assignIcon(kind)'})
  dirIcon: String;

  @property({type: String})
  link: String;

  assignIcon(entryType: String) {
    if (entryType === 'folder') {
      return 'folder';
    }
    if (entryType === 'data') {
      return 'editor:insert-chart';
    }
    if (entryType === 'key') {
      return 'communication:vpn-key';
    } else {
      return 'error';
    }
  }
}
