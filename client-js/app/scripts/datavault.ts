import promise = require('es6-promise');

var Promise = promise.Promise;

export interface DataVaultListing {
  path: Array<string>;
  dirs: Array<string>;
  datasets: Array<string>;
}

export interface DataVaultApi {
  dir(path: Array<string>): Promise<DataVaultListing>;
}

export class DataVaultService implements DataVaultApi {
  baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl + '/api/vault';
  }

  dir(path: Array<string>): Promise<DataVaultListing> {
    return this.sendRequest('/dir', path);
  }

  sendRequest(path: string, data: any): Promise<DataVaultListing> {
    return new promise.Promise((resolve, reject) => {

      var url = this.baseUrl + path;

      var request = new XMLHttpRequest();
      request.open('POST', url, true);
      request.setRequestHeader('Content-Type', 'application/json; charset=UTF-8');
      request.setRequestHeader('Access-Control-Allow-Origin', '*');

      request.onload = function(e) {
        if (request.status >= 200 && request.status < 400) {
          resolve(<DataVaultListing>JSON.parse(request.responseText));
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