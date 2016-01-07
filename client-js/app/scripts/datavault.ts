import {Observable} from './observable';
import * as rpc from './rpc';

export interface DataVaultListing {
  path: Array<string>;
  dirs: Array<{name: string; tags: Array<string>}>;
  datasets: Array<{name: string; tags: Array<string>}>;
}

export interface DatasetInfo {
  path: Array<string>;
  name: string;
  num: number;
  independents: Array<{label: string; unit: string}>;
  dependents: Array<{label: string; legend: string; unit: string}>;
  params: Array<{name: string; value: string}>;
}

export interface TagsMessage {
  dirTags: {[name: string]: Array<string>};
  datasetTags: {[name: string]: Array<string>};
}

export interface DataVaultApi {
  newDir: Observable<{name: string}>;
  newDataset: Observable<{name: string}>;
  tagsUpdated: Observable<TagsMessage>;

  dataAvailable: Observable<{token: string}>;
  newParameter: Observable<void>;
  commentsAvailable: Observable<void>;

  dir(path: Array<string>): Promise<DataVaultListing>;
  datasetInfo(params: {path: Array<string>; dataset: number}): Promise<DatasetInfo>;

  dataStreamOpen(params: {token: string; path: Array<string>; dataset: number}): Promise<void>;
  dataStreamGet(params: {token: string; limit?: number}): Promise<Array<Array<number>>>;
  dataStreamClose(params: {token: string}): Promise<void>;

  updateTags(params: {path: Array<string>; name: string; isDir: boolean; tags: Array<string>}): Promise<void>;
}

export class DataVaultService extends rpc.RpcService implements DataVaultApi {

  newDir = new Observable<{name: string}>();
  newDataset = new Observable<{name: string}>();
  tagsUpdated = new Observable<TagsMessage>();

  dataAvailable = new Observable<{token: string}>();
  newParameter = new Observable<void>();
  commentsAvailable = new Observable<void>();

  constructor(socket: rpc.JsonRpcSocket) {
    super(socket, 'org.labrad.datavault.');
    this.connect('org.labrad.datavault.newDir', this.newDir);
    this.connect('org.labrad.datavault.newDataset', this.newDataset);
    this.connect('org.labrad.datavault.tagsUpdated', this.tagsUpdated);
    this.connect('org.labrad.datavault.dataAvailable', this.dataAvailable);
    this.connect('org.labrad.datavault.newParameter', this.newParameter);
    this.connect('org.labrad.datavault.commentsAvailable', this.commentsAvailable);
  }

  dir(path: Array<string>): Promise<DataVaultListing> {
    return this.call<DataVaultListing>('dir', [path]);
  }

  datasetInfo(params: {path: Array<string>; dataset: number}): Promise<DatasetInfo> {
    return this.call<DatasetInfo>('datasetInfo', params);
  }

  dataStreamOpen(params: {token: string; path: Array<string>; dataset: number}): Promise<void> {
    return this.call<void>('dataStreamOpen', params);
  }

  dataStreamGet(params: {token: string; limit?: number}): Promise<Array<Array<number>>> {
    return this.call<Array<Array<number>>>('dataStreamGet', params);
  }

  dataStreamClose(params: {token: string}): Promise<void> {
    return this.call<void>('dataStreamClose', params);
  }

  updateTags(params: {name: string; isDir: boolean; tags: Array<string>}): Promise<void> {
    return this.call<void>('updateTags', params);
  }
}

export function datasetNumber(name: string): number {
  return Number(name.split(" - ")[0]);
}

export function makeAxisLabel(variable: {label: string; unit: string}): string {
  if (variable.unit) {
    return `${variable.label} [${variable.unit}]`;
  }
  return variable.label;
}
