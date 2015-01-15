package org.labrad.browser.client.registry;

import com.google.gwt.user.client.rpc.RemoteService;
import com.google.gwt.user.client.rpc.RemoteServiceRelativePath;

@RemoteServiceRelativePath(RegistryService.PATH)
public interface RegistryService extends RemoteService {
  public static String PATH = "registry";
  public RegistryListing getListing(String[] path);
  public RegistryListing set(String[] path, String key, String value) throws RegistryError;
  public RegistryListing del(String[] path, String key) throws RegistryError;
  public RegistryListing mkdir(String[] path, String dir) throws RegistryError;
  public RegistryListing rmdir(String[] path, String dir) throws RegistryError;
  public RegistryListing copy(String[] path, String key, String[] newPath, String newKey) throws RegistryError;
  public RegistryListing copyDir(String[] path, String dir, String[] newPath, String newDir) throws RegistryError;
  public RegistryListing rename(String[] path, String key, String newKey) throws RegistryError;
  public RegistryListing renameDir(String[] path, String dir, String newDir) throws RegistryError;
  public RegistryListing move(String[] path, String key, String[] newPath, String newKey) throws RegistryError;
  public RegistryListing moveDir(String[] path, String dir, String[] newPath, String newDir) throws RegistryError;
  public void watchRegistryPath(String eventStream, String watchId, String path);
  public void unwatchRegistryPath(String eventStream, String watchId);
}
