package org.labrad.browser.client.message;

public class RegistryDirMessage implements Message {

  private String path;
  private String name;
  private boolean addOrChange;

  protected RegistryDirMessage() {}

  public RegistryDirMessage(String path, String name, boolean addOrChange) {
    this.path = path;
    this.name = name;
    this.addOrChange = addOrChange;
  }

  public String getPath() {
    return path;
  }

  public String getName() {
    return name;
  }

  public boolean isAddOrChange() {
    return addOrChange;
  }

  @Override
  public String toString() {
    return "path: " + path + ", dir: '" + name + "' deleted";
  }
}
