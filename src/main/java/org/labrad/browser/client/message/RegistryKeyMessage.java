package org.labrad.browser.client.message;

public class RegistryKeyMessage implements Message {

  private String path;
  private String name;
  private boolean addOrChange;

  protected RegistryKeyMessage() {}

  public RegistryKeyMessage(String path, String name, boolean addOrChange) {
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
}
