package org.labrad.browser.client.nodes;

import java.util.List;

import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;

import org.fusesource.restygwt.client.MethodCallback;
import org.fusesource.restygwt.client.RestService;
import org.labrad.browser.client.message.NodeStatusMessage;

public interface NodeService extends RestService {

  @Path("/nodes")
  @GET
  public void getNodeInfo(MethodCallback<List<NodeStatusMessage>> callback);

  @Path("/nodes/{node}/refresh")
  @POST
  public void refreshServers(@PathParam("node") String node, MethodCallback<String> callback);

  @Path("/nodes/{node}/servers/{server}/start")
  @POST
  public void startServer(@PathParam("node") String node, @PathParam("server") String server, MethodCallback<String> callback);

  @Path("/nodes/{node}/servers/{server}/stop")
  @POST
  public void stopServer(@PathParam("node") String node, @PathParam("server") String server, MethodCallback<String> callback);

  @Path("/nodes/{node}/servers/{server}/restart")
  @POST
  public void restartServer(@PathParam("node") String node, @PathParam("server") String server, MethodCallback<String> callback);
}
