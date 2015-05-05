package org.labrad.browser.client.registry;

import java.util.List;

import com.google.gwt.user.client.rpc.IsSerializable;

public class RegistryListing implements IsSerializable {
  public List<String> path;
  public List<String> dirs;
  public List<String> keys;
  public List<String> vals;

  protected RegistryListing() {}

  public RegistryListing(List<String> path, List<String> dirs, List<String> keys, List<String> vals) {
    this.path = path;
    this.dirs = dirs;
    this.keys = keys;
    this.vals = vals;
  }
}
