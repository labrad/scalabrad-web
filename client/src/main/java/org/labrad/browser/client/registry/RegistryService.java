package org.labrad.browser.client.registry;

import java.util.List;

import javax.ws.rs.Consumes;
import javax.ws.rs.POST;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;
import javax.ws.rs.QueryParam;

import org.fusesource.restygwt.client.MethodCallback;
import org.fusesource.restygwt.client.RestService;

public interface RegistryService extends RestService {
  static class Set {
    public List<String> path;
    public String key;
    public String value;

    protected Set() {}
    public Set(List<String> path, String key, String value) {
      this.path = path;
      this.key = key;
      this.value = value;
    }
  }

  static class Del {
    public List<String> path;
    public String key;

    protected Del() {}
    public Del(List<String> path, String key) {
      this.path = path;
      this.key = key;
    }
  }

  static class MkDir {
    public List<String> path;
    public String dir;

    protected MkDir() {}
    public MkDir(List<String> path, String dir) {
      this.path = path;
      this.dir = dir;
    }
  }

  static class RmDir {
    public List<String> path;
    public String dir;

    protected RmDir() {}
    public RmDir(List<String> path, String dir) {
      this.path = path;
      this.dir = dir;
    }
  }

  static class Rename {
    public List<String> path;
    public String key;
    public String newKey;

    protected Rename() {}
    public Rename(List<String> path, String key, String newKey) {
      this.path = path;
      this.key = key;
      this.newKey = newKey;
    }
  }

  static class RenameDir {
    public List<String> path;
    public String dir;
    public String newDir;

    protected RenameDir() {}
    public RenameDir(List<String> path, String dir, String newDir) {
      this.path = path;
      this.dir = dir;
      this.newDir = newDir;
    }
  }

  static class Copy {
    public List<String> path;
    public String key;
    public List<String> newPath;
    public String newKey;

    protected Copy() {}
    public Copy(List<String> path, String key, List<String> newPath, String newKey) {
      this.path = path;
      this.key = key;
      this.newPath = newPath;
      this.newKey = newKey;
    }
  }

  static class CopyDir {
    public List<String> path;
    public String dir;
    public List<String> newPath;
    public String newDir;

    protected CopyDir() {}
    public CopyDir(List<String> path, String dir, List<String> newPath, String newDir) {
      this.path = path;
      this.dir = dir;
      this.newPath = newPath;
      this.newDir = newDir;
    }
  }

  static class Move {
    public List<String> path;
    public String key;
    public List<String> newPath;
    public String newKey;

    protected Move() {}
    public Move(List<String> path, String key, List<String> newPath, String newKey) {
      this.path = path;
      this.key = key;
      this.newPath = newPath;
      this.newKey = newKey;
    }
  }

  static class MoveDir {
    public List<String> path;
    public String dir;
    public List<String> newPath;
    public String newDir;

    protected MoveDir() {}
    public MoveDir(List<String> path, String dir, List<String> newPath, String newDir) {
      this.path = path;
      this.dir = dir;
      this.newPath = newPath;
      this.newDir = newDir;
    }
  }

  static class Watch {
    public String id;
    public String watchId;
    public String path;

    protected Watch() {}
    public Watch(String id, String watchId, String path) {
      this.id = id;
      this.watchId = watchId;
      this.path = path;
    }
  }

  static class Unwatch {
    public String id;
    public String watchId;

    protected Unwatch() {}
    public Unwatch(String id, String watchId) {
      this.id = id;
      this.watchId = watchId;
    }
  }

  @POST @Path("/registry/dir") @Consumes("application/json") @Produces("application/json")
  void dir(List<String> path, MethodCallback<RegistryListing> callback);

  @POST @Path("/registry/set") @Consumes("application/json") @Produces("application/json")
  void set(Set req, MethodCallback<RegistryListing> callback);

  @POST @Path("/registry/del") @Consumes("application/json") @Produces("application/json")
  void del(Del req, MethodCallback<RegistryListing> callback);

  @POST @Path("/registry/mkdir") @Consumes("application/json") @Produces("application/json")
  void mkdir(MkDir req, MethodCallback<RegistryListing> callback);

  @POST @Path("/registry/rmdir") @Consumes("application/json") @Produces("application/json")
  void rmdir(RmDir req, MethodCallback<RegistryListing> callback);

  @POST @Path("/registry/rename") @Consumes("application/json") @Produces("application/json")
  void rename(Rename req, MethodCallback<RegistryListing> callback);

  @POST @Path("/registry/renameDir") @Consumes("application/json") @Produces("application/json")
  void renameDir(RenameDir req, MethodCallback<RegistryListing> callback);

  @POST @Path("/registry/copy") @Consumes("application/json") @Produces("application/json")
  void copy(Copy req, MethodCallback<RegistryListing> callback);

  @POST @Path("/registry/copyDir") @Consumes("application/json") @Produces("application/json")
  void copyDir(CopyDir req, MethodCallback<RegistryListing> callback);

  @POST @Path("/registry/move") @Consumes("application/json") @Produces("application/json")
  void move(Move req, MethodCallback<RegistryListing> callback);

  @POST @Path("/registry/moveDir") @Consumes("application/json") @Produces("application/json")
  void moveDir(MoveDir req, MethodCallback<RegistryListing> callback);

  @POST @Path("/registry/watch") @Consumes("application/json") @Produces("application/json")
  void watchRegistryPath(Watch req, MethodCallback<String> callback);

  @POST @Path("/registry/unwatch") @Consumes("application/json") @Produces("application/json")
  void unwatchRegistryPath(Unwatch req, MethodCallback<String> callback);
}
