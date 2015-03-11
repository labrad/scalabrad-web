package org.labrad.browser.server

import java.util.concurrent.ExecutionException
import javax.inject.Singleton
import scala.collection.JavaConversions._
import scala.concurrent.ExecutionContext.Implicits.global

import org.labrad.Connection
import org.labrad.browser.client.iplist.{IpAddress, IpListService}
import org.labrad.data.{Data, Request}

import com.google.gwt.user.server.rpc.RemoteServiceServlet

@Singleton
class IpListServiceImpl extends RemoteServiceServlet with IpListService {

  /**
   * Get a list of allowed and disallowed ip addresses.
   */
  def getIpList: Array[IpAddress] = {
//    val pkt = LabradConnection.getManager.packet()
//    val whitelistF = pkt.whitelist()
//    val blacklistF = pkt.blacklist()
//
//    pkt.send()
//
//    for {
//      allowed <- whitelistF
//      blocked <- blacklistF
//    } yield (allowed ++ blocked).sortBy(_.address).toArray
//
    Array()
  }

  /**
   * Add an ip address to the blacklist
   */
  def addToBlacklist(ip: String): Array[IpAddress] = {
    //LabradConnection.getManager.blacklist(ip)
    getIpList()
  }

  /**
   * Add an ip address to the whitelist
   */
  def addToWhitelist(ip: String): Array[IpAddress] = {
    //LabradConnection.getManager.whitelist(ip)
    getIpList()
  }
}
