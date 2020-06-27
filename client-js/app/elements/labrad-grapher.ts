import {PolymerElement, html} from "@polymer/polymer";
import {customElement, property} from "@polymer/decorators";

import * as datavault from '../scripts/datavault';
import {Places} from '../scripts/places';
import "@polymer/iron-list/iron-list.js"

const THROTTLE_DELAY_SELECTED_DATASET = 100;

type ListItem = {
  id: string,
  name: string,
  url: string,
  isDir: boolean,
  isDataset: boolean,
  isParent: boolean,
  starred: boolean,
  trashed: boolean
};

type ListItemFilterFunction = (item: ListItem) => boolean;

@customElement('labrad-grapher')
export class LabradGrapher extends PolymerElement {

  static get template(): HTMLTemplateElement {
    return html`
      <style>
        :host {
          height: 100%;
          overflow: hidden;
          display: flex;
        }
        table {
          width: 100%;
          border-collapse: collapse;
        }
        .label-wide {
          width: 100%;
          min-width: 60px;
          text-align: right;
        }
        dir-item {
          white-space: nowrap;
        }
        #outer {
          flex: 1;
        }
        #container {
          display: flex;
          flex-direction: row;
          height: 100%;
        }
        #left-column {
          flex-basis: 20%;
          flex-grow: 1;
          border-right: 1px solid #AAA;
        }
        #buttons {
          height: 50px;
        }
        #buttons paper-icon-button {
          margin: 5px;
        }
        #listing iron-icon {
          margin: 5px;
        }
        #listing iron-icon.folder {
          color: #CFBA78;
        }
        #listing iron-icon.dataset {
          color: #209131;
        }
        #listing iron-icon.star {
          color: #FF2299;
        }
        #listing iron-icon.trash {
          color: #773300;
        }
        #right-column {
          flex-basis: 80%;
          flex-grow: 0;
        }
        #right-column .paper-header {
          min-height: 50px;
        }
        #right-column .paper-header h1 {
          margin: 5px 18px 0px 18px;
          font-size: 24px;
          line-height: 45px;
        }
        #params thead th {
          background-color: #673AB7;
          color: white;
          padding: 0.5em;
        }
        #params tbody td {
          padding-top: 0.5em;
          padding-bottom: 0.5em;
          vertical-align: top;
        }
        #params tbody tr:nth-of-type(odd) {
          background-color: #EEEEEE;
        }
        #params tbody td.value {
          word-wrap: break-word;
          word-break: break-all;
        }
        #params th,td {
          padding-left: 0.7em;
          padding-right: 0.7em;
        }
        .monospace {
          font-family: "Roboto Mono", "Roboto", sans-serif;
          text-overflow: ellipsis;
          font-size: 12px;
        }
        .row {
          cursor: pointer;
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
        .row.iron-selected {
          background-color: #ccc;
        }
        #listing {
          min-width: 375px;
        }
        .row {
          display: flex;
          flex-direction: row;
          flex-wrap: no-wrap;
        }
        .label-wide {
          width: auto;
          margin-left: auto;
        }
        .item a {
          text-decoration: none;
        }
        .item a span {
          text-decoration: underline;
        }
        .item .back-link,
        .item .back-link:visited {
          color: #555;
        }
        .item .back-link:hover,
        .item .back-link:visited:hover {
          color: #3f51b5;
        }
      </style>
      <iron-a11y-keys target="[[target]]" keys="up:keydown down:keydown"
                    on-keys-pressed="cursorMove"></iron-a11y-keys>
      <iron-a11y-keys target="[[target]]" keys="right enter"
                      on-keys-pressed="cursorTraverse"></iron-a11y-keys>
      <iron-a11y-keys target="[[target]]" keys="left backspace"
                      on-keys-pressed="cursorBack"></iron-a11y-keys>
      <div id="outer">
        <div id="container">
          <paper-header-panel id="left-column">
            <div class="paper-header" id="buttons">
              <paper-icon-button icon="star" id="star" on-click="starClicked" title="Show Only Starred Items"></paper-icon-button>
              <paper-icon-button icon="delete" id="trash" on-click="trashClicked" title="Show Trashed Items"></paper-icon-button>
            </div>
            <div id="listing">
              <iron-list items="{{filteredListItems}}"
                        id="combinedList"
                        as="item" class='fit'
                        selected-item="{{selected}}"
                        selection-enabled>
                <template>
                  <div class$='row [[computeSelectedClass(selected)]]'>
                    <div class="item">
                      <template is="dom-if" if="[[item.isParent]]">
                        <a class='back-link' is="app-link" path="[[item.url]]" href="[[item.url]]">
                          <iron-icon icon="arrow-back" item-icon></iron-icon>
                          <span>[[item.name]]</span>
                        </a>
                      </template>
                      <template is="dom-if" if="[[item.isDir]]">
                        <a is="app-link" path="[[item.url]]" href="[[item.url]]">
                          <iron-icon icon="folder" item-icon class="folder"></iron-icon>
                          <span>[[item.name]]</span>
                        </a>
                      </template>
                      <template is="dom-if" if="[[item.isDataset]]">
                        <a is="app-link" path="[[item.url]]" href="[[item.url]]">
                          <iron-icon icon="editor:insert-chart" item-icon class="dataset"></iron-icon>
                          <span>[[item.name]]</span>
                        </a>
                      </template>
                    </div>
                    <div class="label-wide">
                      <template is="dom-if" if="[[item.starred]]">
                        <iron-icon icon="star" class="star"></iron-icon>
                      </template>
                      <template is="dom-if" if="[[item.trashed]]">
                        <iron-icon icon="delete" class="trash"></iron-icon>
                      </template>
                    </div>
                  </div>
                </template>
              </iron-list>
            </div>
          </paper-header-panel>
          <paper-header-panel id="right-column">
            <div class="paper-header">
              <h1>{{selectedDataset}}</h1>
            </div>
            <div id="params">
              <template is="dom-if" if="{{selectedDataset}}">
                <table>
                  <thead>
                    <tr><th colspan="3">Independents</th></tr>
                  </thead>
                  <tbody>
                  <template is="dom-repeat" items="{{selectedDatasetInfo.independents}}">
                    <tr>
                      <td class="monospace">{{item.label}}</td>
                      <td></td>
                      <td class="monospace">{{item.unit}}</td>
                    </tr>
                  </template>
                  </tbody>

                  <thead>
                    <tr class="header-row"><th colspan="3">Dependents</th></tr>
                  </thead>
                  <tbody>
                  <template is="dom-repeat" items="{{selectedDatasetInfo.dependents}}">
                    <tr>
                      <td class="monospace">{{item.label}}</td>
                      <td class="monospace">{{item.legend}}</td>
                      <td class="monospace">{{item.unit}}</td>
                    </tr>
                  </template>
                  </tbody>
                </table>

                <table>
                  <thead>
                    <tr class="header-row"><th colspan="2">Parameters</th></tr>
                  </thead>
                  <tbody>
                  <template is="dom-repeat" items="{{selectedDatasetInfo.params}}">
                    <tr>
                      <td class="monospace">{{item.name}}</td>
                      <td class="monospace value">{{item.value}}</td>
                    </tr>
                  </template>
                  </tbody>
                </table>
              </template>
            </div>
          </paper-header-panel>
        </div>
      </div>
      <paper-dialog id="errorDialog" modal>
        <h1>Unable to connect to Data Vault</h1>
        <div>
          <span>{{connectionError}}</span>
        </div>
        <div class="buttons">
          <paper-button dialog-dismiss>Close</paper-button>
        </div>
      </paper-dialog>
    `;
  }

