import promise = require('es6-promise');

var Promise = promise.Promise;


export class JsonRpcSocket {
  url: string;
  calls: { [id: number]: { reject: (any) => void; resolve: (error?: any) => void } };
  nextId: number;
  socket: WebSocket;
  prefix: string;

  openPromise: Promise<void>;
  // A promise that will be resolved as soon as the socket is connected.
  // We chain call promises off this promise so that the user can immediately
  // make calls but we don't actually send any messages to the server until the
  // socket is ready.
  sendRequest(method: string, params: Object, socket, server: string): Promise<string> {
  console.log("sending dumb RPC named: "+ method+" argument: "+ JSON.stringify(params));
  return socket.call(this.prefix+server+"." + method, params)
    .then((result) => <string>result);
}
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