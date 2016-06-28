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
  path: Array<string>;

  @property({type: Array, value: () => { return []; }})
  dirs: Array<{name: string; url: string; tags: Array<string>}>;

  @property({type: Array, value: () => { return []; }})
  datasets: Array<{name: string; url: string; tags: Array<string>}>;

  @property({type: Array, value: () => { return []; }})
  filteredListItems: Array<ListItem>;

  @property({type: Array, value: () => { return []; }})
  private listItems: Array<ListItem>;

  @property({type: Object, notify: true})
  selected: ListItem;

  @property({type: Number, notify: true})
  selectedIndex: number;

  @property({type: Object})
  selectedDatasetInfo: datavault.DatasetInfo = null;

  @property({type: Object})
  places: Places;

  @property({type: Object})
  api: datavault.DataVaultApi;

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

  @listen("keypress")
  onKeyPress(event): void {
    if (!this.selected) return;
    const selectedIndex = this.filteredListItems.indexOf(this.selected);
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

  newDir(dir: {name: string; url: string; tags: Array<string>}): void {
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

  newDataset(dataset: {name: string; url: string; tags: Array<string>}): void {
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
      path: Array<string>,
      dirs: Array<{name: string; url: string; tags: Array<string>}>,
      datasets: Array<{name: string; url: string; tags: Array<string>}>): void {
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
    // Return trashed and parent items
    if (this.showTrash) {
      return (x) => (x.trashed || x.isParent);
    }

    // Return starred and parent items, no trash
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

  private isTagged(item: {tags: Array<string>}, tag: string): boolean {
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