  @property({type: Array, notify: true})
  path: string[];

  @property({type: Array, value: () => []})
  dirs: {name: string; url: string; tags: string[]}[];

  @property({type: Array, value: () => []})
  datasets: {name: string; url: string; tags: string[]}[];

  @property({type: Array, value: () => []})
  filteredListItems: ListItem[];

  @property({type: Array, value: () => []})
  private listItems: ListItem[];

  @property({type: Object, notify: true})
  selected: ListItem;

  @property({type: String})
  selectedDataset: string = "";

  @property({type: Object})
  selectedDatasetInfo: datavault.DatasetInfo = null;

  @property({type: Object})
  places: Places;

  @property({type: Object})
  api: datavault.DataVaultApi;

  @property({type: String})
  connectionError: string;

  selectedThrottleTimeout: number = null;

  target: HTMLElement = document.body;

  private showStars: boolean = false;
  private showTrash: boolean = false;

  attached(): void {
    this.tabIndex = 0;
    this.showStars = false;
    this.showTrash = false;
    this.updateButtons();

    this.initializeListItems(
      this.path,
      this.dirs,
      this.datasets);
    this.applyFilterToListItems();

    this.$.combinedList.selectItem(this.getDefaultSelectedItem());
  }


  getDefaultSelectedItem(): number {
    return this.path.length > 0 ? 1 : 0;
  }


