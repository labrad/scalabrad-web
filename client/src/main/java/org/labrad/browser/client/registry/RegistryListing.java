package org.labrad.browser.client.registry;

import com.google.gwt.user.client.rpc.IsSerializable;

public class RegistryListing implements IsSerializable {
  private String[] path;
  private String[] dirs;
  private String[] keys;
  private String[] vals;

  protected RegistryListing() {}

  public RegistryListing(String[] path, String[] dirs, String[] keys, String[] vals) {
    this.path = path;
    this.dirs = dirs;
    this.keys = keys;
    this.vals = vals;
  }

  public String[] getPath() { return path; }
  public String[] getDirs() { return dirs; }
  public String[] getKeys() { return keys; }
  public String[] getVals() { return vals; }
}
