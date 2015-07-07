
import promise = require('es6-promise');

import client_rpc = require("./client_rpc");

export class DumbServiceJsonRpc {
    socket: client_rpc.JsonRpcSocket;
    
    constructor(socket: client_rpc.JsonRpcSocket){
        this.socket = socket;  
        console.log("Dumb RPC starting");
    }

    foo(params:{}): Promise<string>{
        return client_rpc.sendRequest('foo',params,this.socket,"dumb_server");    
    }
    dumb_echo(params:{inp: string}): Promise<string>{
        return client_rpc.sendRequest('dumb_echo',params,this.socket,"dumb_server")    
    }
      
}