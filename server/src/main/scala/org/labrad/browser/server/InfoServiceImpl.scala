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
    val mgr = LabradConnection.getManager
    val pkt = mgr.packet()
    val idFuture = pkt.lookupServer(name)
    val helpFuture = pkt.serverHelp(name)
    val settingFuture = pkt.settings(name)
    pkt.send

    for {
      id <- idFuture
      (doc, remarks) <- helpFuture
      settingIds <- settingFuture
      settings <- Future.sequence {
        settingIds.map { case (settingId, settingName) =>
          mgr.settingHelp(name, settingName).map { case (settingDoc, accepted, returned, settingRemarks) =>
            new SettingInfo(settingId, settingName, settingDoc + "\n\n" + settingRemarks, accepted.toArray, returned.toArray)
          }
        }
      }
    } yield new ServerInfo(id, name, doc + "\n\n" + remarks, "", name, Array(), Array(), settings.toArray)
  }

}

