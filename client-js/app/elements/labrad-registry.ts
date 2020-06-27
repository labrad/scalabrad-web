import {PolymerElement, html} from "@polymer/polymer";
import {customElement, property} from "@polymer/decorators";

import {RegistryApi, RegistryListing} from '../scripts/registry';
import {Places} from '../scripts/places';
import "@polymer/paper-input/paper-textarea.js"
import "@polymer/paper-toast/paper-toast.js"
import "@polymer/iron-list/iron-list.js"

type ListItem = {
  name: string,
  kind: string,
  isParent: boolean,
  isDir: boolean,
  isKey: boolean,
  url?: string,
  value?: string,
  prettyValue?: string,
};

/*
This is the component that simply renders the table of registry content
*/

@customElement('labrad-registry')
export class LabradRegistry extends PolymerElement {

  static get template(): HTMLTemplateElement {
    return html`
      <style>
        :host {
          height: 100%;
          overflow: hidden;
          display: flex;
        }

        #reg-area {
          margin-top: var(--maintoolbar-height);
          background-color: white;
          display: inline-block;
          @apply(--shadow-elevation-2dp);
          height: 100%;
          width: 100%;
        }

        #outer {
          flex-direction: column;
          position: relative;
        }
        #listing {
          overflow: auto;
        }
        #outer, #listing, #combinedList {
          flex: 1;
          display: flex;
          width: 100%;
        }
        iron-list {
          --iron-list-items-container: {
            width: 100%;
          };
        }

        .dialogError {
          color: #f00;
        }
        .dialogError p {
          margin: 0;
          font-size: 13px;
        }
        .dialogError h4 {
          margin: 0;
          font-size: 15px;
        }

        .row {
          cursor: pointer;
          display: flex;
          flex-direction: row;
          align-items: middle;
        }
        .row:nth-child(1n).iron-selected {
          background-color: #CCCCCC;
        }
        .row:nth-child(odd) {
          background-color: #EEEEEE;
        }
        .row:nth-child(odd):hover {
          background-color: #F6F699;
        }
        .row:nth-child(even):hover {
          background-color: #FFFFAA;
        }
        .row .dir.over {
          background-color: #93d4d4;
        }
        .row .dir {
          white-space: nowrap;
          -webkit-user-select: none;
        }
        .row .key {
          width: 16em;
          white-space: nowrap;
          padding-right: 2em;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .row .value {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          padding-right: 1em;
          line-height: 30px;
        }

        .iron-selector {
          width: 100%;
          display: block;
          border: 1px solid #ccc;
          border-top: none;
        }

        paper-toolbar {
          background-color: #EEEEEE;
          color: black;
        }

        paper-dialog {
          overflow-y: auto;
        }
        paper-dialog.size-position {
          position: fixed;
          top: 16p
          right: 16px;
        }
        paper-dialog.size-position {
          width: 300px;
          height: 300px;
        }
        paper-button {
          white-space: nowrap;
        }
        menu-button {
          color: #0F9D58;
        }
        iron-autogrow-textarea {
          max-width: 400px;
        }
        #search-bar {
          padding: 0px 10px;
          flex-grow: 1;
          text-align: right;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        #search-bar paper-input {
          font-family: var(--primary-font-family);
          width: calc(100% - 50px);
          border: 0;
          border-radius: 2px;
          -webkit-appearance: none;
          display: inline-block;
          text-align: left;
          --paper-font-caption: {
            display: none;
          }
          --layout-center: {
            background-color: #fff;
            align-items: center;
          }
          --paper-input-container-input: {
            line-height: 24px;
            padding: 10px;
            width: calc(100% - 20px);
          }
        }
        .mono {
          font-family: 'roboto mono', monospace;
          font-size: 15px;
        }
        #editValueInput {
          min-width: 50em;
        }

        iron-icon {
          margin: 5px;
        }
        iron-icon.folder {
          color: #CFBA78;
        }
        .key iron-icon {
          color: #209131;
        }
        paper-dialog {
          max-width: 90%;
          max-height: 90%;
        }
        .label-wide {
          width: 100%;
        }
        .label-wide a {
          text-decoration: none;
        }
        .label-wide a span {
          text-decoration: underline;
        }
        .label-wide .back-link,
        .label-wide .back-link:visited {
          color: #555;
        }
        .label-wide .back-link:hover,
        .label-wide .back-link:visited:hover {
          color: #3f51b5;
        }
      </style>
      <div id="outer">
        <!-- Dialog Controls -->
        <iron-a11y-keys target="[[target]]" keys="esc"
                        on-keys-pressed="dialogCancel"></iron-a11y-keys>
        <iron-a11y-keys target="[[target]]" keys="shift+enter enter"
                        on-keys-pressed="dialogSubmit"></iron-a11y-keys>
        <!-- Cursor Controls -->
        <iron-a11y-keys target="[[target]]" keys="esc up down"
                        on-keys-pressed="cursorMove"></iron-a11y-keys>
        <iron-a11y-keys target="[[target]]" keys="right enter"
                        on-keys-pressed="cursorTraverse"></iron-a11y-keys>
        <iron-a11y-keys target="[[target]]" keys="left backspace"
                        on-keys-pressed="cursorBack"></iron-a11y-keys>
        <!-- Search Controls -->
        <iron-a11y-keys target="[[target]]" keys="enter"
                        on-keys-pressed="searchSubmit"></iron-a11y-keys>
        <!-- Action Controls -->
        <iron-a11y-keys target="[[target]]" keys="k n c r d f"
                        on-keys-pressed="actionHandler"></iron-a11y-keys>
        <paper-header-panel id="left-column">
          <div class="paper-header" id="buttons">
            <paper-toolbar>
              <paper-button on-click="newKeyClicked">
                <iron-icon icon="create"></iron-icon>
                <span title="New Key (k)">New Key</span>
              </paper-button>
              <paper-button on-click="newFolderClicked">
                <iron-icon icon="folder-open"></iron-icon>
                <span title="New Dir (n)">New Dir</span>
              </paper-button>
              <paper-button on-click="copyClicked" disabled="[[!selected]]">
                <iron-icon icon="content-copy"></iron-icon>
                <span title="Copy (c)">Copy</span>
              </paper-button>
              <paper-button on-click="renameClicked" disabled="[[!selected]]">
                <iron-icon icon="code"></iron-icon>
                <span title="Rename (r)">Rename</span>
              </paper-button>
              <paper-button on-click="deleteClicked" disabled="[[!selected]]">
                <iron-icon icon="delete"></iron-icon>
                <span title="Delete (d)">Delete</span>
              </paper-button>
              <div id="search-bar">
                <paper-input id="search" value="{{filterText::input}}" noLabelFloat>
                  <span title="Search (f)" prefix>
                    <iron-icon icon="search"></iron-icon>
                  </span>
                </paper-input>
              </div>
            </paper-toolbar>
          </div>
          <div id="listing">
            <iron-list items="{{filteredListItems}}"
                      id="combinedList"
                      as="item"
                      selected-item="{{selected}}"
                      selection-enabled>
              <template>
                <div class$="row [[computeSelectedClass(selected)]]"
                    on-dblclick="editValueClicked"
                    name="{{item.name}}"
                    value="{{item.prettyValue}}"
                    kind="{{item.kind}}"
                    key-name="{{item.name}}"
                    is-key="{{item.isKey}}">
                  <template is="dom-if" if="{{item.isParent}}">
                    <div class="label-wide">
                      <a class='back-link' is="app-link" path="{{item.url}}" href="{{item.url}}">
                        <iron-icon icon="arrow-back" item-icon></iron-icon>
                        <span>{{item.name}}</span>
                      </a>
                    </div>
                  </template>
                  <template is="dom-if" if="{{item.isDir}}">
                    <div class="dir label-wide"
                        name="{{item.name}}"
                        kind="{{item.kind}}"
                        draggable="true"
                        on-dragover="onDirDragOver"
                        on-dragleave="onDirDragLeave"
                        on-drop="dirDrop">
                      <a is="app-link" path="{{item.url}}" href="{{item.url}}">
                        <iron-icon icon="folder" item-icon class="folder"></iron-icon>
                        <span>{{item.name}}</span>
                      </a>
                    </div>
                  </template>
                  <template is="dom-if" if="{{item.isKey}}">
                    <div class="key mono"
                        name="{{item.name}}"
                        kind="{{item.kind}}"
                        draggable="true">
                      <iron-icon icon="communication:vpn-key"item-icon></iron-icon>
                      <span title="{{item.name}}">{{item.name}}</span>
                    </div>
                    <div class="value label-wide mono">
                      <span>{{item.value}}</span>
                    </div>
                  </template>
                </div>
              </template>
            </iron-list>
          </div>

        <!-- Dialogs for various registry operations -->

        <paper-dialog id="newKeyDialog" modal>
          <h1>Create New Key</h1>
          <paper-input id="newKeyInput" label="Key" autofocus></paper-input>
          <paper-textarea id="newValueInput" label="Value"></paper-textarea>
          <template is="dom-if" if="{{errorMessage}}">
            <div class="dialogError">
              <template is="dom-if" if="{{errorTitle}}"><h4>{{errorTitle}}</h4></template>
              <p>{{errorMessage}}</p>
            </div>
          </template>
          <div class="buttons">
            <paper-button on-tap="doNewKey">OK</paper-button>
            <paper-button dialog-dismiss>CANCEL</paper-button>
          </div>
        </paper-dialog>

        <paper-dialog id="editValueDialog" modal>
          <h1>Edit "<span id="editValueName"></span>"</h1>
          <paper-textarea id="editValueInput" label="Value" autofocus></paper-textarea>
          <template is="dom-if" if="{{errorMessage}}">
            <div class="dialogError">
              <template is="dom-if" if="{{errorTitle}}"><h4>{{errorTitle}}</h4></template>
              <p>{{errorMessage}}</p>
            </div>
          </template>
          <div class="buttons">
            <paper-button on-tap="doEditValue">OK</paper-button>
            <paper-button dialog-dismiss>CANCEL</paper-button>
          </div>
        </paper-dialog>

        <paper-dialog id="newFolderDialog" modal>
          <h1>Create New Folder</h1>
          <paper-input id="newFolderInput" label="Name" autofocus></paper-input>
          <template is="dom-if" if="{{errorMessage}}">
            <div class="dialogError">
              <template is="dom-if" if="{{errorTitle}}"><h4>{{errorTitle}}</h4></template>
              <p>{{errorMessage}}</p>
            </div>
          </template>
          <div class="buttons">
            <paper-button on-tap="doNewFolder">OK</paper-button>
            <paper-button dialog-dismiss>CANCEL</paper-button>
          </div>
        </paper-dialog>

        <paper-dialog id="dragDialog" modal>
          <h1>
            <span id="dragOp"></span>
            <span id="dragClass"></span>
            "<span id="originName"></span>" from
            <span id="originPath"></span>
          </h1>
          <paper-input id="dragNameInput" label="New Name" always-float-label></paper-input>
          <paper-input id="dragPathInput" label="New Path" always-float-label></paper-input>
          <template is="dom-if" if="{{errorMessage}}">
            <div class="dialogError">
              <template is="dom-if" if="{{errorTitle}}"><h4>{{errorTitle}}</h4></template>
              <p>{{errorMessage}}</p>
            </div>
          </template>
          <div class="buttons">
            <paper-button on-tap="doDragOp">OK</paper-button>
            <paper-button dialog-dismiss>CANCEL</paper-button>
          </div>
        </paper-dialog>

        <paper-dialog id="copyDialog" modal>
          <h1>Copy <span>{{selectedType}}</span> "<span>{{selected.name}}</span>"?</h1>
          <paper-input id="copyNameInput" label="New Name" always-float-label autofocus></paper-input>
          <paper-input id="copyPathInput" label="New Path" always-float-label></paper-input>
          <template is="dom-if" if="{{errorMessage}}">
            <div class="dialogError">
              <template is="dom-if" if="{{errorTitle}}"><h4>{{errorTitle}}</h4></template>
              <p>{{errorMessage}}</p>
            </div>
          </template>
          <div class="buttons">
            <paper-button on-tap="doCopy">OK</paper-button>
            <paper-button dialog-dismiss>CANCEL</paper-button>
          </div>
        </paper-dialog>

        <paper-dialog id="renameDialog" modal>
          <h1>Rename <span>{{selectedType}}</span> "<span>{{selected.name}}</span>"?</h1>
          <paper-input id="renameInput" label="New Name" always-float-label autofocus></paper-input>
          <template is="dom-if" if="{{errorMessage}}">
            <div class="dialogError">
              <template is="dom-if" if="{{errorTitle}}"><h4>{{errorTitle}}</h4></template>
              <p>{{errorMessage}}</p>
            </div>
          </template>
          <div class="buttons">
            <paper-button on-tap="doRename">OK</paper-button>
            <paper-button dialog-dismiss>CANCEL</paper-button>
          </div>
        </paper-dialog>

        <paper-dialog id="deleteDialog" modal>
          <h1>Delete <span>{{selectedType}}</span> "<span>{{selected.name}}</span>"?</h1>
          <div class="buttons">
            <paper-button on-tap="doDelete" autofocus>OK</paper-button>
            <paper-button dialog-dismiss>CANCEL</paper-button>
          </div>
        </paper-dialog>

        <paper-dialog id="pendingDialog" modal>
          <h1 id="pendingOp"></h1>
        </paper-dialog>

        <paper-toast id="toastCopySuccess" text="Copy Successful!" duration=3000></paper-toast>
        <paper-toast id="toastMoveSuccess" text="Move Successful!" duration=3000></paper-toast>
      </div>
    `;
  }

