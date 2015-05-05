package org.labrad.browser

import akka.actor.{Actor, ActorRef, Props}
import com.fasterxml.jackson.databind.ObjectMapper
import javax.inject._
import net.maffoo.jsonquote.literal._
import org.labrad.browser.common.message.Message
import org.labrad.util.Logging
import play.api.Play.current
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import play.api.mvc._
import scala.collection.mutable
import scala.reflect.ClassTag

class WebSocketController @Inject() extends Controller with Logging {
  def socket = WebSocket.acceptWithActor[String, String] { request => out =>
    LabradSocketActor.props(out)
  }
}

case class Msg[M <: Message](msg: M, tag: ClassTag[M])
object Msg {
  def wrap[M <: Message](msg: M)(implicit tag: ClassTag[M]) = new Msg[M](msg, tag)
}

object LabradSocketActor {
  def props(out: ActorRef) = Props(new LabradSocketActor(out))
}

class LabradSocketActor(out: ActorRef) extends Actor {

  private val mapper = new ObjectMapper
  private var cxn: LabradConnection = _

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
    case msg: String =>
      out ! ("I received your message: " + msg)
  }

  private def send(m: Msg[_]): Unit = {
    val className = m.tag.runtimeClass.getName
    val payload = Json(mapper.writeValueAsString(m.msg))
    val message = json"""{
      type: $className,
      payload: $payload
    }"""
    out ! message.toString
  }
}

