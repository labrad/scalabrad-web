import * as datavault from '../scripts/datavault';
import {Places} from '../scripts/places';

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

@component('labrad-grapher')
export class LabradGrapher extends polymer.Base {
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

  @property({type: Object})
  selectedDatasetInfo: datavault.DatasetInfo = null;

  @property({type: Object})
  places: Places;

  @property({type: Object})
  api: datavault.DataVaultApi;

  @property({type: String})
  connectionError: string;

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


  scrollToIndex(index: number) {
    const list = this.$.combinedList;
    const first = list.firstVisibleIndex;
    const last = list.lastVisibleIndex;

    if (index < first) {
      list.scrollToIndex(index);
    } else if (index >= last) {
      list.scrollToIndex(index - (last - first - 1));
    }
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

  @computed()
  selectedDataset(selected: {id: string}): string {
    if (!selected) {
      return "";
    }

    if (selected.id.startsWith('dataset:')) {
      const name = selected.id.substring(8);
      this.fetchInfo(name);
      return name;
    } else {
      return "";
    }
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