  @property({type: Array, notify: true, value: () => []})
  dirs: {name: string; url: string}[];

  @property({type: Array, notify: true, value: () => []})
  keys: {name: string; value: string}[];

  @property({type: Array, notify: true, value: () => []})
  path: string[];

  @property({type: Array, value: () => []})
  filteredListItems: ListItem[];

  @property({type: Array, value: () => []})
  private listItems: ListItem[];

  @property({type: Object, notify: true, value: () => {}})
  selected: ListItem;

  @property({type: Object})
  socket: RegistryApi;

  @property()
  places: Places;

  @property({type: String, notify: true})
  notify: string;

  @property({type: String, notify: true, value: ''})
  filterText: string;

  regex: RegExp; //regular expression for string comparison

  @property({type: String, notify: true, value: ''})
  errorMessage: string;

  @property({type: String, notify: true, value: ''})
  errorTitle: string;

  target: HTMLElement = document.body;

  private dialogs: string[] = [
    'newKeyDialog',
    'editValueDialog',
    'newFolderDialog',
    'dragDialog',
    'copyDialog',
    'renameDialog',
    'deleteDialog',
    'pendingDialog',
  ];

  attached() {
    this.bindIronAutogrowTextAreaResizeEvents(this.$.newKeyDialog,
                                              this.$.newValueInput);

    this.bindIronAutogrowTextAreaResizeEvents(this.$.editValueDialog,
                                              this.$.editValueInput);

    for (const dialog of this.dialogs) {
      // Do not trigger on close of pending dialog.
      if (dialog === 'pendingDialog') {
        continue;
      }
      this.$[dialog].addEventListener('iron-overlay-closed', this.resetError.bind(this));
    }
  }


