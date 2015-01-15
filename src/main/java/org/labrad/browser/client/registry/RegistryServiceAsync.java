package org.labrad.browser.client.registry;

import com.google.gwt.user.client.rpc.AsyncCallback;

public interface RegistryServiceAsync {
  void getListing(String[] path, AsyncCallback<RegistryListing> callback);
  void set(String[] path, String key, String value, AsyncCallback<RegistryListing> callback);
  void del(String[] path, String dir, AsyncCallback<RegistryListing> callback);
  void mkdir(String[] path, String dir, AsyncCallback<RegistryListing> callback);
  void rmdir(String[] path, String dir, AsyncCallback<RegistryListing> callback);
  void rename(String[] path, String key, String newKey, AsyncCallback<RegistryListing> callback);
  void renameDir(String[] path, String dir, String newDir, AsyncCallback<RegistryListing> callback);
  void copy(String[] path, String key, String[] newPath, String newKey, AsyncCallback<RegistryListing> callback);
  void copyDir(String[] path, String dir, String[] newPath, String newDir, AsyncCallback<RegistryListing> callback);
  void move(String[] path, String key, String[] newPath, String newKey, AsyncCallback<RegistryListing> callback);
  void moveDir(String[] path, String dir, String[] newPath, String newDir, AsyncCallback<RegistryListing> callback);

  void watchRegistryPath(String eventStream, String watchId, String path, AsyncCallback<Void> callback);
  void unwatchRegistryPath(String eventStream, String watchId, AsyncCallback<Void> callback);
}
