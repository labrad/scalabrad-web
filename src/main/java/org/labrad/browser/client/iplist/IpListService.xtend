package org.labrad.browser.client.iplist

import com.google.gwt.user.client.rpc.AsyncCallback
import com.google.gwt.user.client.rpc.RemoteService
import com.google.gwt.user.client.rpc.RemoteServiceRelativePath

@RemoteServiceRelativePath("ip")
interface IpListService extends RemoteService {
  def IpAddress[] getIpList()
  def IpAddress[] addToWhitelist(String ip)
  def IpAddress[] addToBlacklist(String ip)
}

interface IpListServiceAsync {
  def void getIpList(AsyncCallback<IpAddress[]> callback)
  def void addToWhitelist(String ip, AsyncCallback<IpAddress[]> callback)
  def void addToBlacklist(String ip, AsyncCallback<IpAddress[]> callback)
}
