package org.labrad.browser

import javax.inject._
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
  private var registryApi: RegistryApi = null
  private var handlers: Map[String, Handler] = null

  def connect(client: Endpoint): Unit = synchronized {
    // proxies to make calls and send notifications to the client
    val labradClient = JsonRpc.makeProxy(classOf[LabradClientApi], client)
    val nodeClient = JsonRpc.makeProxy(classOf[NodeClientApi], client)
    val registryClient = JsonRpc.makeProxy(classOf[RegistryClientApi], client)

    // connect to labrad (and reconnect if connection is lost)
    cxn = new LabradConnection(labradClient, nodeClient)

    // api implementations for incoming calls and notifications
    datavaultApi = new VaultApi(cxn)
    managerApi = new ManagerApi(cxn)
    registryApi = new RegistryApi(cxn, registryClient)

    // create handlers that will parse the incoming jsonrpc
    handlers = JsonRpc.makeHandlers(datavaultApi) ++
               JsonRpc.makeHandlers(managerApi) ++
               JsonRpc.makeHandlers(registryApi)
  }

  def disconnect(client: Endpoint): Unit = synchronized {
    cxn.close()
    datavaultApi = null
    managerApi = null
    registryApi = null
    handlers = null
  }

  override def call(src: Endpoint, method: String, params: Option[Params]): Future[JsValue] = synchronized {
    handlers.get(method) match {
      case None => Future.failed(JsonRpcError.methodNotFound(json"""{ method: $method }"""))
      case Some(handler) => handler.call(params.getOrElse(Left(Nil)))
    }
  }

  override def notify(src: Endpoint, method: String, params: Option[Params]): Unit = synchronized {
    call(src, method, params)
  }
}

