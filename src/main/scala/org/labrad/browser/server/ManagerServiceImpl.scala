package org.labrad.browser.server

import javax.inject.Singleton
import javax.servlet.ServletContext

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration._

import org.labrad.Connection
import org.labrad.browser.client.connections.{ConnectionInfo, ManagerService}
import org.labrad.data._

import org.slf4j.LoggerFactory

@Singleton
class ManagerServiceImpl extends AsyncServlet with ManagerService {
  val log = LoggerFactory.getLogger(classOf[ManagerServiceImpl])

  def getConnectionInfo: Array[ConnectionInfo] = future {
    LabradConnection.getManager.connectionInfo().map { infos =>
      infos.toArray.map {
        case (id, name, isServer, srvReq, srvRep, clReq, clRep, msgSend, msgRecv) =>
          new ConnectionInfo(id, name, isServer, true, srvReq, srvRep, clReq, clRep, msgSend, msgRecv)
      }
    }
  }

  def closeConnection(id: Long): Unit = future {
    LabradConnection.getManager.call("Close Connection", UInt(id)).map { _ => () }
  }
}
