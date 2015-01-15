package org.labrad.browser.server

import java.awt.EventQueue
import javax.servlet.{ServletContext, ServletContextEvent, ServletContextListener}

import scala.concurrent.Await
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration._

import org.labrad.{Client, Connection, GenericProxy, Requester}
import org.labrad.browser.client.event._
import org.labrad.browser.client.nodes.InstanceStatus
import org.labrad.data._
import org.labrad.events.{ConnectionEvent, ConnectionListener, MessageEvent, MessageListener}

import org.slf4j.LoggerFactory

object LabradConnection {
  def get(implicit context: ServletContext) =
    context.getAttribute(classOf[LabradConnection].getName).asInstanceOf[LabradConnection].get

  def to(server: String)(implicit context: ServletContext): GenericProxy =
    new GenericProxy(get, server)
}

class LabradConnection extends ServletContextListener {
  private val RECONNECT_TIMEOUT = 10000
  private val log = LoggerFactory.getLogger(classOf[LabradConnection])

  @volatile private var live: Boolean = true
  @volatile private var cxn: Option[Connection] = None

  def get = cxn.get

  private var nextMessageId: Long = 1L

  def contextInitialized(sce: ServletContextEvent) {
    log.info("context initialized: establishing labrad connection...")
    sce.getServletContext.setAttribute(classOf[LabradConnection].getName, this)
    val cxn = makeClient
    handleConnectionEvents(cxn)
    startConnection(cxn)
  }

  def contextDestroyed(sce: ServletContextEvent) {
    log.info("context destroyed: shutting down labrad connection...")
    live = false
    try cxn.foreach(_.close()) catch { case e: Throwable => }
  }

  private def makeClient = {
    new Client("Browser", host = "localhost", password = "")
  }

  /**
   * Handle connection and disconnection events on our client
   */
  private def handleConnectionEvents(cxn: Connection) {
    cxn.addConnectionListener {
      case true =>
        log.info("connected")
        setupConnection(cxn)
        this.cxn = Some(cxn)
        ClientEventQueue.dispatch(new LabradConnectEvent(cxn.host))

      case false =>
        log.info("disconnected.  will reconnect in 10 seconds")
        this.cxn = None
        ClientEventQueue.dispatch(new LabradDisconnectEvent(cxn.host))

        if (live) {
          // reconnect after some delay
          val cxn = makeClient
          handleConnectionEvents(cxn)
          startConnectionDelayed(cxn, RECONNECT_TIMEOUT)
        }
    }
  }

  private def startConnection(cxn: Connection) {
    try {
      if (live) cxn.connect()
    } catch {
      case e: Throwable =>
        doLater {
          startConnectionDelayed(cxn, RECONNECT_TIMEOUT)
        }
    }
  }

  def doLater(f: => Unit): Unit = {
    EventQueue.invokeLater(new Runnable {
      def run: Unit = f
    })
  }

  private def startConnectionDelayed(cxn: Connection, delay: Long) {
    Thread.sleep(delay)
    startConnection(cxn)
  }

  /**
   * Subscribe to messages we want to be able to relay to clients
   */
  private def setupConnection(cxn: Connection) {
    try {
      val ctx = cxn.newContext
      val req = new GenericProxy(cxn, "Manager").packet(ctx)
      subscribeToServerConnectMessages(cxn, req, ctx)
      subscribeToServerDisconnectMessages(cxn, req, ctx)

      subscribeToNodeServerMessage(cxn, req, ctx, "node.server_starting", InstanceStatus.STARTING)
      subscribeToNodeServerMessage(cxn, req, ctx, "node.server_started", InstanceStatus.STARTED)
      subscribeToNodeServerMessage(cxn, req, ctx, "node.server_stopping", InstanceStatus.STOPPING)
      subscribeToNodeServerMessage(cxn, req, ctx, "node.server_stopped", InstanceStatus.STOPPED)

      subscribeToNodeStatusMessages(cxn, req, ctx)
      Await.result(req.send, 10.seconds)
    } catch {
      case e: Throwable =>
        // if this failed, we should disconnect and try again later
        log.error("failed to setup connection", e)
        cxn.close
        throw new RuntimeException(e)
    }
  }

  /**
   * Get the next unique message id
   * @return
   */
  private def getMessageId = {
    val id = nextMessageId
    nextMessageId += 1
    id
  }

  /**
   * Add a call to subscribe to a named message onto an existing Request
   * @param req
   * @param message
   * @param id
   */
  private def addSubscription(cxn: Connection, req: Requester, ctx: Context, message: String)(listener: Message => Unit) {
    val id = getMessageId
    req.call("Subscribe to Named Message", Str(message), UInt(id), Bool(true))
    cxn.addMessageListener {
      case msg @ Message(src, `ctx`, `id`, data) => listener(msg)
    }
  }

  /**
   * Subscribe to server connection messages
   * @param req
   */
  private def subscribeToServerConnectMessages(cxn: Connection, req: Requester, ctx: Context) {
    addSubscription(cxn, req, ctx, "Server Connect") {
      case Message(_, _, _, Cluster(_, Str(server))) =>
        ClientEventQueue.dispatch(new ServerConnectEvent(server))
    }
  }


  /**
   * Subscribe to server disconnection messages
   * @param req
   */
  private def subscribeToServerDisconnectMessages(cxn: Connection, req: Requester, ctx: Context) {
    addSubscription(cxn, req, ctx, "Server Disconnect") {
      case Message(_, _, _, Cluster(_, Str(server))) =>
        ClientEventQueue.dispatch(new ServerDisconnectEvent(server))
    }
  }


  private def subscribeToNodeServerMessage(cxn: Connection, req: Requester, ctx: Context, messageName: String, status: InstanceStatus) {
    addSubscription(cxn, req, ctx, messageName) {
      case Message(_, _, _, data) =>
        val map = parseNodeMessage(data)
        val node = map("node").get[String]
        val server = map("server").get[String]
        val instance = map("instance").get[String]
        ClientEventQueue.dispatch(new NodeServerEvent(node, server, instance, status))
    }
  }


  /**
   * Subscribe to status messages from node servers
   * @param req
   */
  private def subscribeToNodeStatusMessages(cxn: Connection, req: Requester, ctx: Context) {
    addSubscription(cxn, req, ctx, "node.status") {
      case Message(_, _, _, data) =>
        val map = parseNodeMessage(data)
        val node = map("node").get[String]
        val serversData = map("servers")
        val statuses = NodeServiceImpl.getServerStatuses(serversData)
        ClientEventQueue.dispatch(new NodeStatusEvent(node, statuses))
    }
  }

  /**
   * Parse messages coming from the nodes, which contain several key-value pairs
   * @param msg
   * @return
   */
  private def parseNodeMessage(msg: Data) = {
    val map = for (i <- 0 until msg.clusterSize) yield {
      val Cluster(Str(key), value) = msg(i)
      key -> value
    }
    map.toMap
  }

}
