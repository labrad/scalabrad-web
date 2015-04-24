package org.labrad.browser.client.iplist;

import com.google.gwt.user.client.rpc.RemoteService;
import com.google.gwt.user.client.rpc.RemoteServiceRelativePath;

@RemoteServiceRelativePath("ip")
public interface IpListService extends RemoteService {
  public IpAddress[] getIpList();
  public IpAddress[] addToWhitelist(String ip);
  public IpAddress[] addToBlacklist(String ip);
}
