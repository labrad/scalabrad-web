package org.labrad.browser.client.server;

import java.util.List;

import com.google.gwt.user.client.rpc.IsSerializable;

public class ServerInfo implements IsSerializable {
  private long id;
  private String name;
  private String description;
  private String version;
  private String instanceName;
  private List<String> environmentVars;
  private List<String> instances;
  private List<SettingInfo> settings;

  protected ServerInfo() {}

  public ServerInfo(
      long id,
      String name,
      String description,
      String version,
      String instanceName,
      List<String> environmentVars,
      List<String> instances,
      List<SettingInfo> settings) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.version = version;
    this.instanceName = instanceName;
    this.environmentVars = environmentVars;
    this.instances = instances;
    this.settings = settings;
  }

  public long getId() { return id; }
  public void setId(long id) { this.id = id; }

  public String getName() { return name; }
  public void setName(String name) { this.name = name; }

  public String getDescription() { return description; }
  public void setDescription(String desc) { this.description = desc; }

  public String getVersion() { return version; }
  public void setVersion(String version) { this.version = version; }

  public String getInstanceName() { return instanceName; }
  public void setInstanceName(String n) { this.instanceName = n; }

  public List<String> getEnvironmentVars() { return environmentVars; }
  public void setEnvironmentVars(List<String> vars) { this.environmentVars = vars; }

  public List<String> getInstances() { return instances; }
  public void setInstances(List<String> instances) { this.instances = instances; }

  public List<SettingInfo> getSettings() { return settings; }
  public void setSettings(List<SettingInfo> settings) { this.settings = settings; }
}