  private getListOffset(): number {
    return this.path.length > 0 ? 1 : 0;
  }


  private getDefaultSelectedItem(): number {
    const offset = this.getListOffset();
    return (this.filteredListItems.length > 1) ? offset : 0;
  }


  private getSelectedIndex(): number {
    const index = this.filteredListItems.indexOf(this.selected);
    if (index === -1) {
      return null;
    }
    return index;
  }


  private scrollToIndex(index: number): void {
    const list = this.$.combinedList;
    const first = list.firstVisibleIndex;
    const last = list.lastVisibleIndex;

    // If between the first and last elements, no need to scroll.
    if (index > first && index < last) {
      return;
    }

    const currentScroll = list.scrollTop;
    const listBounds = list.getBoundingClientRect();
    const selectedElement = list.children.items.querySelector('.iron-selected');
    const selectedBounds = selectedElement.getBoundingClientRect();

    // Due to the fact an element can be only partially on the screen, we want
    // to scroll by the distance between the top/bottom of the element and the
    // top/bottom of the list respectively, rather than a fixed amount or to a
    // specific index.
    let distance;
    if (selectedBounds.top < listBounds.top) {
      distance = selectedBounds.top - listBounds.top;
    } else {
      distance = selectedBounds.bottom - listBounds.bottom;
    }
    list.scroll(0, currentScroll + distance);
  }


