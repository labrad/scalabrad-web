import * as datavault from '../scripts/datavault';

@component('labrad-grapher')
export class LabradGrapher extends polymer.Base {
  @property({type: Array, notify: true})
  dirs: Array<{name: string; url: string}>;

  @property({type: Array, notify: true})
  datasets: Array<{name: string; url: string}>;

  @property({type: Array, notify: true})
  path: Array<string>;

  @property({type: Array, notify: true})
  selectedIdx: number;

  @property({type: Object})
  selectedDatasetInfo: datavault.DatasetInfo = null;

  @property({type: Object})
  api: datavault.DataVaultApi;

  @computed()
  selectedDataset(selectedIdx: number): string {
    if (selectedIdx < this.dirs.length) {
      return "";
    } else {
      return this.datasets[selectedIdx - this.dirs.length].name;
    }
  }

  @observe('selectedDataset')
  async selectedDatasetChanged(newDataset: string, oldDataset: string) {
    console.log('selectedDatasetChanged', newDataset);
    if (newDataset) {
      var info = await this.api.datasetInfo({
        path: this.path,
        dataset: datavault.datasetNumber(newDataset)
      });
      this.selectedDatasetInfo = info;
    }
  }
}
