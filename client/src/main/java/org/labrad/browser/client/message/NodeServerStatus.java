package org.labrad.browser.client.message;

import com.google.gwt.user.client.rpc.IsSerializable;

public class NodeServerStatus implements IsSerializable {
  public String name;
  public String description;
  public String version;
  public String instanceName;
  public String[] environmentVars;
  public String[] instances;

  protected NodeServerStatus() {}

  public NodeServerStatus(String name, String description, String version, String instanceName, String[] envVars, String[] instances) {
    this.name = name;
    this.description = description;
    this.version = version;
    this.instanceName = instanceName;
    this.environmentVars = envVars;
    this.instances = instances;
  }
}