  private getOpenDialog() {
    for (const dialog of this.dialogs) {
      if (this.$[dialog].opened) {
        return this.$[dialog];
      }
    }
    return null;
  }


  /**
   * Move the cursor on the currently selected item to the next item in the
   * list depending on if up or down is pressed. If nothing is selected then
   * the first item in the list is selected when down is pressed.
   *
   * This action doesn't work if a dialog is open.
   */
  cursorMove(event) {
    if (this.getOpenDialog()) {
      return;
    }

    this.searchSubmit();
    event.detail.keyboardEvent.preventDefault();

    const length = this.filteredListItems.length;
    const selectedIndex = this.getSelectedIndex();
    const list = this.$.combinedList;

    switch (event.detail.combo) {
      case 'up':
        if (selectedIndex !== null && selectedIndex !== 0) {
          list.selectItem(selectedIndex - 1);
          this.scrollToIndex(selectedIndex - 1);
        }
        break;

      case 'down':
        if (selectedIndex === null && length > 0) {
          list.selectItem(0);
          this.scrollToIndex(0);
        } else if (selectedIndex < length - 1) {
          list.selectItem(selectedIndex + 1);
          this.scrollToIndex(selectedIndex + 1);
        }
        break;

      case 'esc':
        this.set('filterText', '');
        break;

      default:
        // Nothing to do.
        break;
    }
  }


