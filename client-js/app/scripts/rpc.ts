/**
 * Implements the JSON-RPC 2.0 protocol over websockets.
 *
 * JSON-RPC is a symmetric bidirectional protocol that provides both
 * remote procedure calls and fire-and-forget notifications (messages).
 *
 * The protocol specification is here: http://www.jsonrpc.org/specification
 */
export class JsonRpcSocket {
  url: string;
  calls: { [id: number]: { reject: (any) => void; resolve: (error?: any) => void } };
  nextId: number;
  socket: WebSocket;
  prefix: string;

  callables: { [method: string]: (Object) => Promise<any> };
  // local functions that are remotely-callable

  notifiables: { [method: string]: (Object) => void };
  // local functions that are remotely-notifiable

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

    this.callables = {};
    this.notifiables = {};

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
        console.log('call', json);
        var id = json["id"];
        var method = json["method"];
        var sock = this.socket;
        if (this.callables.hasOwnProperty(method)) {
          new Promise((resolve, reject) => {
            this.callables[method](json["params"]).then(resolve, reject);
          }).then(
            (result) => {
              var message = {
                jsonrpc: "2.0",
                id: id,
                result: result
              };
              sock.send(JSON.stringify(message));
            },
            (error) => {
              var message = {
                jsonrpc: "2.0",
                id: id,
                error: {
                  code: 1,
                  message: "oops!" // TODO: get this from error itself; also: data
                }
              };
              sock.send(JSON.stringify(message));
            }
          );
        }
      } else {
        // notification
        console.log('notification', json);
        var method = json["method"];
        if (this.notifiables.hasOwnProperty(method)) {
          this.notifiables[method](json["params"]);
        }
      }
    }
  }

  /**
   * Call the specified remote method.
   *
   * Params to the method can be given an array (positional) or object
   * (call by name). The returned Promise will be resolved or rejected
   * when we receive a success or error response, respectively.
   */
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

  /**
   * Send a notification to the specified remote method.
   *
   * As for calls, params can be given as positional or call-by-name.
   * Notifications are "fire and forget"; we receive no response from
   * the remote party, whether notification was delivered successfully
   * or not.
   */
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

  /**
   * Register a function to be callable remotely with the given method name.
   */
  addCallable(method: string, func: (Object) => Promise<any>): void {
    this.callables[method] = func;
  }

  /**
   * Register a function to be notifiable remotely with the given method name.
   */
  addNotifiable(method: string, func: (Object) => void): void {
    this.notifiables[method] = func;
  }
}

export class RpcService {
  socket: JsonRpcSocket;
  prefix: string;

  constructor(socket: JsonRpcSocket, prefix: string) {
    this.socket = socket;
    this.prefix = prefix;
  }

  call<A>(method: string, params: Array<string> | Object): Promise<A> {
    return <Promise<A>> this.socket.call(this.prefix + method, params);
  }
}