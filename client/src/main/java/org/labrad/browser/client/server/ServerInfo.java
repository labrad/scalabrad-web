package org.labrad.browser.client.server;

import com.google.gwt.user.client.rpc.IsSerializable;

public class ServerInfo implements IsSerializable {
  private long id;
  private String name;
  private String description;
  private String version;
  private String instanceName;
  private String[] environmentVars;
  private String[] instances;
  private SettingInfo[] settings;

  protected ServerInfo() {}

  public ServerInfo(
      long id,
      String name,
      String description,
      String version,
      String instanceName,
      String[] environmentVars,
      String[] instances,
      SettingInfo[] settings) {
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
  public String getName() { return name; }
  public String getDescription() { return description; }
  public String getVersion() { return version; }
  public String getInstanceName() { return instanceName; }
  public String[] getEnvironmentVars() { return environmentVars; }
  public String[] getInstances() { return instances; }
  public SettingInfo[] getSettings() { return settings; }
}
