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

  public String getName() { return name; }
  public void setName(String name) { this.name = name; }

  public String getDescription() { return description; }
  public void setDescription(String description) { this.description = description; }

  public String getVersion() { return version; }
  public void setVersion(String version) { this.version = version; }

  public String getInstanceName() { return instanceName; }
  public void setInstanceName(String instanceName) { this.instanceName = instanceName; }

  public String[] getEnvironmentVars() { return environmentVars; }
  public void setEnvironmentVars(String[] vars) { this.environmentVars = vars; }

  public String[] getInstances() { return instances; }
  public void setInstances(String[] instances) { this.instances = instances; }
}
