package org.labrad.browser

import java.util.{Timer, TimerTask}
import org.labrad._
import org.labrad.browser.jsonrpc.Notify
import org.labrad.data._
import org.labrad.events.{ConnectionEvent, ConnectionListener, MessageEvent, MessageListener}
import org.labrad.util.Logging
import scala.concurrent.{Await, ExecutionContext, Future}
import scala.concurrent.duration._

object LabradConnection {
  val timer = new Timer(true)
}

trait LabradClientApi {
  @Notify("org.labrad.connected")
  def connected(host: String): Unit

  @Notify("org.labrad.disconnected")
  def disconnected(host: String): Unit

  @Notify("org.labrad.serverConnected")
  def serverConnected(name: String): Unit

  @Notify("org.labrad.serverDisconnected")
  def serverDisconnected(name: String): Unit
}

class LabradConnection(client: LabradClientApi, nodeClient: NodeClientApi)(implicit ec: ExecutionContext) extends Logging {
  private val RECONNECT_TIMEOUT = 10.seconds

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
        client.connected(cxn.host)

      case false =>
        log.info("disconnected.  will reconnect in 10 seconds")
        this.cxnOpt = None
        client.disconnected(cxn.host)

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

      subscribeToNodeServerMessage(pkt, "node.server_starting", "STARTING") //InstanceStatus.STARTING)
      subscribeToNodeServerMessage(pkt, "node.server_started", "STARTED") //InstanceStatus.STARTED)
      subscribeToNodeServerMessage(pkt, "node.server_stopping", "STOPPING") //InstanceStatus.STOPPING)
      subscribeToNodeServerMessage(pkt, "node.server_stopped", "STOPPED") //InstanceStatus.STOPPED)

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
        client.serverConnected(server)
    }
  }

  /**
   * Subscribe to server disconnection messages
   * @param req
   */
  private def subscribeToServerDisconnectMessages(mgr: ManagerServer) {
    addSubscription(mgr, "Server Disconnect") {
      case Message(_, _, _, Cluster(_, Str(server))) =>
        client.serverDisconnected(server)
    }
  }

  private def subscribeToNodeServerMessage(mgr: ManagerServer, messageName: String, status: String /*InstanceStatus*/) {
    addSubscription(mgr, messageName) {
      case Message(_, _, _, data) =>
        val map = parseNodeMessage(data)
        val node = map("node").get[String]
        val server = map("server").get[String]
        val instance = map("instance").get[String]
        nodeClient.serverStatus(node, server, instance, status)
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
        val statuses = NodeApi.getServerStatuses(serversData)
        nodeClient.nodeStatus(node, statuses)
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