  getSelectedIndex() {
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


  cursorMove(e) {
    const length = this.filteredListItems.length;
    const selectedIndex = this.getSelectedIndex();
    const list = this.$.combinedList;

    switch (e.detail.combo) {
      case 'up':
        if (selectedIndex !== null && selectedIndex !== 0) {
          list.selectItem(selectedIndex - 1);
          this.scrollToIndex(selectedIndex - 1);
        }
        break;

      case 'down':
        if (selectedIndex === null) {
          list.selectItem(0);
          this.scrollToIndex(0);
        } else if (selectedIndex < length - 1) {
          list.selectItem(selectedIndex + 1);
          this.scrollToIndex(selectedIndex + 1);
        }
        break;

      default:
        // Nothing to do.
        break;
    }
  }


  cursorTraverse(e) {
    if (this.getSelectedIndex() === null) {
      return;
    }

    const item = this.$.combinedList.selectedItem;

    // If we have an item, we want to traverse down.
    if (item) {
      this.fire('app-link-click', {path: item.url});
    }
  }


  cursorBack(e) {
    if (this.path.length === 0) {
      return;
    }

    const parentPath = this.path.slice(0, -1);
    const parentUrl = this.places.grapherUrl(parentPath);
    this.fire('app-link-click', {path: parentUrl});
  }


  starClicked(): void {
    this.showStars = !this.showStars;
    if (this.showStars) this.showTrash = false;
    this.updateButtons();
    this.applyFilterToListItems();
  }

  trashClicked(): void {
    this.showTrash = !this.showTrash;
    if (this.showTrash) this.showStars = false;
    this.updateButtons();
    this.applyFilterToListItems();
  }

  updateButtons(): void {
    this.$.star.style.color = this.showStars ? 'black' : '#AAAAAA';
    this.$.trash.style.color = this.showTrash ? 'black' : '#AAAAAA';
  }

  computeSelectedClass(selected: boolean): string {
    return (selected) ? "iron-selected" : "";
  }

  openUnableToConnectDialog(connectionError: string): void {
    this.connectionError = connectionError;
    this.$.errorDialog.open();
  }

  @listen("keypress")
  onKeyPress(event): void {
    if (!this.selected) return;
    const selectedIndex = this.getSelectedIndex();
    const id = this.selected.id;

    if (!id) return;
    switch (event.charCode) {
      case 115 /* s */:
        if (id.startsWith('dir:')) {
          this.api.updateTags({
            path: this.path,
            name: id.substring(4),
            isDir: true,
            tags: ['^star']
          });
        } else if (id.startsWith('dataset:')) {
          this.api.updateTags({
            path: this.path,
            name: id.substring(8),
            isDir: false,
            tags: ['^star']
          });
        }
        this.set(`filteredListItems.${selectedIndex}.starred`,
                 !this.selected.starred);
        break;

      case 116 /* t */:
        if (id.startsWith('dir:')) {
          this.api.updateTags({
            path: this.path,
            name: id.substring(4),
            isDir: true,
            tags: ['^trash']
          });
        } else if (id.startsWith('dataset:')) {
          this.api.updateTags({
            path: this.path,
            name: id.substring(8),
            isDir: false,
            tags: ['^trash']
          });
        }
        this.set(`filteredListItems.${selectedIndex}.trashed`,
                 !this.selected.trashed);

        // Whenever we toggle trash, it will be removed from the view.
        const filterFunction = this.filterListItemsFunction();
        if (!filterFunction(this.selected)) {
          this.splice('filteredListItems', selectedIndex, 1);
        }
        break;
    }
  }

  newDir(dir: {name: string; url: string; tags: string[]}): void {
    this.addItemToList({
      id: 'dir:' + dir.name,
      name: dir.name,
      url: dir.url,
      isDir: true,
      isDataset: false,
      isParent: false,
      starred: this.isTagged(dir, 'star'),
      trashed: this.isTagged(dir, 'trash')
    });
  }

  newDataset(dataset: {name: string; url: string; tags: string[]}): void {
    this.addItemToList({
      id: 'dataset:' + dataset.name,
      name: dataset.name,
      url: dataset.url,
      isDir: false,
      isDataset: true,
      isParent: false,
      starred: this.isTagged(dataset, 'star'),
      trashed: this.isTagged(dataset, 'trash')
    });
  }

  private initializeListItems(
      path: string[],
      dirs: {name: string; url: string; tags: string[]}[],
      datasets: {name: string; url: string; tags: string[]}[]): void {
    if (path.length > 0 && this.places) {
      this.push('listItems', {
        id: '..',
        name: '..',
        url: this.places.grapherUrl(path.slice(0, -1)),
        isDir: false,
        isDataset: false,
        isParent: true,
        starred: false,
        trashed: false
      });
    }

    for (let dir of dirs) {
      this.newDir(dir);
    }

    for (let dataset of datasets) {
      this.newDataset(dataset);
    }
  }

  private addItemToList(item: ListItem): void {
    this.push('listItems', item);
    const filterFunction = this.filterListItemsFunction();
    if (filterFunction(item)) {
      this.push('filteredListItems', item);
    }
  }

  private filterListItemsFunction(): ListItemFilterFunction {
    // Return all items including those that are trashed.
    if (this.showTrash) {
      return (x) => true;
    }

    // Return starred and parent items, no trash.
    if (this.showStars) {
      return (x) => ((x.starred && !x.trashed) || x.isParent);
    }

    // Return all items except trash.
    return (x) => (!x.trashed || x.isParent);
  }

  private applyFilterToListItems(): void {
    // Will cause the `iron-list` view to scroll (jump) to the top when
    // rendering even if no changes to the filter are applied. Only use when
    // this behavior is desired, such as swapping filtering modes.
    const filterFunction = this.filterListItemsFunction();
    this.set('filteredListItems', this.listItems.filter(filterFunction));
  }

  private isTagged(item: {tags: string[]}, tag: string): boolean {
    for (let t of item.tags) {
      if (t === tag) return true;
    }
    return false;
  }

  @observe('selected')
  updateSelectedDataset(): void {
    if (this.selectedThrottleTimeout) {
      clearTimeout(this.selectedThrottleTimeout);
    }

    this.selectedThrottleTimeout = setTimeout(() => {
      this.selectedDataset = "";
      if (!this.selected) {
        return;
      }

      const id = this.selected.id;
      if (id.startsWith('dataset:')) {
        const name = id.substring(8);
        this.selectedDataset = name;
        this.fetchInfo(name);
      }
    }, THROTTLE_DELAY_SELECTED_DATASET);
  }

  async fetchInfo(name: string) {
    const info = await this.api.datasetInfo({
      path: this.path,
      dataset: datavault.datasetNumber(name),
      includeParams: true
    });
    this.selectedDatasetInfo = info;
  }
}
