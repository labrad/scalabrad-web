
import promise = require('es6-promise');

import clientRpc = require("./rpc");

export interface EchoApi {
  foo(params: {}): Promise<string>;
  echo(params: {inp: string}): Promise<string>;
}
export class EchoServiceJsonRpc implements EchoApi {
  socket: clientRpc.JsonRpcSocket;

  constructor(socket: clientRpc.JsonRpcSocket){
    this.socket = socket;  
    console.log("Echo RPC starting");
  }

  foo(params:{}): Promise<string>{
    return this.socket.sendRequest('foo',params,this.socket,"manager");    
  } 
  echo(params:{inp: string}): Promise<string>{
    return this.socket.sendRequest('echo',params,this.socket,"manager")    
  }
      
}
