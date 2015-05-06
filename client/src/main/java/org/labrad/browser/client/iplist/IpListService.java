package org.labrad.browser.client.iplist;

import java.util.List;

import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;

import org.fusesource.restygwt.client.MethodCallback;
import org.fusesource.restygwt.client.RestService;

public interface IpListService extends RestService {
  @GET @Path("/ips") @Produces("application/json")
  public void getIpList(MethodCallback<List<IpAddress>> callback);

  @PUT @Path("/ips/{name}") @Produces("application/json")
  public void addToWhitelist(String ip, MethodCallback<List<IpAddress>> callback);

  @DELETE @Path("/ips/{name}") @Produces("application/json")
  public void addToBlacklist(String ip, MethodCallback<List<IpAddress>> callback);
}
