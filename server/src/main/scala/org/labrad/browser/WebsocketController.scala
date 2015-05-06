package org.labrad.browser

import akka.actor.{Actor, ActorRef, Props}
import com.fasterxml.jackson.databind.ObjectMapper
import javax.inject._
import org.labrad.browser.common.message.{Message => ClientMessage, _}
import org.labrad.data._
import org.labrad.util.Logging
import play.api.Play.current
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import play.api.mvc._
import scala.collection.JavaConverters._
import scala.collection.mutable
import scala.concurrent.Await
import scala.concurrent.duration._
import scala.reflect.ClassTag

class WebSocketController @Inject() extends Controller with Logging {
  def socket = WebSocket.acceptWithActor[String, String] { request => out =>
    LabradSocketActor.props(out)
  }
}

case class Msg private (msg: Object, tag: ClassTag[_])
object Msg {
  def wrap[M <: ClientMessage](msg: M)(implicit tag: ClassTag[M]) = new Msg(msg, tag)
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
    cxn = new LabradConnection(sinkOpt = Some(send))
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
          println(s"watching: $path")
          watch(path)

        case "unwatch" =>
          val path = (json \ "payload" \ "path").as[Seq[String]]
          println(s"unwatching: $path")
          unwatch(path)
      }

  }

  private def send(m: Msg): Unit = {
    import net.maffoo.jsonquote.literal._
    val className = m.tag.runtimeClass.getName
    val payload = Json(mapper.writeValueAsString(m.msg))
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
                send(Msg.wrap(new RegistryDirMessage(path.asJava, name, addOrChange)))
              } else {
                send(Msg.wrap(new RegistryKeyMessage(path.asJava, name, addOrChange)))
              }
          }
          cxn.addMessageListener(listener)

          val reg = this.cxn.registry
          val pkt = reg.packet(ctx)
          pkt.cd(path)
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

