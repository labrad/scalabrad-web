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

  public String getPath() { return path; }
  public void setPath(String path) { this.path = path; }

  public String getName() { return name; }
  public void setName(String name) { this.name = name; }

  public boolean isAddOrChange() { return addOrChange; }
  public void setAddOrChange(boolean addOrChange) { this.addOrChange = addOrChange; }

  @Override
  public String toString() {
    return "path: " + path + ", dir: '" + name + "' deleted";
  }
}