  /**
   * If we have a selected item, we want to follow it. In the case of a
   * directory, this means going into it. In the case of a key, it means
   * opening the edit box.
   *
   * This action doesn't work if a dialog window is open or if the search box
   * is focused.
   */
  cursorTraverse(event) {
    if (this.getSelectedIndex() === null || this.getOpenDialog() || this.$.search.focused) {
      return;
    }

    const item = this.selected;
    if (!item) {
      return;
    }

    // If we have a link, we want to traverse down.
    if (item.url) {
      this.fire('app-link-click', {path: item.url});
    } else {
      this.editValueSelected();
    }
  }


  /**
   * Traverse back up the directory tree if we aren't already at the registry
   * root.
   *
   * This action doesn't work if there is an open dialog or the search box is
   * focused.
   */
  cursorBack(event) {
    if (this.path.length === 0 || this.getOpenDialog() || this.$.search.focused) {
      return;
    }

    const parentPath = this.path.slice(0, -1);
    const parentUrl = this.places.registryUrl(parentPath);
    this.fire('app-link-click', {path: parentUrl});
  }


  actionHandler(event) {
    if (this.getOpenDialog() || this.$.search.focused) {
      return;
    }

    const key = event.detail.combo,
          keyboardEvent = event.detail.keyboardEvent,
          hasModifiers = (keyboardEvent.shiftKey || keyboardEvent.ctrlKey ||
                          keyboardEvent.altKey || keyboardEvent.metaKey);

    if (hasModifiers) {
      return;
    }

    // Copy, Rename and Delete only work with a selection.
    if (!this.selected && (key === "c" || key === "d" || key === "r")) {
      return;
    }

    switch (key) {
      case 'k':
        this.newKeyClicked();
        break;

      case 'n':
        this.newFolderClicked();
        break;

      case 'c':
        this.copyClicked();
        break;

      case 'r':
        this.renameClicked();
        break;

      case 'd':
        this.deleteClicked();
        break;

      case 'f':
        this.$.search.focus();
        // Prevent the key from being typed into the search box.
        event.detail.keyboardEvent.preventDefault();
        break;

      default:
        // Nothing to do.
        break;
    }
  }

  searchSubmit() {
    if (this.$.search.focused) {
      this.$.search.inputElement.blur();
    }
  }


  dialogSubmit(event) {
    const dialog = this.getOpenDialog();
    if (!dialog) {
      return;
    }

    // For dialogs with a textbox, so we only want to submit on Shift+Enter,
    // not on a solo enter keypress.
    if (dialog.id == 'newKeyDialog' || dialog.id === 'editValueDialog') {
      if (event.detail.combo !== 'shift+enter') {
        return;
      }
    }

    event.detail.keyboardEvent.preventDefault();

    switch (dialog.id) {
      case 'newKeyDialog':
        this.doNewKey();
        break;

      case 'editValueDialog':
        this.doEditValue();
        break;

      case 'newFolderDialog':
        this.doNewFolder();
        break;

      case 'renameDialog':
        this.doRename();
        break;

      case 'copyDialog':
        this.doCopy();
        break;

      default:
        // Nothing to do.
        break;
    }
  }


  dialogCancel(event) {
    const dialog = this.getOpenDialog();
    if (!dialog) {
      return;
    }
    event.detail.keyboardEvent.preventDefault();
    dialog.close();
  }


  /**
   * On path change, select the default element and clear the filter.
   */
  @observe('path')
  pathChanged(newPath: string[], oldPath: string[]) {
    this.set('filterText', '');
  }

  applyFilterToListItems() {
    if (!this.listItems) {
      return;
    }

    this.regex = new RegExp(this.filterText, 'i');
    this.set('filteredListItems', this.listItems.filter((item) => {
      return (!!item.name.match(this.regex));
    }));
  }

  /**
   * Filters the directory/key listing when filterText changes.
   */
  @observe('filterText')
  filterListing() {
    this.applyFilterToListItems();

    if (this.filteredListItems && this.filteredListItems.length) {
      this.$.combinedList.selectItem(0);
    }
  }


