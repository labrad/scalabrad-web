package org.labrad.browser.client.message;

public class RegistryDirMessage implements Message {

  public String path;
  public String name;
  public boolean addOrChange;

  protected RegistryDirMessage() {}

  public RegistryDirMessage(String path, String name, boolean addOrChange) {
    this.path = path;
    this.name = name;
    this.addOrChange = addOrChange;
  }
}
