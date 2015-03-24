package org.labrad.browser.client.registry

import com.google.gwt.user.client.rpc.AsyncCallback
import com.google.gwt.user.client.rpc.RemoteService
import com.google.gwt.user.client.rpc.RemoteServiceRelativePath

@RemoteServiceRelativePath(RegistryService.PATH) interface RegistryService extends RemoteService {
  public static String PATH = "registry"

  def RegistryListing getListing(String[] path)
  def RegistryListing set(String[] path, String key, String value) throws RegistryError
  def RegistryListing del(String[] path, String key) throws RegistryError
  def RegistryListing mkdir(String[] path, String dir) throws RegistryError
  def RegistryListing rmdir(String[] path, String dir) throws RegistryError
  def RegistryListing copy(String[] path, String key, String[] newPath, String newKey) throws RegistryError
  def RegistryListing copyDir(String[] path, String dir, String[] newPath, String newDir) throws RegistryError
  def RegistryListing rename(String[] path, String key, String newKey) throws RegistryError
  def RegistryListing renameDir(String[] path, String dir, String newDir) throws RegistryError
  def RegistryListing move(String[] path, String key, String[] newPath, String newKey) throws RegistryError
  def RegistryListing moveDir(String[] path, String dir, String[] newPath, String newDir) throws RegistryError
  def void watchRegistryPath(String eventStream, String watchId, String path)
  def void unwatchRegistryPath(String eventStream, String watchId)
}

interface RegistryServiceAsync {
  def void getListing(String[] path, AsyncCallback<RegistryListing> callback)
  def void set(String[] path, String key, String value, AsyncCallback<RegistryListing> callback)
  def void del(String[] path, String dir, AsyncCallback<RegistryListing> callback)
  def void mkdir(String[] path, String dir, AsyncCallback<RegistryListing> callback)
  def void rmdir(String[] path, String dir, AsyncCallback<RegistryListing> callback)
  def void rename(String[] path, String key, String newKey, AsyncCallback<RegistryListing> callback)
  def void renameDir(String[] path, String dir, String newDir, AsyncCallback<RegistryListing> callback)
  def void copy(String[] path, String key, String[] newPath, String newKey, AsyncCallback<RegistryListing> callback)
  def void copyDir(String[] path, String dir, String[] newPath, String newDir, AsyncCallback<RegistryListing> callback)
  def void move(String[] path, String key, String[] newPath, String newKey, AsyncCallback<RegistryListing> callback)
  def void moveDir(String[] path, String dir, String[] newPath, String newDir, AsyncCallback<RegistryListing> callback)
  def void watchRegistryPath(String eventStream, String watchId, String path, AsyncCallback<Void> callback)
  def void unwatchRegistryPath(String eventStream, String watchId, AsyncCallback<Void> callback)
}

@SuppressWarnings("serial")
class RegistryError extends Exception {
  protected new() {
  }

  new(String message) {
    super(message)
  }
}