  /**
   * This is called whenever a newItem is added, hooked in actitives.
   */
  async repopulateList(): Promise<void> {
    const resp = await this.socket.dir({path: this.path});

    this.splice('dirs', 0, this.dirs.length);
    this.splice('keys', 0, this.keys.length);
    this.splice('listItems', 0, this.listItems.length);

    if (this.path.length > 0 && this.places) {
      const url = this.places.registryUrl(this.path.slice(0, -1));
      this.push('listItems', {
        name: '..',
        kind: 'parent',
        isParent: true,
        isDir: false,
        isKey: false,
        url: url
      });
    }

    for (const name of resp.dirs) {
      const url = this.places.registryUrl(resp.path, name);
      this.push('dirs', {
        name: name,
        url: url,
      });
      this.push('listItems', {
        name: name,
        kind: 'dir',
        isParent: false,
        isDir: true,
        isKey: false,
        url: url
      });
    }

    for (const j in resp.keys) {
      const name = resp.keys[j];
      const value = resp.vals[j];
      const prettyValue = resp.prettyVals[j];
      this.push('keys', {
        name: name,
        value: value,
      });

      this.push('listItems', {
        name: name,
        kind: 'key',
        isParent: false,
        isDir: false,
        isKey: true,
        value: value,
        prettyValue: prettyValue,
      });
    }

    const selected = this.selected;
    const selectedIndex = this.getSelectedIndex();
    this.applyFilterToListItems();
    const listLength = this.filteredListItems.length;

    let index = this.getDefaultSelectedItem();

    // If there was a previously selected key, say we were editing one, then
    // we want to reselect it after the list is repopulated. To do this we
    // fuzzy match the objects by requiring either the name or the value to be
    // the same.
    if (selected) {
      index = -1;
      for (let i = 0; i < listLength; ++i) {
        const item = this.filteredListItems[i];
        const namesMatch = (item.name === selected.name);
        const valuesMatch = (item.value && (item.value === selected.value));
        const dirsMatch = (item.isDir === selected.isDir);
        const keysMatch = (item.isKey === selected.isKey);

        if ((namesMatch || valuesMatch) && dirsMatch && keysMatch) {
          index = i;
          // If we've matched on name, we're confident to stop.
          if (namesMatch) {
            break;
          }
        }
      }

      if (index === -1) {
        // We've deleted the last item in the list, place cursor at the end.
        if (selectedIndex === listLength) {
          index = listLength - 1;
        }

        // Place the cursor back where it was if that position is still valid.
        // Note, selected index should never be greater than listLength since
        // only one element can be deleted at a time.
        else {
          index = selectedIndex;
        }
      }
    }

    this.$.combinedList.selectItem(index);
    this.$.pendingDialog.close()
  }


  pathToString(path) {
    return JSON.stringify(path);
  }


  computeSelectedClass(selected: ListItem): string {
    return (selected) ? 'iron-selected' : '';
  }


  private resetError() {
    this.set('errorMessage', '');
    this.set('errorTitle', '');
  }


  handleError(errorMessage, element: HTMLElement, errorTitle:string = '') {
    this.set('errorMessage', errorMessage);
    this.set('errorTitle', errorTitle);
    if (element) {
      element.focus();
      Polymer.Base.fire('iron-resize', null, {node: element});
    }
    console.error(errorMessage);
  }


