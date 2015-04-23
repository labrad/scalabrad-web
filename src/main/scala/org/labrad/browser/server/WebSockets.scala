package org.labrad.browser.server

import com.fasterxml.jackson.databind.ObjectMapper
import javax.inject.Singleton
import net.maffoo.jsonquote.literal._
import org.eclipse.jetty.websocket.api.Session
import org.eclipse.jetty.websocket.api.WebSocketListener
import org.eclipse.jetty.websocket.servlet.WebSocketServlet
import org.eclipse.jetty.websocket.servlet.WebSocketServletFactory
import org.labrad.browser.client.message._
import org.labrad.browser.client.nodes.InstanceStatus
import org.labrad.util.Logging
import scala.collection.mutable
import scala.concurrent.duration._
import scala.reflect.ClassTag


case class ServerStatus(name: String, description: String, version: String, instanceName: String, envVars: Seq[String], instances: Seq[String])

object EventSockets {
  private[server] val mapper = new ObjectMapper

  private val lock = new Object
  private val sockets = mutable.Set.empty[EventSocket]

  def all: Set[EventSocket] = {
    lock.synchronized { sockets.toSet }
  }

  def register(socket: EventSocket): Unit = {
    lock.synchronized { sockets += socket }
  }

  def unregister(socket: EventSocket): Unit = {
    lock.synchronized { sockets -= socket }
  }
}

@Singleton
class MyEchoServlet extends WebSocketServlet {

  override def configure(factory: WebSocketServletFactory): Unit = {
    factory.getPolicy.setIdleTimeout(60.seconds.toMillis)
    factory.register(classOf[EventSocket])
  }
}

class EventSocket extends WebSocketListener with Logging {

  private var session: Session = _

  override def onWebSocketConnect(session: Session): Unit = {
    log.info(s"connected! session=$session")
    this.session = session
    EventSockets.register(this)
  }

  override def onWebSocketClose(statusCode: Int, reason: String): Unit = {
    log.info(s"closed! statusCode=$statusCode, reason=$reason")
    this.session = null
    EventSockets.unregister(this)
  }

  override def onWebSocketText(message: String): Unit = {
    log.info(s"got message: $message")
    if ((session != null) && (session.isOpen)) {
      println(s"Echoing back message: $message")
      send(new RegistryDirMessage("thePath", "theName", true))
      send(new RegistryKeyMessage("thePath", "theName", true))
    }
  }

  override def onWebSocketBinary(payload: Array[Byte], offset: Int, len: Int): Unit = {
    log.info(s"got binary message: payload=$payload, offset=$offset, len=$len")
  }

  override def onWebSocketError(cause: Throwable): Unit = {
    log.info(cause)
  }

  def send[T <: Message](t: T)(implicit tag: ClassTag[T]): Unit = {
    val className = tag.runtimeClass.getName
    val payload = Json(EventSockets.mapper.writeValueAsString(t))
    val message = json"""{
      type: $className,
      payload: $payload
    }"""
    session.getRemote.sendString(message.toString)
  }
}
