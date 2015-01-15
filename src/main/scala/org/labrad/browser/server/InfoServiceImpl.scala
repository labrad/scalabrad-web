package org.labrad.browser.server

import javax.inject.Singleton
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
import scala.concurrent.duration._

import org.labrad.Connection
import org.labrad.browser.client.server.{InfoService, ServerInfo, SettingInfo}
import org.labrad.data._

import com.google.gwt.user.server.rpc.RemoteServiceServlet

@Singleton
class InfoServiceImpl extends AsyncServlet with InfoService {

  override def getServerInfo(name: String) = future {
    val mgr = LabradConnection.to("Manager")
    val pkt = mgr.packet
    val idFuture = pkt.call("Lookup", Str(name)).map(_.getUInt)
    val helpFuture = pkt.call("Help", Str(name)).map { case Cluster(Str(doc), Str(remarks)) => (doc, remarks) }
    val settingFuture = pkt.call("Settings", Str(name))
    pkt.send

    for {
      id <- idFuture
      (doc, remarks) <- helpFuture
      settingData <- settingFuture
      settings <- Future.sequence {
        settingData.get[Seq[Data]].map {
          case Cluster(UInt(settingId), Str(settingName)) =>
            mgr.call("Help", Str(name), Str(settingName)).map { settingHelp =>
              val Cluster(Str(settingDoc), Arr(accepted @ _*), Arr(returned @ _*), Str(settingRemarks)) = settingHelp
              new SettingInfo(settingId, settingName, settingDoc + "\n\n" + settingRemarks, accepted.map(_.getString).toArray, returned.map(_.getString).toArray)
            }
        }
      }
    } yield new ServerInfo(id, name, doc + "\n\n" + remarks, "", name, Array(), Array(), settings.toArray)
  }

}

