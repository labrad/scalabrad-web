import {Observable} from "./observable";
import {Obligation, obligate} from "./obligation";

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
  calls: { [id: number]: Obligation<any> };
  nextId: number;
  socket: WebSocket;
  prefix: string;

  // local functions that are remotely-callable
  callables: { [method: string]: (Object) => Promise<any> };

  // local functions that are remotely-notifiable
  notifiables: { [method: string]: (Object) => void };

  // A promise that will be resolved as soon as the socket is connected.
  // We chain call promises off this promise so that the user can immediately
  // make calls but we don't actually send any messages to the server until the
  // socket is ready.
  openPromise: Promise<void>;

  // An oservable that will fire when the socket connection is lost
  connectionClosed = new Observable<CloseEvent>();

  constructor(url: string) {
    this.url = url;
    this.calls = {};
    this.nextId = 0;
    this.socket = new WebSocket(url);

    this.callables = {};
    this.notifiables = {};

    var { obligation, promise } = obligate<any>();
    this.openPromise = promise;

    var connected = false;
    this.socket.onopen = (message) => {
      connected = true;
      obligation.resolve(null);
    }
    this.socket.onclose = (message) => {
      if (!connected) {
        obligation.reject(message.reason);
      }
      this.connectionClosed.call(message);
    }

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
        this.callMethod(json);
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
   * Close the rpc socket by closing the underlying WebSocket.
   */
  close(code?: number, reason?: string) {
    code = code || 1000;
    this.socket.close(code, reason);
  }

  /**
   * Call a local method and send the response back to the remote party
   */
  private async callMethod(request: Object) {
    var id = request["id"];
    var response: Object;
    try {
      var method = request["method"]
      if (!this.callables.hasOwnProperty(method)) {
        throw new Error(`no such method: ${method}`);
      }
      var result = await this.callables[method](request["params"]);
      response = {
        jsonrpc: "2.0",
        id: id,
        result: result
      };
    } catch (error) {
      response = {
        jsonrpc: "2.0",
        id: id,
        error: {
          code: 1,
          message: "oops!" // TODO: get this from error itself; also: data
        }
      };
    }
    this.socket.send(JSON.stringify(response));
  }

  /**
   * Call the specified remote method.
   *
   * Params to the method can be given an array (positional) or object
   * (call by name). The returned Promise will be resolved or rejected
   * when we receive a success or error response, respectively.
   */
  async call(method: string, params: Array<string> | Object): Promise<any> {
    await this.openPromise;
    var id = this.nextId;
    this.nextId += 1;
    var message = {
      jsonrpc: "2.0",
      id: id,
      method: method,
      params: params
    };
    this.socket.send(JSON.stringify(message));
    var { obligation, promise } = obligate<any>();
    this.calls[id] = obligation;
    return promise;
  }

  /**
   * Send a notification to the specified remote method.
   *
   * As for calls, params can be given as positional or call-by-name.
   * Notifications are "fire and forget"; we receive no response from
   * the remote party, whether notification was delivered successfully
   * or not.
   */
  async notify(method: string, params: Array<string> | Object) {
    await this.openPromise;
    var message = {
      jsonrpc: "2.0",
      method: method,
      params: params
    };
    this.socket.send(JSON.stringify(message));
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

  notify(method: string, params: Array<string> | Object): void {
    this.socket.notify(this.prefix + method, params);
  }

  protected connect<A>(method: string, observable: Observable<A>): void {
    this.socket.addNotifiable(method, (msg) => observable.call(<A>msg));
  }
}
