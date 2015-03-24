package org.labrad.browser.client.event

import com.google.gwt.user.client.rpc.IsSerializable

class NodeServerStatus implements IsSerializable {
  String name
  String description
  String version
  String instanceName
  String[] environmentVars
  String[] instances

  new() {
  }

  def void setName(String name) {
    this.name = name
  }

  def void setDescription(String description) {
    this.description = description
  }

  def void setVersion(String version) {
    this.version = version
  }

  def void setInstanceName(String instanceName) {
    this.instanceName = instanceName
  }

  def void setEnvironmentVars(String[] environmentVars) {
    this.environmentVars = environmentVars
  }

  def void setInstances(String[] instances) {
    this.instances = instances
  }

  def String getName() {
    return name
  }

  def String getDescription() {
    return description
  }

  def String getVersion() {
    return version
  }

  def String getInstanceName() {
    return instanceName
  }

  def String[] getEnvironmentVars() {
    return environmentVars
  }

  def String[] getInstances() {
    return instances
  }

}
