import * as rpc from "./rpc";

export interface EchoApi {
  echo(message: string): Promise<string>;
}

export class EchoServiceJsonRpc extends rpc.RpcService implements EchoApi {

  constructor(socket: rpc.JsonRpcSocket) {
    super(socket, "org.labrad.");
  }

  echo(message: string): Promise<string> {
    return this.call<string>('echo', [message]);
  }
}
