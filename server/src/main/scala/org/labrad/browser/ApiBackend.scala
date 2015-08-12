package org.labrad.browser

import net.maffoo.jsonquote.play._
import org.labrad.browser.jsonrpc._
import play.api.libs.json.JsValue
import scala.concurrent.{ExecutionContext, Future}

/**
 * The API backend where we dispatch incoming jsonrpc calls to actual scala
 * services and create proxies for calling methods and sending notifications
 * to the client. Each backend instance manages its own connection to labrad.
 */
class ApiBackend(implicit ec: ExecutionContext) extends Backend {
  private var cxn: LabradConnection = null
  private var datavaultApi: VaultApi = null
  private var managerApi: ManagerApi = null
  private var nodeApi: NodeApi = null
  private var registryApi: RegistryApi = null
  private var routes: Map[String, Handler] = null

  def connect(client: Endpoint): Unit = synchronized {
    // proxies to make calls and send notifications to the client
    val labradClient = JsonRpc.proxy[LabradClientApi]("""
      NOTIFY  org.labrad.connected           client.connected
      NOTIFY            .disconnected              .disconnected
      NOTIFY            .serverConnected           .serverConnected
      NOTIFY            .serverDisconnected        .serverDisconnected
    """)

    val nodeClient = JsonRpc.proxy[NodeClientApi]("""
      NOTIFY  org.labrad.node.nodeStatus    client.nodeStatus
      NOTIFY                 .serverStatus        .serverStatus
    """)

    val registryClient = JsonRpc.proxy[RegistryClientApi]("""
      NOTIFY  org.labrad.registry.keyChanged  client.keyChanged
      NOTIFY                     .keyRemoved        .keyRemoved
      NOTIFY                     .dirChanged        .dirChanged
      NOTIFY                     .dirRemoved        .dirRemoved
    """)

    // connect to labrad (and reconnect if connection is lost)
    cxn = new LabradConnection(labradClient, nodeClient)

    // api implementations for incoming calls and notifications
    datavaultApi = new VaultApi(cxn)
    managerApi = new ManagerApi(cxn)
    registryApi = new RegistryApi(cxn, registryClient)

    routes = JsonRpc.routes("""
      CALL  org.labrad.datavault.dir          datavaultApi.dir
      CALL                      .datasetInfo              .datasetInfo
      CALL                      .data                     .data

      CALL  org.labrad.manager.connections       managerApi.connections
      CALL                    .connection_close            .connectionClose
      CALL                    .server_info                 .serverInfo

      CALL  org.labrad.node.allNodes       nodeApi.allNodes
      CALL                 .refreshNode           .refreshNode
      CALL                 .restartServer         .restartServer
      CALL                 .startServer           .startServer
      CALL                 .stopServer            .stopServer

      CALL  org.labrad.registry.dir        registryApi.dir
      CALL                     .set                   .set
      CALL                     .del                   .del
      CALL                     .mkDir                 .mkDir
      CALL                     .rmDir                 .rmDir
      CALL                     .copy                  .copy
      CALL                     .copyDir               .copyDir
      CALL                     .rename                .rename
      CALL                     .renameDir             .renameDir
      CALL                     .move                  .move
      CALL                     .moveDir               .moveDir
      CALL                     .watch                 .watch
      CALL                     .unwatch               .unwatch
    """)
  }

  def disconnect(client: Endpoint): Unit = synchronized {
    cxn.close()
    datavaultApi = null
    managerApi = null
    nodeApi = null
    registryApi = null
    routes = null
  }

  def call(src: Endpoint, method: String, params: Option[Params]): Future[JsValue] = synchronized {
    routes.get(method) match {
      case None => Future.failed(JsonRpcError.methodNotFound(json"""{ method: $method }"""))
      case Some(handler) => handler.call(params.getOrElse(Left(Nil)))
    }
  }

  def notify(src: Endpoint, method: String, params: Option[Params]): Unit = synchronized {
    call(src, method, params)
  }
}

