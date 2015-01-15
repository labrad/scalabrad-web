package org.labrad.browser.client;

import com.google.gwt.user.client.rpc.AsyncCallback;

public interface IpListServiceAsync {
  public void getIpList(AsyncCallback<IpAddress[]> callback);
  public void addToWhitelist(String ip, AsyncCallback<IpAddress[]> callback);
  public void addToBlacklist(String ip, AsyncCallback<IpAddress[]> callback);
}
