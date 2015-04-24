package org.labrad.browser.client.message;

import com.google.gwt.user.client.rpc.IsSerializable;

public class NodeServerStatus implements IsSerializable {
  private String name;
  private String description;
  private String version;
  private String instanceName;
  private String[] environmentVars;
  private String[] instances;

  protected NodeServerStatus() {}

  public NodeServerStatus(String name, String description, String version, String instanceName, String[] envVars, String[] instances) {
    this.name = name;
    this.description = description;
    this.version = version;
    this.instanceName = instanceName;
    this.environmentVars = envVars;
    this.instances = instances;
  }

  public String getName() {
    return name;
  }

  public String getDescription() {
    return description;
  }

  public String getVersion() {
    return version;
  }

  public String getInstanceName() {
    return instanceName;
  }

  public String[] getEnvironmentVars() {
    return environmentVars;
  }

  public String[] getInstances() {
    return instances;
  }
}
