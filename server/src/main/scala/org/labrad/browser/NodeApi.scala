package org.labrad.browser

import org.labrad.data._
import org.labrad.util.Logging
import play.api.libs.json._
import scala.async.Async.{async, await}
import scala.concurrent.{ExecutionContext, Future}


object NodeApi {
  // json response types
  case class ServerStatus(name: String, description: String, version: String, instanceName: String, environmentVars: Seq[String], instances: Seq[String])
  object ServerStatus { implicit val format = Json.format[ServerStatus] }

  case class NodeStatus(name: String, servers: Seq[ServerStatus])
  object NodeStatus { implicit val format = Json.format[NodeStatus] }

  def getServerStatuses(servers: Data): Seq[ServerStatus] = {
    servers.get[Seq[(String, String, String, String, Seq[String], Seq[String])]].map {
      case (name, desc, ver, instName, env, instances) =>
        ServerStatus(name, desc, ver, instName, env, instances)
    }
  }
}

class NodeApi(cxn: LabradConnection)(implicit ec: ExecutionContext) extends Logging {
  import NodeApi._

  def allNodes(): Future[Seq[NodeStatus]] = {
    async {
      val serverData = await { cxn.manager.servers() }
      val servers = serverData.map { case (id, name) => name }

      val nodes = servers.filter(_.toLowerCase.startsWith("node "))
      val futures = nodes.map { node =>
        cxn.to(node).call("status").map((node, _))
      }
      val results = await { Future.sequence(futures) }

      results.map { case (node, servers) =>
        NodeStatus(node, getServerStatuses(servers))
      }
    }
  }

  def refreshNode(node: String): Future[String] = {
    log.info(s"refreshServers. node=$node")
    cxn.to(node).call("refresh_servers").map { _ =>
      "refreshed"
    }
  }

  def autostartNode(node: String): Future[String] = {
    cxn.to(node).call("autostart").map { _ =>
      "autostarted"
    }
  }

  def autostartList(node: String): Future[Seq[String]] = {
    async {
      val list = await { cxn.to(node).call("autostart_list") }
      list.get[Seq[String]]
    }
  }

  def autostartAdd(node: String): Future[String] = {
    cxn.to(node).call("autostart_add")
  }

  def autostartRemove(node: String): Future[String] = {
    cxn.to(node).call("autostart_remove")
  }

  def restartServer(node: String, server: String) = doRequest(node, server, "restart")
  def startServer(node: String, server: String) = doRequest(node, server, "start")
  def stopServer(node: String, server: String) = doRequest(node, server, "stop")

  private def doRequest(node: String, server: String, action: String): Future[String] = {
    val pkt = cxn.to(node).packet()
    val req = pkt.call(action, Str(server))
    pkt.send
    req.map { _.getString }
  }
}

trait NodeClientApi {
  import NodeApi._

  def nodeStatus(name: String, servers: Seq[ServerStatus]): Unit
  def serverStatus(node: String, server: String, instance: String, status: String /*InstanceStatus*/): Unit
}
