package org.labrad.browser.client.grapher

import java.util.Map
import com.google.gwt.user.client.rpc.IsSerializable

class DirectoryListing implements IsSerializable {
  String[] dirs
  String[] datasets

  protected new() {}

  new(String[] dirs, String[] datasets) {
    this.dirs = dirs
    this.datasets = datasets
  }

  def String[] getDirs() { dirs }
  def String[] getDatasets() { datasets }
}

class DatasetInfo implements IsSerializable {
  String[] path
  String name
  int num
  String[] independents
  String[] dependents
  Map<String, String> parameters

  protected new() {}

  new(String[] path, String name, int num, String[] indeps, String[] deps, Map<String, String> params) {
    this.path = path
    this.name = name
    this.num = num
    this.independents = indeps
    this.dependents = deps
    this.parameters = params
  }

  def String[] getPath() { path }
  def String getName() { name }
  def int getNum() { num }
  def String[] getIndependents() { independents }
  def String[] getDependents() { dependents }
  def Map<String, String> getParameters() { parameters }
}

class IndependentVariable implements IsSerializable {
  String name
  String label
  String units

  protected new() {}

  new(String name, String label, String units) {
    this.name = name
    this.label = label
    this.units = units
  }

  def String getName() { name }
  def String getLabel() { label }
  def String getUnits() { units }
}
