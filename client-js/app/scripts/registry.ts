import promise = require('es6-promise');

var Promise = promise.Promise;

export interface RegistryListing {
  path: Array<string>;
  dirs: Array<string>;
  keys: Array<string>;
  vals: Array<string>;
}
function sendRequest(method: string, params: Object, socket): Promise<string> {
        console.log("sending dumb RPC named: "+ method+" argument: "+ JSON.stringify(params));
        return socket.call("org.labrad.dumb_server." + method, params)
                      .then((result) => <string>result);
  }

export class JsonRpcSocket {
  url: string;
  calls: { [id: number]: { reject: (any) => void; resolve: (error?: any) => void } };
  nextId: number;
  socket: WebSocket;

  openPromise: Promise<void>;
  // A promise that will be resolved as soon as the socket is connected.
  // We chain call promises off this promise so that the user can immediately
  // make calls but we don't actually send any messages to the server until the
  // socket is ready.

  constructor(url: string) {
    this.url = url;
    this.calls = {};
    this.nextId = 0;
    this.socket = new WebSocket(url);

    var resolveOpen: (any) => void = null;
    var rejectOpen: (any?) => void = null;
    this.openPromise = new Promise<void>((resolve, reject) => {
      resolveOpen = resolve;
      rejectOpen = reject;
    });

    this.socket.onopen = (message) => { console.log("onopen", message); resolveOpen(null); }
    this.socket.onerror = (message) => { console.log("onerror", message); rejectOpen(message); }

    this.socket.onmessage = (message) => {
      var json = JSON.parse(message.data);
      if (json.hasOwnProperty("result")) {
        // success
        var id = json["id"];
        if (this.calls.hasOwnProperty(id)) {
          var callbacks = this.calls[id];
          delete this.calls[id];
          callbacks.resolve(json["result"]);
        }
      } else if (json.hasOwnProperty("error")) {
        // error
        var id = json["id"];
        if (this.calls.hasOwnProperty(id)) {
          var callbacks = this.calls[id];
          delete this.calls[id];
          callbacks.reject(json["error"]);
        }
      } else if (json.hasOwnProperty("id")) {
        // call
      } else {
        // notification
      }
    }
  }

  call(method: string, params: Array<string> | Object): Promise<any> {
    return this.openPromise.then((ignored) => new Promise<any>((resolve, reject) => {
      var id = this.nextId;
      this.nextId += 1;
      var message = {
        jsonrpc: "2.0",
        id: id,
        method: method,
        params: params
      };
      this.socket.send(JSON.stringify(message));
      this.calls[id] = {
        resolve: resolve,
        reject: reject
      };
    }));
  }

  notify(method: string, params: Array<string> | Object): void {
    this.openPromise.then((ignored) => {
      var message = {
        jsonrpc: "2.0",
        method: method,
        params: params
      };
      this.socket.send(JSON.stringify(message));
    });
  }

}

export class DumbServiceJsonRpc {
    socket: JsonRpcSocket;
    
    constructor(socket: JsonRpcSocket){
        this.socket = socket;  
        console.log("Dumb RPC starting");
    }

    foo(params:{}): Promise<string>{
        return sendRequest('foo',params,this.socket);    
    }
    dumb_echo(params:{inp: string}): Promise<string>{
        return sendRequest('dumb_echo',params,this.socket)    
    }
      
}


export class RegistryServiceJsonRpc {
  socket: JsonRpcSocket;

  constructor(socket: JsonRpcSocket) {
    this.socket = socket;
  }

  dir(params: {path: Array<string>}): Promise<RegistryListing> {
    return this.sendRequest('dir', params);
  }
  set(params: {path: Array<string>; key: string; value: string}): Promise<RegistryListing> {
    return this.sendRequest('set', params);
  }
  del(params: {path: Array<string>; key: string}): Promise<RegistryListing> {
    return this.sendRequest('del', params);
  }

  mkDir(params: {path: Array<string>; dir: string}): Promise<RegistryListing> {
    return this.sendRequest('mkDir', params);
  }
  rmDir(params: {path: Array<string>; dir: string}): Promise<RegistryListing> {
    return this.sendRequest('rmDir', params);
  }

  rename(params: {path: Array<string>; key: string; newKey: string}): Promise<RegistryListing> {
    return this.sendRequest('rename', params);
  }
  copy(params: {path: Array<string>; key: string; newPath: Array<string>; newKey: string}): Promise<RegistryListing> {
    return this.sendRequest('copy', params);
  }
  move(params: {path: Array<string>; key: string; newPath: Array<string>; newKey: string}): Promise<RegistryListing> {
    return this.sendRequest('move', params);
  }

  renameDir(params: {path: Array<string>; dir: string; newDir: string}): Promise<RegistryListing> {
    return this.sendRequest('renameDir', params);
  }
  copyDir(params: {path: Array<string>; dir: string; newPath: Array<string>; newDir: string}): Promise<RegistryListing> {
    return this.sendRequest('copyDir', params);
  }
  moveDir(params: {path: Array<string>; dir: string; newPath: Array<string>; newDir: string}): Promise<RegistryListing> {
    return this.sendRequest('moveDir', params);
  }

  sendRequest(method: string, params: Object): Promise<RegistryListing> {
      console.log("sending registry RPC: "+ method+" argument: "+ JSON.stringify(params));
    return this.socket.call("org.labrad.registry." + method, params)
                      .then((result) => <RegistryListing>result);
  }
}
