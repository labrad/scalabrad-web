package org.labrad.browser.server

import java.util.concurrent.ExecutionException
import javax.inject.Singleton
import scala.collection.JavaConversions._
import scala.concurrent.ExecutionContext.Implicits.global

import org.labrad.Connection
import org.labrad.browser.client.{IpAddress, IpListService}
import org.labrad.data.{Data, Request}

import com.google.gwt.user.server.rpc.RemoteServiceServlet

@Singleton
class IpListServiceImpl extends RemoteServiceServlet with IpListService {

  /**
   * Get a list of allowed and disallowed ip addresses.
   */
  def getIpList: Array[IpAddress] = {
//    val req = Request.to("Manager")
//    val whitelist = req.addRecord("Whitelist")
//    val blacklist = req.addRecord("Blacklist")
//
//    val ans = try {
//      LabradConnection.get.sendAndWait(req)
//    } catch {
//      case e: InterruptedException => throw new RuntimeException(e);
//      case e: ExecutionException => throw new RuntimeException(e)
//    }
//
//    val allowed =  for (addr <- ans.get(whitelist).getStringList) yield new IpAddress(addr, true)
//    val blocked = for (addr <- ans.get(blacklist).getStringList) yield new IpAddress(addr, false)
//
//    (allowed ++ blocked).sortBy(_.getAddress).toArray
    Array()
  }

  /**
   * Add an ip address to the blacklist
   */
  def addToBlacklist(ip: String): Array[IpAddress] = {
    //val cxn = LabradConnection.get
    //cxn.sendAndWait(Request.to("Manager").add("Blacklist", Data.valueOf(ip)))
    getIpList()
  }

  /**
   * Add an ip address to the whitelist
   */
  def addToWhitelist(ip: String): Array[IpAddress] = {
    //val cxn = LabradConnection.get
    //cxn.sendAndWait(Request.to("Manager").add("Whitelist", Data.valueOf(ip)))
    getIpList()
  }
}
