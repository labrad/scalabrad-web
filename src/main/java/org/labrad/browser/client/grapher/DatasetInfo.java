package org.labrad.browser.client.grapher;

import java.io.Serializable;
import java.util.Map;

@SuppressWarnings("serial")
public class DatasetInfo implements Serializable {
  private String[] path;
  private String name;
  private int num;

  private String[] independents;
  private String[] dependents;

  private Map<String, String> parameters;

  protected DatasetInfo() {}

  public DatasetInfo(String[] path, String name, int num, String[] indeps, String[] deps,
      Map<String, String> params) {
    this.path = path;
    this.name = name;
    this.num = num;
    this.independents = indeps;
    this.dependents = deps;
    this.parameters = params;
  }

  public String[] getPath() { return path; }
  public String getName() { return name; }
  public int getNum() { return num; }
  public String[] getIndependents() { return independents; }
  public String[] getDependents() { return dependents; }
  public Map<String, String> getParameters() { return parameters; }
}
