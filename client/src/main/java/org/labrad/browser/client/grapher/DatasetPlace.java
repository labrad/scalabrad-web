package org.labrad.browser.client.grapher;

import java.util.List;

public class DatasetPlace extends DataPlace {
  private List<String> path;
  private int num;

  public DatasetPlace(List<String> path, int num) {
    this.path = path;
    this.num = num;
  }

  public DatasetPlace(List<String> path, String dataset) {
    this(path, Integer.parseInt(dataset));
  }

  public List<String> getPath() {
    return path;
  }

  public int getNum() {
    return num;
  }
}
