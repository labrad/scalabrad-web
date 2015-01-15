package org.labrad.browser.server

import com.google.gwt.event.shared.GwtEvent
import java.util.UUID
import javax.servlet.ServletContext
import javax.servlet.http.{HttpSession, HttpSessionEvent, HttpSessionListener}
import org.labrad.RegistryServerProxy
import org.labrad.browser.client.event.{RegistryDirEvent, RegistryKeyEvent}
import org.labrad.data._
import org.eclipse.jetty.continuation.Continuation
import org.slf4j.LoggerFactory
import scala.collection.mutable
import scala.concurrent.Await
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration._

class ClientEventQueue {
  private val log = LoggerFactory.getLogger(classOf[ClientEventQueue])

  val uuid = UUID.randomUUID()
  private val events = mutable.Buffer.empty[GwtEvent[_]]
  private var continuation: Option[Continuation] = None

  type Listener = PartialFunction[Message, Unit]
  case class Watch(context: Context, msgId: Long, listener: Listener)
  private val watches = mutable.Map.empty[String, Watch]

  def hasEvents: Boolean = synchronized {
    events.size > 0
  }

  def getEvents: Array[GwtEvent[_]] = synchronized {
    val evts = events.toArray
    events.clear
    evts
  }

  def setContinuation(continuation: Continuation): Unit = synchronized {
    this.continuation = Some(continuation)
  }

  def clearContinuation(): Unit = synchronized {
    this.continuation = None
  }

  def dispatch(e: GwtEvent[_]): Unit = synchronized {
    events += e
    for (c <- continuation) {
      try {
        c.resume()
      } catch {
        case e: Exception =>
          log.warn(s"error while resuming continuation. uuid=$uuid", e)
      }
    }
  }

  def watchRegistryPath(watchId: String, path: String)(implicit context: ServletContext): Unit = synchronized {
    val cxn = LabradConnection.get
    val ctx = cxn.newContext
    val msgId = ctx.low

    val listener: PartialFunction[Message, Unit] = {
      case Message(src, `ctx`, `msgId`, Cluster(Str(name), Bool(isDir), Bool(addOrChange))) =>
        val event: GwtEvent[_] = if (isDir) {
          new RegistryDirEvent(path, name, addOrChange)
        } else {
          new RegistryKeyEvent(path, name, addOrChange)
        }
        dispatch(event)
    }
    cxn.addMessageListener(listener)

    val reg = new RegistryServerProxy(cxn)
    val pkt = reg.packet(ctx)
    pkt.cd(path)
    pkt.notifyOnChange(msgId, true)
    Await.result(pkt.send, 10.seconds)

    watches += watchId -> Watch(ctx, msgId, listener)
  }

  def unwatchRegistryPath(watchId: String)(implicit context: ServletContext): Unit = synchronized {
    for (watch <- watches.get(watchId)) {
      watches -= watchId

      val cxn = LabradConnection.get
      val reg = new RegistryServerProxy(cxn)
      val pkt = reg.packet(watch.context)
      pkt.notifyOnChange(watch.msgId, false)
      Await.result(pkt.send, 10.seconds)

      cxn.removeMessageListener(watch.listener)
    }
  }

  /** turn off all registry notifications that we've enable on this connection */
  def cleanup()(implicit context: ServletContext): Unit = {
    try {
      val cxn = LabradConnection.get
      val reg = new RegistryServerProxy(cxn)

      val futures = for ((uuid, watch) <- watches) yield {
        val pkt = reg.packet(watch.context)
        pkt.notifyOnChange(watch.msgId, false)
        pkt.send
      }

      for (f <- futures) {
        Await.result(f, 10.seconds)
      }
    } catch {
      case e: Exception =>
        log.warn("exception during cleanup", e)
    }
  }
}

object ClientEventQueue {
  private val log = LoggerFactory.getLogger(getClass)

  val ATTR_NAME = "ClientEventQueues"
  private val sessions = mutable.Set.empty[HttpSession]

  def connectClient(session: HttpSession, uuid: String): Unit = synchronized {
    sessions.add(session)
    session synchronized {
      var clients = getQueues(session)
      if (clients == null) {
        clients = mutable.Map.empty[String, ClientEventQueue]
        session.setAttribute(ATTR_NAME, clients)
      }
      if (clients.contains(uuid)) {
        log.info(s"ClientEventQueue ${uuid} already exists for session ${session.getId}")
      } else {
        val queue = new ClientEventQueue
        clients.put(uuid, queue)
        log.info(s"ClientEventQueue ${uuid} created for session ${session.getId}")
      }
    }
  }

  def disconnectClient(session: HttpSession, uuid: String)(implicit context: ServletContext): Unit = synchronized {
    session synchronized {
      val queueOpt = getQueues(session).remove(uuid)
      for (queue <- queueOpt) {
        queue.cleanup()
      }
    }
    log.info(s"ClientEventQueue ${uuid} destroyed for session ${session.getId}")
  }

  class SessionListener extends HttpSessionListener {
    override def sessionCreated(e: HttpSessionEvent): Unit = ClientEventQueue synchronized {
      log.debug(s"Session created: ${e.getSession.getId}")
      e.getSession.setAttribute(ATTR_NAME, mutable.Map.empty[String, ClientEventQueue])
      sessions.add(e.getSession)
    }

    override def sessionDestroyed(e: HttpSessionEvent): Unit = ClientEventQueue synchronized {
      sessions.remove(e.getSession)
      log.info("Session destroyed: {}", e.getSession.getId)
    }
  }

  def get(session: HttpSession, uuid: String): Option[ClientEventQueue] = session synchronized {
    getQueues(session).get(uuid)
  }

  def dispatch(e: GwtEvent[_]): Unit = synchronized {
    for (session <- sessions) {
      session synchronized {
        getQueues(session).values foreach { _.dispatch(e) }
      }
    }
  }

  private def getQueues(session: HttpSession) =
    session.getAttribute(ATTR_NAME).asInstanceOf[mutable.Map[String, ClientEventQueue]]
}
