package org.labrad.browser.client.registry;

import java.util.List;

public class DirectoryTableRow {
  private List<String> path;
  private String name;

  public DirectoryTableRow(final List<String> path, String name) {
    this.path = path;
    this.name = name;
  }

  public String getName() {
    return name;
  }

  public List<String> getPath() {
    return path;
  }
}
