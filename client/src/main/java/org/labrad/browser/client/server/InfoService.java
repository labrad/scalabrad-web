package org.labrad.browser.client.server;

import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;

import org.fusesource.restygwt.client.MethodCallback;
import org.fusesource.restygwt.client.RestService;

public interface InfoService extends RestService {
  @Path("/servers/{name}")
  @GET
  void getServerInfo(@PathParam("name") String name, MethodCallback<ServerInfo> callback);
}
