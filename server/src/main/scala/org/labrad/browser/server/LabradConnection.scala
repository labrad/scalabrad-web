package org.labrad.browser.server

import java.util.{Timer, TimerTask}
import javax.inject._
import javax.servlet.{ServletContext, ServletContextEvent, ServletContextListener}
import org.labrad._
import org.labrad.browser.{Msg, NodeController}
import org.labrad.browser.client.message.{Message => _, _}
import org.labrad.browser.client.nodes.InstanceStatus
import org.labrad.data._
import org.labrad.events.{ConnectionEvent, ConnectionListener, MessageEvent, MessageListener}
import org.slf4j.LoggerFactory
import play.api.inject.ApplicationLifecycle
import scala.concurrent.Await
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
import scala.concurrent.duration._

object LabradConnection {
  private def cxn(implicit context: ServletContext) =
    context.getAttribute(classOf[LabradConnection].getName).asInstanceOf[LabradConnection]

  def to(server: String)(implicit context: ServletContext): GenericProxy = cxn.to(server)

  def getManager(implicit context: ServletContext): ManagerServerProxy = cxn.manager

  def getRegistry(implicit context: ServletContext): RegistryServerProxy = cxn.registry

  val timer = new Timer(true)
}

@Singleton
class LabradConnectionHolder @Inject() (lifecycle: ApplicationLifecycle) {
  val cxn = new LabradConnection(sinkOpt = None)
  lifecycle.addStopHook { () =>
    Future.successful(cxn.close())
  }
}

class LabradConnection(sinkOpt: Option[Msg[_] => Unit]) {
  private val RECONNECT_TIMEOUT = 10.seconds
  private val log = LoggerFactory.getLogger(classOf[LabradConnection])

  @volatile private var live: Boolean = true
  @volatile private var cxnOpt: Option[Connection] = None

  private var nextMessageId: Long = 1L

  private val cxn = makeClient
  handleConnectionEvents(cxn)
  startConnection(cxn)

  def get: Connection = {
    cxnOpt.getOrElse { sys.error("not connected") }
  }

  def to(server: String): GenericProxy = new GenericProxy(get, server, context = get.newContext)
  def manager = new ManagerServerProxy(get)
  def registry = new RegistryServerProxy(get)

  def close(): Unit = {
    live = false
    try cxnOpt.foreach(_.close()) catch { case e: Throwable => }
  }

  private def makeClient = {
    new Client("Browser")
  }

  /**
   * Handle connection and disconnection events on our client
   */
  private def handleConnectionEvents(cxn: Connection) {
    cxn.addConnectionListener {
      case true =>
        log.info("connected")
        setupConnection(cxn)
        this.cxnOpt = Some(cxn)
        for (sink <- sinkOpt) sink(Msg.wrap(new LabradConnectMessage(cxn.host)))

      case false =>
        log.info("disconnected.  will reconnect in 10 seconds")
        this.cxnOpt = None
        for (sink <- sinkOpt) sink(Msg.wrap(new LabradDisconnectMessage(cxn.host)))

        if (live) {
          // reconnect after some delay
          val cxn = makeClient
          handleConnectionEvents(cxn)
          doLater(RECONNECT_TIMEOUT) {
            startConnection(cxn)
          }
        }
    }
  }

  private def startConnection(cxn: Connection) {
    try {
      if (live) cxn.connect()
    } catch {
      case e: Throwable =>
        doLater(RECONNECT_TIMEOUT) {
          startConnection(cxn)
        }
    }
  }

  def doLater(delay: Duration)(f: => Unit): Unit = {
    LabradConnection.timer.schedule(new TimerTask {
      def run: Unit = f
    }, delay.toMillis)
  }

  /**
   * Subscribe to messages we want to be able to relay to clients
   */
  private def setupConnection(cxn: Connection) {
    try {
      val pkt = new ManagerServerProxy(cxn, context = cxn.newContext).packet()
      subscribeToServerConnectMessages(pkt)
      subscribeToServerDisconnectMessages(pkt)

      subscribeToNodeServerMessage(pkt, "node.server_starting", InstanceStatus.STARTING)
      subscribeToNodeServerMessage(pkt, "node.server_started", InstanceStatus.STARTED)
      subscribeToNodeServerMessage(pkt, "node.server_stopping", InstanceStatus.STOPPING)
      subscribeToNodeServerMessage(pkt, "node.server_stopped", InstanceStatus.STOPPED)

      subscribeToNodeStatusMessages(pkt)
      Await.result(pkt.send(), 10.seconds)
    } catch {
      case e: Throwable =>
        // if this failed, we should disconnect and try again later
        log.error("failed to setup connection", e)
        cxn.close()
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
  private def addSubscription(mgr: ManagerServer, message: String)(listener: Message => Unit) {
    val id = getMessageId
    val ctx = mgr.context
    mgr.subscribeToNamedMessage(message, id, active = true)
    mgr.cxn.addMessageListener {
      case msg @ Message(src, `ctx`, `id`, data) => listener(msg)
    }
  }

  /**
   * Subscribe to server connection messages
   * @param req
   */
  private def subscribeToServerConnectMessages(mgr: ManagerServer) {
    addSubscription(mgr, "Server Connect") {
      case Message(_, _, _, Cluster(_, Str(server))) =>
        for (sink <- sinkOpt) sink(Msg.wrap(new ServerConnectMessage(server)))
    }
  }

  /**
   * Subscribe to server disconnection messages
   * @param req
   */
  private def subscribeToServerDisconnectMessages(mgr: ManagerServer) {
    addSubscription(mgr, "Server Disconnect") {
      case Message(_, _, _, Cluster(_, Str(server))) =>
        for (sink <- sinkOpt) sink(Msg.wrap(new ServerDisconnectMessage(server)))
    }
  }

  private def subscribeToNodeServerMessage(mgr: ManagerServer, messageName: String, status: InstanceStatus) {
    addSubscription(mgr, messageName) {
      case Message(_, _, _, data) =>
        val map = parseNodeMessage(data)
        val node = map("node").get[String]
        val server = map("server").get[String]
        val instance = map("instance").get[String]
        for (sink <- sinkOpt) sink(Msg.wrap(new NodeServerMessage(node, server, instance, status)))
    }
  }

  /**
   * Subscribe to status messages from node servers
   * @param req
   */
  private def subscribeToNodeStatusMessages(mgr: ManagerServer) {
    addSubscription(mgr, "node.status") {
      case Message(_, _, _, data) =>
        val map = parseNodeMessage(data)
        val node = map("node").get[String]
        val serversData = map("servers")
        val statuses = NodeController.getServerStatuses(serversData).map { _.toJava }.toArray
        for (sink <- sinkOpt) sink(Msg.wrap(new NodeStatusMessage(node, statuses)))
    }
  }

  /**
   * Parse messages coming from the nodes, which contain several key-value pairs
   * @param msg
   * @return
   */
  private def parseNodeMessage(msg: Data): Map[String, Data] = {
    val (src, payload) = msg.get[(Long, Data)]
    payload.clusterIterator.map(_.get[(String, Data)]).toMap
  }

}
