package org.labrad.browser.client.grapher;

import java.io.Serializable;

@SuppressWarnings("serial")
public class DirectoryListing implements Serializable {
  private String[] dirs;
  private String[] datasets;

  protected DirectoryListing() {}

  public DirectoryListing(String[] dirs, String[] datasets) {
    this.dirs = dirs;
    this.datasets = datasets;
  }

  public String[] getDirs() { return dirs; }
  public String[] getDatasets() { return datasets; }
}
