package org.labrad.browser.common.message;

import java.util.List;

public class RegistryKeyMessage implements Message {
  public List<String> path;
  public String name;
  public boolean addOrChange;

  protected RegistryKeyMessage() {}

  public RegistryKeyMessage(List<String> path, String name, boolean addOrChange) {
    this.path = path;
    this.name = name;
    this.addOrChange = addOrChange;
  }
}
