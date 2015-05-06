package org.labrad.browser.common.message;

import java.util.List;

public class RegistryDirMessage implements Message {
  public List<String> path;
  public String name;
  public boolean addOrChange;

  protected RegistryDirMessage() {}

  public RegistryDirMessage(List<String> path, String name, boolean addOrChange) {
    this.path = path;
    this.name = name;
    this.addOrChange = addOrChange;
  }
}
