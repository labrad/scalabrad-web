package org.labrad.browser.server

import com.fasterxml.jackson.databind.ObjectMapper
import javax.servlet.ServletContext
import org.labrad.Connection
import org.labrad.browser.client.server.{InfoService, ServerInfo, SettingInfo}
import org.labrad.data._
import scala.collection.JavaConverters._
import scala.concurrent.Await
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
import scala.concurrent.duration._
import javax.ws.rs.Path
import javax.ws.rs.Produces
import javax.ws.rs.core.Context
import javax.ws.rs.GET
import javax.ws.rs.PathParam

@Path("/servers")
@Produces(Array("application/json"))
class ServersResource extends Resource {

  @Path("/{name}")
  @GET
  def get(@PathParam("name") name: String): String = {
    val mgr = LabradConnection.getManager
    val pkt = mgr.packet()
    val idFuture = pkt.lookupServer(name)
    val helpFuture = pkt.serverHelp(name)
    val settingFuture = pkt.settings(name)
    pkt.send

    val infoF = for {
      id <- idFuture
      (doc, remarks) <- helpFuture
      settingIds <- settingFuture
      settings <- Future.sequence {
        settingIds.map { case (settingId, settingName) =>
          mgr.settingHelp(name, settingName).map { case (settingDoc, accepted, returned, settingRemarks) =>
            new SettingInfo(settingId, settingName, settingDoc + "\n\n" + settingRemarks, accepted.asJava, returned.asJava)
          }
        }
      }
    } yield new ServerInfo(id, name, doc + "\n\n" + remarks, "", name, Nil.asJava, Nil.asJava, settings.asJava)

    val info = Await.result(infoF, 10.seconds)
    mapper.writeValueAsString(info)
  }
}
