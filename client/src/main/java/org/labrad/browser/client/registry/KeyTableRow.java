package org.labrad.browser.client.registry;

import java.util.List;

public class KeyTableRow {
  private List<String> path;
  private String key;
  private String value;

  public KeyTableRow(final List<String> path, String key, String value) {
    this.path = path;
    this.key = key;
    this.value = value;
  }

  public List<String> getPath() {
    return path;
  }

  public String getKey() {
    return key;
  }

  public String getValue() {
    return value;
  }
}