  /**
   * Allows the ctrl key to be pressed to change cursor between copy/move.
   */
  @listen('dragover')
  onDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = (event.ctrlKey) ? 'copy' : 'move';
  }


  @listen('dragstart')
  startDrag(event) {
    // Detect start of drag event, grab info about target.
    const target = event.target.closest('.row');
    const data = {
      path: this.path,
      name: target.name,
      kind: target.kind
    };
    event.dataTransfer.setData('text', JSON.stringify(data));
    event.dataTransfer.effectAllowed = 'copyMove';
  }


  onDirDragOver(event) {
    event.currentTarget.classList.add('over');
  }


  onDirDragLeave(event) {
    event.currentTarget.classList.remove('over');
  }


  /**
   * Behaviour for dropping on folders.
   */
  dirDrop(event) {
    const newPath: string[] = this.path.slice();
    newPath.push(event.target.closest('div').name);
    this.performDrop(newPath, event);
  }


  /**
   * Handles folders dropped not into folders.
   */
  @listen('drop')
  handleDrop(event) {
    this.performDrop(this.path, event);
  }


  performDrop(path: string[], event): void {
    event.stopPropagation();
    event.preventDefault();

    const data = JSON.parse(event.dataTransfer.getData('text'));
    this.$.dragDialog.dragData = data;
    event.target.closest('div').classList.remove('over');

    this.$.dragNameInput.value = data.name;
    this.$.dragClass.textContent = data.kind;
    this.$.originName.textContent = data.name;
    this.$.originPath.textContent = JSON.stringify(data.path);
    this.$.dragPathInput.value = this.pathToString(path);

    if (event.ctrlKey || event.button == 2) {
      this.$.dragOp.innerText = 'Copy';
    } else if (JSON.stringify(path) != JSON.stringify(data.path)) {
      this.$.dragOp.innerText = 'Move';
    } else {
      return;
    }

    this.$.dragDialog.open();
  }


  /**
   * Bind event listeners to resize dialog box appropriately when an
   * `iron-autogrow-textarea` is used.
   *
   * This works around an issue where it does not fire an `iron-resize` event
   * when the value updates, and hence a `paper-dialog` is not informed to
   * update its size or position to accomodate the change in content size.
   */
  bindIronAutogrowTextAreaResizeEvents(paperDialog: HTMLElement,
                                       ironAutogrowTextarea: HTMLElement) {
    ironAutogrowTextarea.addEventListener('bind-value-changed', () => {
      Polymer.Base.fire('iron-resize', null, {node: ironAutogrowTextarea});
    });
  }


  /**
   * Launch new key dialog.
   */
  newKeyClicked() {
    const dialog = this.$.newKeyDialog,
          newKeyElem = this.$.newKeyInput,
          newValueElem = this.$.newValueInput;
    newKeyElem.value = '';
    newValueElem.value = '';
    dialog.open();
  }


  /**
   * Create new key.
   */
  async doNewKey() {
    const newKey = this.$.newKeyInput.value;
    const newVal = this.$.newValueInput.value;

    if (newKey) {
      try {
        await this.socket.set({path: this.path, key: newKey, value: newVal});
        this.$.newKeyDialog.close();
      } catch (error) {
        this.handleError(error.message, this.$.newValueInput, 'Invalid Value');
      }
    } else {
      this.handleError('Cannot create a key with an empty name.',
                       this.$.newKeyInput, 'Invalid Name');
    }
  }


  private editValueSelected() {
    const item = this.selected;
    const dialog = this.$.editValueDialog;
    const editValueElem = this.$.editValueInput;

    this.$.editValueName.innerText = item.name;
    editValueElem.value = item.prettyValue;
    dialog.keyName = item.name;
    dialog.open();
  }


  /**
   * Launch the value edit dialog.
   */
  editValueClicked(event) {
    const dialog = this.$.editValueDialog,
          editValueElem = this.$.editValueInput,
          target = event.target.closest('.row'),
          name = target.name,
          value = target.value,
          isKey = target.isKey;

    this.$.editValueName.innerText = name;

    if (!isKey) {
      return;
    }

    editValueElem.value = value;
    dialog.keyName = name;
    dialog.open();
  }


  /**
   * Submit the edited value to the server.
   */
  async doEditValue() {
    const key = this.$.editValueDialog.keyName,
          newVal = this.$.editValueInput.value;
    try {
      await this.socket.set({path: this.path, key: key, value: newVal});
      this.$.editValueDialog.close();
    } catch (error) {
      this.handleError(error.message, this.$.editValueInput, 'Invalid Value');
    }
  }


  /**
   * Launch new folder dialog.
   */
  newFolderClicked() {
    const dialog = this.$.newFolderDialog,
          newFolderElem = this.$.newFolderInput;
    newFolderElem.value = '';
    dialog.open();
  }


  /**
   * Create new folder.
   */
  async doNewFolder() {
    const newFolder = this.$.newFolderInput.value;

    if (newFolder) {
      try {
        await this.socket.mkDir({path: this.path, dir: newFolder});
        this.$.newFolderDialog.close();
      } catch (error) {
        this.handleError(error.message, this.$.newFolderInput, 'Invalid Value');
      }
    }
    else {
      this.handleError('Cannot create folder with empty name',
                       this.$.newFolderInput, 'Invalid Value');
    }
  }


  /**
   * Launch copy dialog.
   */
  copyClicked() {
    const dialog = this.$.copyDialog,
          copyNameElem = this.$.copyNameInput,
          copyPathElem = this.$.copyPathInput;
    copyNameElem.value = this.selected.name;
    copyPathElem.value = this.pathToString(this.path);
    dialog.open();
  }


  /**
   * Copy the selected key or folder.
   */
  async doCopy() {
    const newName = this.$.copyNameInput.value;
    const name = this.selected.name;

    try {
      const newPath = JSON.parse(this.$.copyPathInput.value);
      if (this.selected.isDir) {
        this.$.pendingDialog.open();
        this.$.pendingOp.innerText = 'Copying...';
        await this.socket.copyDir({
          path: this.path,
          dir: name,
          newPath: newPath,
          newDir: newName
        });
      } else if (this.selected.isKey) {
        await this.socket.copy({
          path: this.path,
          key: name,
          newPath: newPath,
          newKey: newName
        });
      }
      this.$.copyDialog.close();
    } catch (error) {
      this.handleError(error.message, this.$.copyPathInput, 'Invalid Path');
    }
    this.$.pendingDialog.close();
  }


  /**
   * Execute the drag operation.
   */
  async doDragOp() {
    const newName = this.$.dragNameInput.value;
    const oldName = this.$.originName.textContent;
    const dragType = (this.$.dragOp.innerText === 'Copy') ? 'copy' : 'move';

    try {
      const oldPath = JSON.parse(this.$.originPath.textContent);
      const newPath = JSON.parse(this.$.dragPathInput.value);

      this.$.pendingOp.innerText = (dragType === "copy") ? 'Copying...' : 'Moving...';
      this.$.pendingDialog.open();

      switch (this.$.dragDialog.dragData['kind']) {
        case 'dir':
          if (dragType === "copy") {
            await this.socket.copyDir({path: oldPath, dir: oldName, newPath: newPath, newDir: newName});
          } else {
            await this.socket.moveDir({path: oldPath, dir: oldName, newPath: newPath, newDir: newName});
          }
          break;

        case 'key':
          if (dragType === "copy") {
            await this.socket.copy({path: oldPath, key: oldName, newPath: newPath, newKey: newName});
          } else {
            await this.socket.move({path: oldPath, key: oldName, newPath: newPath, newKey: newName});
          }
          break;
      }

      if (dragType === "copy") {
        this.$.toastCopySuccess.show();
      } else {
        this.$.toastMoveSuccess.show();
      }
      this.$.dragDialog.close();
    } catch (error) {
      this.handleError(error.message, this.$.dragPathInput, 'Invalid Path');
    }
    this.$.pendingDialog.close();
  }


  /**
   * Launch rename dialog.
   */
  renameClicked() {
    const dialog = this.$.renameDialog,
          renameElem = this.$.renameInput,
          name = this.selected.name;
    renameElem.value = name;
    dialog.open();
  }

  /**
   * Rename the selected key or folder.
   */
  async doRename() {
    // TODO(maffoo) Add pending modal dialog for renames since they are copy
    // commands and take a long time.
    const newName = this.$.renameInput.value,
          name = this.selected.name;

    if (newName === null || newName === name) {
      this.handleError("The new name cannot be the same as the old name.",
                       this.$.renameInput, "Invalid Name");
      return;
    }

    if (!newName) {
      this.handleError(`Cannot rename ${this.selected.kind} to empty string`,
                       this.$.renameInput, "Invalid Name");
      return;
    }

    try {
      if (this.selected.isDir) {
        await this.socket.renameDir({path: this.path, dir: name, newDir: newName});
      } else if (this.selected.isKey) {
        await this.socket.rename({path: this.path, key: name, newKey: newName});
      }
      this.$.renameDialog.close();
    } catch (error) {
      this.handleError(error.message, this.$.renameInput, "Invalid Name");
    }
  }


  /**
   * Launch the delete confirmation dialog.
   */
  deleteClicked() {
    this.$.deleteDialog.open();
  }


  /**
   * Delete the selected key or folder.
   */
  async doDelete() {
    try {
      if (this.selected.isDir) {
        this.$.pendingDialog.open();
        this.$.pendingOp.innerText = 'Deleting...';
        await this.socket.rmDir({path: this.path, dir: this.selected.name});
      } else if (this.selected.isKey) {
        await this.socket.del({path: this.path, key: this.selected.name});
      }
      this.$.deleteDialog.close();
    } catch (error) {
      this.handleError(error.message, null, "Invalid Delete");
    }
    this.$.pendingDialog.close();
  }
}
