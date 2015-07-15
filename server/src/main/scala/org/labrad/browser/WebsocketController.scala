package org.labrad.browser

import akka.actor.{Actor, ActorRef, Props}
import com.fasterxml.jackson.databind.ObjectMapper
import javax.inject._
import net.maffoo.jsonquote.play._
import org.labrad.browser.common.message.{Message => ClientMessage, _}
import org.labrad.browser.jsonrpc.{Message => JsonRpcMessage, _}
import org.labrad.data._
import org.labrad.util.Logging
import play.api.Application
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import play.api.libs.json.{Json, JsValue}
import play.api.mvc.{Handler => _, _}
import scala.collection.JavaConverters._
import scala.collection.mutable
import scala.concurrent.{Await, Future}
import scala.concurrent.duration._
import scala.reflect.ClassTag


class JsonRpcController @Inject() (cxnHolder: LabradConnectionHolder)(implicit app: Application) extends Controller {

  def socket = WebSocket.acceptWithActor[String, String] { request => out =>
    val backend = new Backend {
      var client: Endpoint = null
      var datavaultApi: VaultApi = null
      var managerApi: ManagerApi = null
      var registryApi: RegistryApi = null
      var handlers: Map[String, Handler] = null

      def connect(endpoint: Endpoint): Unit = {
        client = endpoint
        datavaultApi = new VaultApi(cxnHolder)
        val registryClientApi = JsonRpc.makeProxy(classOf[RegistryClientApi], client)
        registryApi = new RegistryApi(cxnHolder, registryClientApi)
        handlers = JsonRpc.makeHandlers(datavaultApi) ++
                   JsonRpc.makeHandlers(managerApi) ++
                   JsonRpc.makeHandlers(registryApi)
      }

      def disconnect(endpoint: Endpoint): Unit = {
        client = null
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


class WebSocketController @Inject() (implicit app: Application) extends Controller with Logging {
  def socket = WebSocket.acceptWithActor[String, String] { request => out =>
    LabradSocketActor.props(out)
  }
}

trait Sink {
  def send[M <: ClientMessage](msg: M)(implicit tag: ClassTag[M]): Unit
}

object LabradSocketActor {
  def props(out: ActorRef) = Props(new LabradSocketActor(out))
}

class LabradSocketActor(out: ActorRef) extends Actor with Logging {

  private val mapper = new ObjectMapper
  private var nextMessageId: Int = 1
  private var cxn: LabradConnection = _

  type Listener = PartialFunction[Message, Unit]
  case class Watch(context: Context, msgId: Long, listener: Listener)
  private val watches = mutable.Map.empty[Seq[String], Watch]

  override def preStart(): Unit = {
    cxn = new LabradConnection(sinkOpt = Some(new Sink {
      def send[M <: ClientMessage](msg: M)(implicit tag: ClassTag[M]): Unit = {
        LabradSocketActor.this.send(msg)
      }
    }))
  }

  override def postStop(): Unit = {
    if (cxn != null) {
      cxn.close()
      cxn = null
    }
  }

  def receive = {
    case "PING" => out ! "PONG"
    case "PONG" =>
    case msg: String =>
      import play.api.libs.json._
      val json = Json.parse(msg)
      (json \ "type").as[String] match {
        case "watch" =>
          val path = (json \ "payload" \ "path").as[Seq[String]]
          watch(path)

        case "unwatch" =>
          val path = (json \ "payload" \ "path").as[Seq[String]]
          unwatch(path)
      }

  }

  private def send[M <: ClientMessage](msg: M)(implicit tag: ClassTag[M]): Unit = {
    val className = tag.runtimeClass.getName
    val payload = Json.parse(mapper.writeValueAsString(msg))
    val message = json"""{
      type: $className,
      payload: $payload
    }"""
    out ! message.toString
  }

  private def watch(path: Seq[String]): Unit = {
    watches.get(path) match {
      case Some(ctx) => // already watching this path
      case None =>
        try {
          val cxn = this.cxn.get
          val ctx = cxn.newContext
          val msgId = ctx.low
          nextMessageId += 1
          val listener: Listener = {
            case msg @ Message(src, `ctx`, `msgId`, Cluster(Str(name), Bool(isDir), Bool(addOrChange))) =>
              if (isDir) {
                send(new RegistryDirMessage(path.asJava, name, addOrChange))
              } else {
                send(new RegistryKeyMessage(path.asJava, name, addOrChange))
              }
          }
          cxn.addMessageListener(listener)

          val reg = this.cxn.registry
          val pkt = reg.packet(ctx)
          pkt.cd(RegistryController.absPath(path))
          pkt.notifyOnChange(msgId, true)
          Await.result(pkt.send(), 10.seconds)

          watches += path -> Watch(ctx, msgId, listener)

        } catch {
          case e: Exception =>
            log.error(s"unable to watch path $path", e)
        }
    }
  }

  private def unwatch(path: Seq[String]): Unit = {
    for (watch <- watches.get(path)) {
      try {
        watches -= path
        val cxn = this.cxn.get
        val reg = this.cxn.registry
        val pkt = reg.packet(watch.context)
        pkt.notifyOnChange(watch.msgId, false)
        Await.result(pkt.send(), 10.seconds)

        cxn.removeMessageListener(watch.listener)
      } catch {
        case e: Exception =>
          log.error(s"unable to unwatch path $path", e)
      }
    }
  }
}

