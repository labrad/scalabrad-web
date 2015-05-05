package org.labrad.browser.common.message;

public class RegistryKeyMessage implements Message {
  public String path;
  public String name;
  public boolean addOrChange;

  protected RegistryKeyMessage() {}

  public RegistryKeyMessage(String path, String name, boolean addOrChange) {
    this.path = path;
    this.name = name;
    this.addOrChange = addOrChange;
  }
}
