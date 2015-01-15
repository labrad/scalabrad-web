package org.labrad.browser.client;

import java.util.List;

public class ServerInfo {
  private String name;
  private String description;
  private String version;
  private String instanceName;
  private List<String> environmentVars;
  private List<String> instances;

  public ServerInfo(String name, String description, String version, String instanceName, List<String> environmentVars, List<String> instances) {
    this.name = name;
    this.description = description;
    this.version = version;
    this.instanceName = instanceName;
    this.environmentVars = environmentVars;
    this.instances = instances;
  }

  public String getName() { return name; }
  public String getDescription() { return description; }
  public String getVersion() { return version; }
  public String getInstanceName() { return instanceName; }
  public List<String> getEnvironmentVars() { return environmentVars; }
  public List<String> getInstances() { return instances; }
}
