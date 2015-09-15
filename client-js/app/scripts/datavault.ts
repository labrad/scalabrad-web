import {Observable} from './observable';
import * as rpc from './rpc';

export interface DataVaultListing {
  path: Array<string>;
  dirs: Array<string>;
  datasets: Array<string>;
}

export interface DatasetInfo {
  path: Array<string>;
  name: string;
  num: number;
  independents: Array<string>;
  dependents: Array<string>;
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

  dataAvailable: Observable<void>;
  newParameter: Observable<void>;
  commentsAvailable: Observable<void>;

  dir(path: Array<string>): Promise<DataVaultListing>;
  datasetInfo(params: {path: Array<string>; dataset: number}): Promise<DatasetInfo>;
  data(params: {limit: number, startOver: boolean}): Promise<Array<Array<number>>>;
}

export class DataVaultService extends rpc.RpcService implements DataVaultApi {

  newDir = new Observable<{name: string}>();
  newDataset = new Observable<{name: string}>();
  tagsUpdated = new Observable<TagsMessage>();

  dataAvailable = new Observable<void>();
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

  data(params: {limit?: number, startOver: boolean}): Promise<Array<Array<number>>> {
    params.limit = params.limit || 1000;
    return this.call<Array<Array<number>>>('data', params);
  }
}
