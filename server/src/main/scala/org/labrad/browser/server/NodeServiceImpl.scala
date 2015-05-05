package org.labrad.browser.server

import com.fasterxml.jackson.databind.ObjectMapper
import java.util.concurrent.ExecutionException
import javax.ws.rs.GET
import javax.ws.rs.Path
import javax.ws.rs.PathParam
import javax.ws.rs.POST
import javax.ws.rs.Produces
import javax.ws.rs.core.Context
import org.labrad.Connection
import org.labrad.browser.client.message.{NodeServerStatus, NodeStatusMessage}
import org.labrad.browser.client.nodes.{NodeRequestError, NodeService}
import org.labrad.data._
import org.labrad.util.Logging
import scala.collection.JavaConverters._
import scala.concurrent.Await
import scala.concurrent.Future
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration._

object NodeServiceImpl {
  def getServerStatuses(servers: Data): Array[NodeServerStatus] = {
    servers.get[Array[(String, String, String, String, Array[String], Array[String])]].map {
      case (name, desc, ver, instName, env, instances) =>
        new NodeServerStatus(name, desc, ver, instName, env, instances)
    }
  }
}

@Path("/nodes")
class NodeResource extends Resource with Logging {

  @GET
  @Produces(Array("application/json"))
  def getNodeInfo: String = {
    val f = (for {
      serverData <- LabradConnection.getManager.servers()
      servers = serverData.map { case (id, name) => name }

      nodes <- Future.sequence {
        for (server <- servers if server.toLowerCase.startsWith("node")) yield
          LabradConnection.to(server).call("status").map((server, _))
      }
      statuses = nodes.map { case (server, status) =>
        new NodeStatusMessage(server, NodeServiceImpl.getServerStatuses(status))
      }
    } yield statuses).recover(oops("", "", "get_node_info"))
    val nodes = Await.result(f, 10.seconds)

    mapper.writeValueAsString(nodes.asJava)
  }

  @Path("/{node}/refresh")
  @POST
  def refreshServers(@PathParam("node") node: String): String = {
    log.info(s"refreshServers. node=$node")
    val f = LabradConnection.to(node).call("refresh_servers").map(_ => "").recover(oops(node, "", "refresh_servers"))
    Await.result(f, 10.seconds)
  }

  @Path("/{node}/servers/{server}/restart")
  @POST
  def restartServer(
    @PathParam("node") node: String,
    @PathParam("server") server: String
  ): String = doRequest(node, server, "restart")

  @Path("/{node}/servers/{server}/start")
  @POST
  def startServer(
    @PathParam("node") node: String,
    @PathParam("server") server: String
  ): String = doRequest(node, server, "start")

  @Path("/{node}/servers/{server}/stop")
  @POST
  def stopServer(
    @PathParam("node") node: String,
    @PathParam("server") server: String
  ): String = doRequest(node, server, "stop")

  private def doRequest(node: String, server: String, action: String): String = {
    val pkt = LabradConnection.to(node).packet()
    val req = pkt.call(action, Str(server))
    pkt.send
    val f = req.map { r => mapper.writeValueAsString(r.getString) }.recover(oops(node, server, action))
    Await.result(f, 10.seconds)
  }

  private def oops(node: String, server: String, action: String): PartialFunction[Throwable, Nothing] = {
    case e: ExecutionException =>
      throw new NodeRequestError(node, server, action, e.getCause.getMessage)
    case e: Throwable =>
      throw new NodeRequestError(node, server, action, e.getMessage)
  }

}
