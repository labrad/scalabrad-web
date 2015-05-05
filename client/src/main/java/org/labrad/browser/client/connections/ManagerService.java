package org.labrad.browser.client.connections;

import java.util.List;

import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;

import org.fusesource.restygwt.client.MethodCallback;
import org.fusesource.restygwt.client.RestService;

public interface ManagerService extends RestService {
  @Path("/api/manager/connections")
  @GET
  void getConnectionInfo(MethodCallback<List<ConnectionInfo>> callback);

  @Path("/api/manager/connections/{id}")
  @DELETE
  void closeConnection(@PathParam("id") Long id, MethodCallback<Void> callback);
}