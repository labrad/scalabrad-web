import {PolymerElement, html} from "@polymer/polymer";
import {customElement, property} from "@polymer/decorators";

import {mixinBehaviors} from '@polymer/polymer/lib/legacy/class.js';
import {IronControlState} from '@polymer/iron-behaviors/iron-control-state.js';
import "@polymer/paper-input/paper-textarea.js";
import "@polymer/paper-item/paper-item.js";
import "@polymer/paper-tooltip/paper-tooltip.js";

/*
Expandable input. Takes a registry key value and shortens it to fit on the
screen. When clicked on reveals an editable text box which is shifted into
focus. Enter fires 'iron-form-submit' which sends the key, value pair as
event.detail
*/

@customElement('expandable-input')
export class ExpandableInput extends mixinBehaviors([IronControlState], PolymerElement) {

  static get template(): HTMLTemplateElement {
    return html`
      <style>
        #long {
          width: 80%;
        }
      </style>
      <div>
        <iron-a11y-keys keys="shift+enter" on-keys-pressed="submitForm">
        <!-- TODO remap newline from enter to "ctrl enter" -->
          <paper-textarea id="long" value="{{value::input}}" no-label-float hidden></paper-textarea>
          <paper-item id="short" on-click="selectField" label="{{valueShort}}">{{valueShort}}</paper-item>
          <paper-tooltip for="long">shift+enter to submit</paper-tooltip>
        </iron-a11y-keys>
      </div>
    `;
  }

  @property({type: String})
  name: String;

  @property({type: String})
  value: String;

  @property({type: Number})
  cols: Number = 80;

  //holds the shortened value which renders as 'value...' if longer than cols
  @property({type: String, computed: 'shortenValue(value)'})
  valueShort: String;

  function() {
    //This focus-changed event handles the revealing and hiding of the static field
    this.addEventListener('focused-changed', this.fieldFocus);
    this.$.long.$.input.$.textarea.addEventListener('keypress', this.keyPressed);
  }

  shortenValue(value) {
    //returned shortened string if longer than this.cols
    if (value.length > this.cols) {
      return value.substr(0, this.cols) + '...';
    }
    else {
      return value;
    }
  }

  fieldFocus() {
    /* When input field brought into focus this enlarges the input field.
    When focus is passed on, this shrinks the field and hides it behind the
    static label */
    if (!this.focused) {
      this.$.short.hidden = false;
      this.$.long.hidden = true;
    }
  }

  keyPressed(event) {
    // swallow shift-enter, which is used for submitting a value
    if (event.shiftKey && event.keyCode === 13) {
      event.preventDefault();
    }
  }

  submitForm() {
    //fires submit so event is picked up by correct Polymer listener
    this.fire('iron-form-submit', { key: this.name, value: this.$.long.$.input.$.textarea.value });
  }

  selectField() {
    //Hides static field to reveal multi-line input which is given focus
    this.$.short.hidden = true;
    this.$.long.hidden = false;
    this.$.long.$.input.$.textarea.focus();
  }

}
