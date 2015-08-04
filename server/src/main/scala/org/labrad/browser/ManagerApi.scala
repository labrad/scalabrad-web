package org.labrad.browser

import org.labrad.data._
import play.api.libs.json._
import scala.concurrent.{ExecutionContext, Future}


case class ConnectionInfo(
  id: Long, name: String, server: Boolean, active: Boolean,
  serverReqCount: Long, serverRespCount: Long,
  clientReqCount: Long, clientRespCount: Long,
  msgSendCount: Long, msgRecvCount: Long
)

object ConnectionInfo {
  implicit val format = Json.format[ConnectionInfo]
}

case class SettingInfo(id: Long, name: String, doc: String, acceptedTypes: Seq[String], returnedTypes: Seq[String])

object SettingInfo {
  implicit val format = Json.format[SettingInfo]
}

case class ServerInfo(
  id: Long,
  name: String,
  description: String,
  version: String,
  instanceName: String,
  environmentVars: Seq[String],
  instances: Seq[String],
  settings: Seq[SettingInfo]
)

object ServerInfo {
  implicit val format = Json.format[ServerInfo]
}

class ManagerApi(cxn: LabradConnection)(implicit ec: ExecutionContext) {

  def connections(): Future[Seq[ConnectionInfo]] = {
    cxn.manager.connectionInfo().map { infos =>
      infos.map {
        case (id, name, isServer, srvReq, srvRep, clReq, clRep, msgSend, msgRecv) =>
          ConnectionInfo(id, name, isServer, true, srvReq, srvRep, clReq, clRep, msgSend, msgRecv)
      }
    }
  }

  def connectionClose(id: Long): Future[String] = {
    cxn.manager.call("Close Connection", UInt(id)).map { _ => "OK" }
  }

  def serverInfo(name: String): Future[ServerInfo] = {
    val mgr = cxn.manager
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
            SettingInfo(settingId, settingName, settingDoc + "\n\n" + settingRemarks, accepted, returned)
          }
        }
      }
    } yield {
      ServerInfo(id, name, doc + "\n\n" + remarks, "", name, Nil, Nil, settings)
    }
  }
}
