package org.labrad.browser.client.server

import com.google.gwt.user.client.rpc.IsSerializable

class ServerInfo implements IsSerializable {
  long id
  String name
  String description
  String version
  String instanceName
  String[] environmentVars
  String[] instances
  SettingInfo[] settings

  protected new() {}

  new(long id, String name, String description, String version, String instanceName, String[] environmentVars,
    String[] instances, SettingInfo[] settings) {
    this.id = id
    this.name = name
    this.description = description
    this.version = version
    this.instanceName = instanceName
    this.environmentVars = environmentVars
    this.instances = instances
    this.settings = settings
  }

  def long getId() { return id }
  def String getName() { return name }
  def String getDescription() { return description }
  def String getVersion() { return version }
  def String getInstanceName() { return instanceName }
  def String[] getEnvironmentVars() { return environmentVars }
  def String[] getInstances() { return instances }
  def SettingInfo[] getSettings() { return settings }
}

class SettingInfo implements IsSerializable {
  long id
  String name
  String doc
  String[] acceptedTypes
  String[] returnedTypes

  protected new() {}

  new(long id, String name, String doc, String[] acceptedTypes, String[] returnedTypes) {
    this.id = id
    this.name = name
    this.doc = doc
    this.acceptedTypes = acceptedTypes
    this.returnedTypes = returnedTypes
  }

  def long getId() { return id }
  def String getName() { return name }
  def String getDoc() { return doc }
  def String[] getAcceptedTypes() { return acceptedTypes }
  def String[] getReturnedTypes() { return returnedTypes }
}
