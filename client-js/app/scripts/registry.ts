import {Observable} from './observable';
import * as rpc from "./rpc";

export interface RegistryListing {
  path: string[];
  dirs: string[];
  keys: string[];
  vals: string[];
}

export interface RegistryApi {
  newItem: Observable<{name: string}>;

  dir(params: {path: string[]}): Promise<RegistryListing>;
  set(params: {path: string[]; key: string; value: string}): Promise<void>;
  del(params: {path: string[]; key: string}): Promise<void>;

  mkDir(params: {path: string[]; dir: string}): Promise<void>;
  rmDir(params: {path: string[]; dir: string}): Promise<void>;

  rename(params: {path: string[]; key: string; newKey: string}): Promise<void>;
  copy(params: {path: string[]; key: string; newPath: string[]; newKey: string}): Promise<void>;
  move(params: {path: string[]; key: string; newPath: string[]; newKey: string}): Promise<void>;

  renameDir(params: {path: string[]; dir: string; newDir: string}): Promise<void>;
  copyDir(params: {path: string[]; dir: string; newPath: string[]; newDir: string}): Promise<void>;
  moveDir(params: {path: string[]; dir: string; newPath: string[]; newDir: string}): Promise<void>;

  watch(params: {path: string[]}): Promise<void>;
  unwatch(params: {path: string[]}): Promise<void>;
}

export class RegistryApiImpl extends rpc.RpcService implements RegistryApi {

  newItem = new Observable<{name: string}>();

  constructor(socket: rpc.JsonRpcSocket) {
    super(socket, "org.labrad.registry.");
    this.connect('org.labrad.registry.keyChanged', this.newItem);
    this.connect('org.labrad.registry.keyRemoved', this.newItem);
    this.connect('org.labrad.registry.dirChanged', this.newItem);
    this.connect('org.labrad.registry.dirRemoved', this.newItem);
  }

  dir(params: {path: string[]}): Promise<RegistryListing> {
    return this.call<RegistryListing>('dir', params);
  }
  set(params: {path: string[]; key: string; value: string}): Promise<void> {
    return this.call<void>('set', params);
  }
  del(params: {path: string[]; key: string}): Promise<void> {
    return this.call<void>('del', params);
  }
  mkDir(params: {path: string[]; dir: string}): Promise<void> {
    return this.call<void>('mkDir', params);
  }
  rmDir(params: {path: string[]; dir: string}): Promise<void> {
    return this.call<void>('rmDir', params);
  }
  rename(params: {path: string[]; key: string; newKey: string}): Promise<void> {
    return this.call<void>('rename', params);
  }
  copy(params: {path: string[]; key: string; newPath: string[]; newKey: string}): Promise<void> {
    return this.call<void>('copy', params);
  }
  move(params: {path: string[]; key: string; newPath: string[]; newKey: string}): Promise<void> {
    return this.call<void>('move', params);
  }
  renameDir(params: {path: string[]; dir: string; newDir: string}): Promise<void> {
    return this.call<void>('renameDir', params);
  }
  copyDir(params: {path: string[]; dir: string; newPath: string[]; newDir: string}): Promise<void> {
    return this.call<void>('copyDir', params);
  }
  moveDir(params: {path: string[]; dir: string; newPath: string[]; newDir: string}): Promise<void> {
    return this.call<void>('moveDir', params);
  }

  watch(params: {path: string[]}): Promise<void> {
    return this.call<void>('watch', params);
  }
  unwatch(params: {path: string[]}): Promise<void> {
    return this.call<void>('unwatch', params);
  }
}

