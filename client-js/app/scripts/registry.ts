import {Observable} from './observable';
import * as rpc from "./rpc";

export interface RegistryListing {
  path: Array<string>;
  dirs: Array<string>;
  keys: Array<string>;
  vals: Array<string>;
}

export interface RegistryApi {
  newItem: Observable<{name: string}>;

  dir(params: {path: Array<string>}): Promise<RegistryListing>;
  set(params: {path: Array<string>; key: string; value: string}): Promise<void>;
  del(params: {path: Array<string>; key: string}): Promise<void>;

  mkDir(params: {path: Array<string>; dir: string}): Promise<void>;
  rmDir(params: {path: Array<string>; dir: string}): Promise<void>;

  rename(params: {path: Array<string>; key: string; newKey: string}): Promise<void>;
  copy(params: {path: Array<string>; key: string; newPath: Array<string>; newKey: string}): Promise<void>;
  move(params: {path: Array<string>; key: string; newPath: Array<string>; newKey: string}): Promise<void>;

  renameDir(params: {path: Array<string>; dir: string; newDir: string}): Promise<void>;
  copyDir(params: {path: Array<string>; dir: string; newPath: Array<string>; newDir: string}): Promise<void>;
  moveDir(params: {path: Array<string>; dir: string; newPath: Array<string>; newDir: string}): Promise<void>;

  watch(params: {path: Array<string>}): Promise<void>;
  unwatch(params: {path: Array<string>}): Promise<void>;
}

export class RegistryServiceJsonRpc extends rpc.RpcService implements RegistryApi {

  newItem = new Observable<{name: string}>();

  constructor(socket: rpc.JsonRpcSocket) {
    super(socket, "org.labrad.registry.");
    this.connect('org.labrad.registry.keyChanged', this.newItem);
    this.connect('org.labrad.registry.keyRemoved', this.newItem);
    this.connect('org.labrad.registry.dirChanged', this.newItem);
    this.connect('org.labrad.registry.dirRemoved', this.newItem);
  }

  dir(params: {path: Array<string>}): Promise<RegistryListing> {
    return this.call<RegistryListing>('dir', params);
  }
  set(params: {path: Array<string>; key: string; value: string}): Promise<void> {
    return this.call<void>('set', params);
  }
  del(params: {path: Array<string>; key: string}): Promise<void> {
    return this.call<void>('del', params);
  }
  mkDir(params: {path: Array<string>; dir: string}): Promise<void> {
    return this.call<void>('mkDir', params);
  }
  rmDir(params: {path: Array<string>; dir: string}): Promise<void> {
    return this.call<void>('rmDir', params);
  }
  rename(params: {path: Array<string>; key: string; newKey: string}): Promise<void> {
    return this.call<void>('rename', params);
  }
  copy(params: {path: Array<string>; key: string; newPath: Array<string>; newKey: string}): Promise<void> {
    return this.call<void>('copy', params);
  }
  move(params: {path: Array<string>; key: string; newPath: Array<string>; newKey: string}): Promise<void> {
    return this.call<void>('move', params);
  }
  renameDir(params: {path: Array<string>; dir: string; newDir: string}): Promise<void> {
    return this.call<void>('renameDir', params);
  }
  copyDir(params: {path: Array<string>; dir: string; newPath: Array<string>; newDir: string}): Promise<void> {
    return this.call<void>('copyDir', params);
  }
  moveDir(params: {path: Array<string>; dir: string; newPath: Array<string>; newDir: string}): Promise<void> {
    return this.call<void>('moveDir', params);
  }

  watch(params: {path: Array<string>}): Promise<void> {
    return this.call<void>('watch', params);
  }
  unwatch(params: {path: Array<string>}): Promise<void> {
    return this.call<void>('unwatch', params);
  }
}

