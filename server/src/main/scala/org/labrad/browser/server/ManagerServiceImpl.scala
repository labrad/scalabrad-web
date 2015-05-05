package org.labrad.browser.server

import javax.servlet.ServletContext

import com.fasterxml.jackson.databind.ObjectMapper
import javax.servlet.ServletContext
import javax.ws.rs.DELETE
import javax.ws.rs.GET
import javax.ws.rs.Path
import javax.ws.rs.PathParam
import javax.ws.rs.Produces
import javax.ws.rs.core.Context
import org.labrad.browser.client.connections.{ConnectionInfo, ManagerService}
import org.labrad.data._
import org.labrad.Connection
import org.slf4j.LoggerFactory
import scala.collection.JavaConverters._
import scala.concurrent.Await
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration._

trait Resource {
  @Context protected var context: ServletContext = _
  implicit def servletContext = context

  protected val mapper = new ObjectMapper
}

@Path("/manager/connections")
@Produces(Array("application/json"))
class ConnectionsResource extends Resource {

  @GET
  def getConnections(): String = {
    val infosF = LabradConnection.getManager.connectionInfo().map { infos =>
      infos.map {
        case (id, name, isServer, srvReq, srvRep, clReq, clRep, msgSend, msgRecv) =>
          new ConnectionInfo(id, name, isServer, true, srvReq, srvRep, clReq, clRep, msgSend, msgRecv)
      }
    }
    val infos = Await.result(infosF, 10.seconds)
    mapper.writeValueAsString(infos.asJava)
  }

  @Path("/{id}")
  @DELETE
  def closeConnection(@PathParam("id") id: Long): Unit = {
    Await.result(LabradConnection.getManager.call("Close Connection", UInt(id)).map { _ => () }, 10.seconds)
  }
}
