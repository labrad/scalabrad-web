package org.labrad.browser

import javax.inject._
import net.maffoo.jsonquote.play._
import org.labrad.browser.jsonrpc._
import org.labrad.data._
import org.labrad.util.Logging
import play.api.Application
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import play.api.libs.json.{Json, JsValue}
import play.api.mvc.{Handler => _, _}
import scala.collection.mutable
import scala.concurrent.Future
import scala.concurrent.duration._


class JsonRpcController @Inject() ()(implicit app: Application) extends Controller {

  def socket = WebSocket.acceptWithActor[String, String] { request => out =>
    val backend = new Backend {
      var cxn: LabradConnection = null
      var datavaultApi: VaultApi = null
      var managerApi: ManagerApi = null
      var registryApi: RegistryApi = null
      var handlers: Map[String, Handler] = null

      def connect(client: Endpoint): Unit = {
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

      def disconnect(client: Endpoint): Unit = {
        cxn.close()
        datavaultApi = null
        managerApi = null
        registryApi = null
        handlers = null
      }

      override def call(src: Endpoint, method: String, params: Option[Params]): Future[JsValue] = {
        handlers.get(method) match {
          case None => Future.failed(JsonRpcError.methodNotFound(json"""{ method: $method }"""))
          case Some(handler) => handler.call(params.getOrElse(Left(Nil)))
        }
      }

      override def notify(src: Endpoint, method: String, params: Option[Params]): Unit = {
        call(src, method, params)
      }
    }
    JsonRpcTransport.props(out, backend)
  }
}
