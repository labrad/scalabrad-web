import * as datavault from '../scripts/datavault';
import {Places} from '../scripts/places';
import {ListBuilder} from '../scripts/listbuilder';
import {IronIconBakery} from '../scripts/ironiconbakery';

@component('labrad-grapher')
export class LabradGrapher extends polymer.Base {
  @property({type: Array, notify: true})
  path: Array<string>;

  @property({type: Array})
  dirs: Array<{name: string; url: string; tags: Array<string>}>;

  @property({type: Array})
  datasets: Array<{name: string; url: string; tags: Array<string>}>;

  @property({type: String, notify: true})
  selectedId: string;

  @property({type: Object})
  selectedDatasetInfo: datavault.DatasetInfo = null;

  @property({type: Number, value: 0})
  kick: number;

  @property({type: Object})
  places: Places;

  @property({type: Object})
  api: datavault.DataVaultApi;

  private showStars: boolean = false;
  private showTrash: boolean = false;
  private iconBakery: IronIconBakery = new IronIconBakery('labrad-grapher');
  private listBuilder: ListBuilder = new ListBuilder();

  attached() {
    this.tabIndex = 0;
    this.showStars = false;
    this.showTrash = false;
    this.updateButtons();
    this.updateList();
  }

  updateList() {
    const element = Polymer.dom(document.getElementById('selectable-table'));
    requestAnimationFrame(() => {
      while (element.firstElementChild) {
        element.removeChild(element.firstElementChild);
      }
    });
    const items = this.listItems(
        this.path, this.dirs, this.datasets, this.kick);
    this.listBuilder.render(
        items, element, (item) => this.listItem(item), 50, 250);
  }

  starClicked() {
    this.showStars = !this.showStars;
    if (this.showStars) this.showTrash = false;
    this.updateButtons();
    this.updateList();
    this.kick++;
  }

  trashClicked() {
    this.showTrash = !this.showTrash;
    if (this.showTrash) this.showStars = false;
    this.updateButtons();
    this.updateList();
    this.kick++;
  }

  updateButtons() {
    this.$.star.style.color = this.showStars ? 'black' : '#AAAAAA';
    this.$.trash.style.color = this.showTrash ? 'black' : '#AAAAAA';
  }

  listItem(item: Object) : HTMLElement {
    const tr = document.createElement('tr');
    tr.setAttribute('selid', item.id);

    const td1 = document.createElement('td');
    td1.className = 'item';

    if (item.isParent) {
      td1.appendChild(this.iconBakery.get('arrow-back'));
    }

    if (item.isDir) {
      td1.appendChild(this.iconBakery.get('folder'));
    }

    if (item.isDataset) {
      td1.appendChild(this.iconBakery.get('editor:insert-chart', 'dataset'));
    }

    const aItem = document.createElement('a');
    aItem.setAttribute('path', item.url);
    aItem.setAttribute('href', item.url);
    aItem.text = item.name;
    td1.appendChild(aItem);

    const td2 = document.createElement('td');
    td2.className = 'label-wide';

    if (item.starred) {
      td2.appendChild(this.iconBakery.get('stars'));
    }

    if (item.trashed) {
      td2.appendChild(this.iconBakery.get('trash'));
    }

    tr.appendChild(td1);
    tr.appendChild(td2);

    return tr;
  }

  @listen("keypress")
  onKeyPress(event) {
    var id = this.selectedId;
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
        break;
    }
  }

  listItems(
    path: Array<string>,
    dirs: Array<{name: string; url: string; tags: Array<string>}>,
    datasets: Array<{name: string; url: string; tags: Array<string>}>,
    kick: number
  ) {
    if (!dirs) dirs = [];
    if (!datasets) datasets = [];

    var isTagged = (item: {tags: Array<string>}, tag: string) => {
      for (let t of item.tags) {
        if (t === tag) return true;
      }
      return false;
    }
    var isIncluded = (item: {tags: Array<string>}) => {
      if (this.showStars) return isTagged(item, 'star');
      if (!this.showTrash) return !isTagged(item, 'trash');
      return true;
    }

    var items = [];
    if (path.length > 0 && this.places) {
      items.push({
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
      if (isIncluded(dir)) {
        items.push({
          id: 'dir:' + dir.name,
          name: dir.name,
          url: dir.url,
          isDir: true,
          isDataset: false,
          isParent: false,
          starred: isTagged(dir, 'star'),
          trashed: isTagged(dir, 'trash')
        });
      }
    }
    for (let dataset of datasets) {
      if (isIncluded(dataset)) {
        items.push({
          id: 'dataset:' + dataset.name,
          name: dataset.name,
          url: dataset.url,
          isDir: false,
          isDataset: true,
          isParent: false,
          starred: isTagged(dataset, 'star'),
          trashed: isTagged(dataset, 'trash')
        });
      }
    }

    return items;
  }

  @computed()
  selectedDataset(selectedId: string): string {
    if (selectedId.startsWith('dataset:')) {
      var name = selectedId.substring(8);
      this.fetchInfo(name);
      return name;
    } else {
      return "";
    }
  }

  async fetchInfo(name: string) {
    var info = await this.api.datasetInfo({
      path: this.path,
      dataset: datavault.datasetNumber(name),
      includeParams: true
    });
    this.selectedDatasetInfo = info;
  }
}
