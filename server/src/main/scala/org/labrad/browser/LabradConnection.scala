package org.labrad.browser

import java.util.{Timer, TimerTask}
import org.labrad._
import org.labrad.data._
import org.labrad.events.{ConnectionEvent, ConnectionListener, MessageEvent, MessageListener}
import org.labrad.util.Logging
import scala.collection.mutable
import scala.concurrent.{Await, ExecutionContext, Future}
import scala.concurrent.duration._

case class LabradConnectionConfig(hosts: Map[String, String])

object LabradConnection {
  val timer = new Timer(true)
}

trait LabradClientApi {
  def connected(host: String): Unit
  def disconnected(host: String): Unit
  def serverConnected(name: String): Unit
  def serverDisconnected(name: String): Unit
}

class LabradConnection(
  config: LabradConnectionConfig,
  client: LabradClientApi,
  nodeClient: NodeClientApi
)(implicit ec: ExecutionContext) extends Logging {
  private val RECONNECT_TIMEOUT = 10.seconds

  @volatile private var live: Boolean = true
  @volatile private var cxnOpt: Option[Connection] = None

  private var nextMessageId: Long = 1L

  private val lock = new Object
  private val setupFuncs = mutable.Buffer.empty[Connection => Unit]

  /**
   * Add a function that will be called on the connection once it is established
   */
  def onConnect(f: Connection => Unit): Unit = lock.synchronized {
    setupFuncs += f
  }

  def login(username: String, password: String, host: String/* = ""*/): Unit = {
    val hostname = config.hosts.get(host).getOrElse(host)
    if (hostname == host) {
      println(s"logging in to host: '$host'")
    } else {
      println(s"logging in to host: '$host' ($hostname)")
    }
    val cxn = hostname match {
      case "" => new Client("Browser", password = password.toCharArray)
      case host => new Client("Browser", host = host, password = password.toCharArray)
    }
    handleConnectionEvents(cxn)
    cxn.connect()
    runSetupFuncs(cxn)
  }

  def ping(): Unit = {
  }

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
        log.info(s"disconnected. will reconnect in $RECONNECT_TIMEOUT")
        this.cxnOpt = None
        client.disconnected(cxn.host)

        if (live) {
          // reconnect after some delay
          val newCxn = new Client("Browser", host = cxn.host, port = cxn.port, password = cxn.password)
          handleConnectionEvents(newCxn)
          doLater(RECONNECT_TIMEOUT) {
            startConnection(newCxn)
          }
        }
    }
  }

  private def runSetupFuncs(cxn: Connection) {
    lock.synchronized {
      log.info("running setup functions")
      for (func <- setupFuncs) {
        try {
          func(cxn)
        } catch {
          case e: Exception =>
            log.error("error in setup function", e)
        }
      }
    }
  }

  private def startConnection(cxn: Connection) {
    try {
      if (live) {
        cxn.addConnectionListener { case true =>
          runSetupFuncs(cxn)
        }
        cxn.connect()
      }
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

      subscribeToNodeServerMessage(pkt, "node.server_starting", "STARTING")
      subscribeToNodeServerMessage(pkt, "node.server_started", "STARTED")
      subscribeToNodeServerMessage(pkt, "node.server_stopping", "STOPPING")
      subscribeToNodeServerMessage(pkt, "node.server_stopped", "STOPPED")

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

  private def subscribeToNodeServerMessage(mgr: ManagerServer, messageName: String, status: String) {
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
