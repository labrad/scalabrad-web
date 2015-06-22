import promise = require('es6-promise');

var Promise = promise.Promise;

export interface RegistryListing {
  path: Array<string>;
  dirs: Array<string>;
  keys: Array<string>;
  vals: Array<string>;
}

export interface RegistryApi {
  dir(path: Array<string>): Promise<RegistryListing>;
  set(msg: {path: Array<string>; key: string; value: string}): Promise<RegistryListing>;
  del(msg: {path: Array<string>; key: string}): Promise<RegistryListing>;

  mkDir(msg: {path: Array<string>; dir: string}): Promise<RegistryListing>;
  rmDir(msg: {path: Array<string>; dir: string}): Promise<RegistryListing>;

  rename(msg: {path: Array<string>; key: string; newKey: string}): Promise<RegistryListing>;
  copy(msg: {path: Array<string>; key: string; newPath: Array<string>; newKey: string}): Promise<RegistryListing>;
  move(msg: {path: Array<string>; key: string; newPath: Array<string>; newKey: string}): Promise<RegistryListing>;

  renameDir(msg: {path: Array<string>; dir: string; newDir: string}): Promise<RegistryListing>;
  copyDir(msg: {path: Array<string>; dir: string; newPath: Array<string>; newDir: string}): Promise<RegistryListing>;
  moveDir(msg: {path: Array<string>; dir: string; newPath: Array<string>; newDir: string}): Promise<RegistryListing>;
}

export class RegistryService implements RegistryApi {
  baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl + '/api/registry';
  }

  dir(path: Array<string>): Promise<RegistryListing> {
    return this.sendRequest('/dir', path);
  }
  set(msg: {path: Array<string>; key: string; value: string}): Promise<RegistryListing> {
    return this.sendRequest('/set', msg);
  }
  del(msg: {path: Array<string>; key: string}): Promise<RegistryListing> {
    return this.sendRequest('/del', msg);
  }

  mkDir(msg: {path: Array<string>; dir: string}): Promise<RegistryListing> {
    return this.sendRequest('/mkdir', msg);
  }
  rmDir(msg: {path: Array<string>; dir: string}): Promise<RegistryListing> {
    return this.sendRequest('/rmdir', msg);
  }

  rename(msg: {path: Array<string>; key: string; newKey: string}): Promise<RegistryListing> {
    return this.sendRequest('/rename', msg);
  }
  copy(msg: {path: Array<string>; key: string; newPath: Array<string>; newKey: string}): Promise<RegistryListing> {
    return this.sendRequest('/copy', msg);
  }
  move(msg: {path: Array<string>; key: string; newPath: Array<string>; newKey: string}): Promise<RegistryListing> {
    return this.sendRequest('/move', msg);
  }

  renameDir(msg: {path: Array<string>; dir: string; newDir: string}): Promise<RegistryListing> {
    return this.sendRequest('/renamedir', msg);
  }
  copyDir(msg: {path: Array<string>; dir: string; newPath: Array<string>; newDir: string}): Promise<RegistryListing> {
    return this.sendRequest('/copydir', msg);
  }
  moveDir(msg: {path: Array<string>; dir: string; newPath: Array<string>; newDir: string}): Promise<RegistryListing> {
    return this.sendRequest('/movedir', msg);
  }

  sendRequest(path: string, data: any): Promise<RegistryListing> {
    return new promise.Promise((resolve, reject) => {

      var url = this.baseUrl + path;

      var request = new XMLHttpRequest();
      request.open('POST', url, true);
      request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
      request.setRequestHeader('Access-Control-Allow-Origin', '*');

      request.onload = function(e) {
        if (request.status >= 200 && request.status < 400) {
          resolve(<RegistryListing>JSON.parse(request.responseText));
        } else {
          reject(new Error('request failed with status ' + request.status));
        }
      };

      request.onerror = function(e) {
        reject(new Error('request failed: ' + e));
      };

      request.send(JSON.stringify(data));
    });
  }
}