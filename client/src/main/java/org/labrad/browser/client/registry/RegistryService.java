package org.labrad.browser.client.registry;

import java.util.List;

import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.QueryParam;

import org.fusesource.restygwt.client.MethodCallback;
import org.fusesource.restygwt.client.RestService;

public interface RegistryService extends RestService {
  @Path("/api/registry/dir")
  @GET
  void getListing(
    @QueryParam("path") List<String> path,
    MethodCallback<RegistryListing> callback);

  @Path("/api/registry/set")
  @POST
  void set(
    @QueryParam("path") List<String> path,
    @QueryParam("key") String key,
    @QueryParam("value") String value,
    MethodCallback<RegistryListing> callback);

  @Path("/api/registry/del")
  @POST
  void del(
    @QueryParam("path") List<String> path,
    @QueryParam("dir") String dir,
    MethodCallback<RegistryListing> callback);

  @Path("/api/registry/mkdir")
  @POST
  void mkdir(
    @QueryParam("path") List<String> path,
    @QueryParam("dir") String dir,
    MethodCallback<RegistryListing> callback);

  @Path("/api/registry/rmdir")
  @POST
  void rmdir(
    @QueryParam("path") List<String> path,
    @QueryParam("dir") String dir,
    MethodCallback<RegistryListing> callback);

  @Path("/api/registry/rename")
  @POST
  void rename(
    @QueryParam("path") List<String> path,
    @QueryParam("key") String key,
    @QueryParam("newKey") String newKey,
    MethodCallback<RegistryListing> callback);

  @Path("/api/registry/renameDir")
  @POST
  void renameDir(
    @QueryParam("path") List<String> path,
    @QueryParam("dir") String dir,
    @QueryParam("newDir") String newDir,
    MethodCallback<RegistryListing> callback);

  @Path("/api/registry/copy")
  @POST
  void copy(
    @QueryParam("path") List<String> path,
    @QueryParam("key") String key,
    @QueryParam("newPath") List<String> newPath,
    @QueryParam("newKey") String newKey,
    MethodCallback<RegistryListing> callback);

  @Path("/api/registry/copyDir")
  @POST
  void copyDir(
    @QueryParam("path") List<String> path,
    @QueryParam("dir") String dir,
    @QueryParam("newPath") List<String> newPath,
    @QueryParam("newDir") String newDir,
    MethodCallback<RegistryListing> callback);

  @Path("/api/registry/move")
  @POST
  void move(
    @QueryParam("path") List<String> path,
    @QueryParam("key") String key,
    @QueryParam("newPath") List<String> newPath,
    @QueryParam("newKey") String newKey,
    MethodCallback<RegistryListing> callback);

  @Path("/api/registry/moveDir")
  @POST
  void moveDir(
    @QueryParam("path") List<String> path,
    @QueryParam("dir") String dir,
    @QueryParam("newPath") List<String> newPath,
    @QueryParam("newDir") String newDir,
    MethodCallback<RegistryListing> callback);

  @Path("/api/registry/watch")
  @POST
  void watchRegistryPath(
    @QueryParam("id") String id,
    @QueryParam("watchId") String watchId,
    @QueryParam("path") String path,
    MethodCallback<Void> callback);

  @Path("/api/registry/unwatch")
  @POST
  void unwatchRegistryPath(
    @QueryParam("id") String id,
    @QueryParam("watchId") String watchId,
    MethodCallback<Void> callback);
}
