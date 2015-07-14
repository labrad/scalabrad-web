import promise = require('es6-promise');
import rpc = require('./rpc');

var Promise = promise.Promise;

export interface DataVaultListing {
  path: Array<string>;
  dirs: Array<string>;
  datasets: Array<string>;
}

export interface DataVaultApi {
  dir(path: Array<string>): Promise<DataVaultListing>;
}

export class DataVaultService extends rpc.RpcService implements DataVaultApi {

  constructor(socket: rpc.JsonRpcSocket) {
    super(socket, 'org.labrad.datavault.');
  }

  dir(path: Array<string>): Promise<DataVaultListing> {
    return this.call<DataVaultListing>('dir', [path]);
  }
}
