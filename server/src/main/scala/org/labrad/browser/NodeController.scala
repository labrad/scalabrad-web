package org.labrad.browser

import javax.inject._
import org.labrad.browser.client.message.NodeServerStatus
import org.labrad.browser.server.LabradConnectionHolder
import org.labrad.data._
import org.labrad.util.Logging
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import play.api.libs.json._
import play.api.mvc._
import scala.async.Async.{async, await}
import scala.concurrent.Future

object NodeController {
  // json response types
  case class ServerStatus(name: String, description: String, version: String, instanceName: String, environmentVars: Seq[String], instances: Seq[String]) {
    def toJava: NodeServerStatus = {
      new NodeServerStatus(name, description, version, instanceName, environmentVars.toArray, instances.toArray)
    }
  }
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

class NodeController @Inject() (cxnHolder: LabradConnectionHolder) extends Controller with Logging {
  import NodeController._

  def allNodes = Action.async { request =>
    async {
      val serverData = await { cxnHolder.cxn.manager.servers() }
      val servers = serverData.map { case (id, name) => name }

      val nodes = servers.filter(_.toLowerCase.startsWith("node"))
      val futures = nodes.map { node =>
        cxnHolder.cxn.to(node).call("status").map((node, _))
      }
      val results = await { Future.sequence(futures) }

      val statuses = results.map { case (node, servers) =>
        NodeStatus(node, getServerStatuses(servers))
      }

      Ok(Json.toJson(statuses))
    }
  }

  def refreshNode(node: String) = Action.async {
    log.info(s"refreshServers. node=$node")
    cxnHolder.cxn.to(node).call("refresh_servers").map { _ =>
      Ok(Json.toJson("refreshed"))
    }
  }

  def restartServer(node: String, server: String) = doRequest(node, server, "restart")
  def startServer(node: String, server: String) = doRequest(node, server, "start")
  def stopServer(node: String, server: String) = doRequest(node, server, "stop")

  private def doRequest(node: String, server: String, action: String) = Action.async {
    val pkt = cxnHolder.cxn.to(node).packet()
    val req = pkt.call(action, Str(server))
    pkt.send
    req.map { r => Ok(Json.toJson(r.getString)) }
  }
}
