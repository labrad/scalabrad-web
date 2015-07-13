import promise = require('es6-promise');

import rpc = require("./rpc");

var Promise = promise.Promise;

export interface RegistryListing {
  path: Array<string>;
  dirs: Array<string>;
  keys: Array<string>;
  vals: Array<string>;
}

export interface RegistryApi {
  dir(params: {path: Array<string>}): Promise<RegistryListing>;
  set(params: {path: Array<string>; key: string; value: string}): Promise<RegistryListing>;
  del(params: {path: Array<string>; key: string}): Promise<RegistryListing>;

  mkDir(params: {path: Array<string>; dir: string}): Promise<RegistryListing>;
  rmDir(params: {path: Array<string>; dir: string}): Promise<RegistryListing>;

  rename(params: {path: Array<string>; key: string; newKey: string}): Promise<RegistryListing>;
  copy(params: {path: Array<string>; key: string; newPath: Array<string>; newKey: string}): Promise<RegistryListing>;
  move(params: {path: Array<string>; key: string; newPath: Array<string>; newKey: string}): Promise<RegistryListing>;

  renameDir(params: {path: Array<string>; dir: string; newDir: string}): Promise<RegistryListing>;
  copyDir(params: {path: Array<string>; dir: string; newPath: Array<string>; newDir: string}): Promise<RegistryListing>;
  moveDir(params: {path: Array<string>; dir: string; newPath: Array<string>; newDir: string}): Promise<RegistryListing>;
}

export class RegistryServiceJsonRpc extends rpc.RpcService implements RegistryApi {

  constructor(socket: rpc.JsonRpcSocket) {
    super(socket, "org.labrad.registry.");
  }

  dir(params: {path: Array<string>}): Promise<RegistryListing> {
    return this.call<RegistryListing>('dir', params);
  }
  set(params: {path: Array<string>; key: string; value: string}): Promise<RegistryListing> {
    return this.call<RegistryListing>('set', params);
  }
  del(params: {path: Array<string>; key: string}): Promise<RegistryListing> {
    return this.call<RegistryListing>('del', params);
  }

  mkDir(params: {path: Array<string>; dir: string}): Promise<RegistryListing> {
    return this.call<RegistryListing>('mkDir', params);
  }
  rmDir(params: {path: Array<string>; dir: string}): Promise<RegistryListing> {
    return this.call<RegistryListing>('rmDir', params);
  }

  rename(params: {path: Array<string>; key: string; newKey: string}): Promise<RegistryListing> {
    return this.call<RegistryListing>('rename', params);
  }
  copy(params: {path: Array<string>; key: string; newPath: Array<string>; newKey: string}): Promise<RegistryListing> {
    return this.call<RegistryListing>('copy', params);
  }
  move(params: {path: Array<string>; key: string; newPath: Array<string>; newKey: string}): Promise<RegistryListing> {
    return this.call<RegistryListing>('move', params);
  }

  renameDir(params: {path: Array<string>; dir: string; newDir: string}): Promise<RegistryListing> {
    return this.call<RegistryListing>('renameDir', params);
  }
  copyDir(params: {path: Array<string>; dir: string; newPath: Array<string>; newDir: string}): Promise<RegistryListing> {
    return this.call<RegistryListing>('copyDir', params);
  }
  moveDir(params: {path: Array<string>; dir: string; newPath: Array<string>; newDir: string}): Promise<RegistryListing> {
    return this.call<RegistryListing>('moveDir', params);
  }
}

