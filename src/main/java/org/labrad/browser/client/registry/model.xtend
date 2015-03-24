package org.labrad.browser.client.registry

import com.google.gwt.user.client.rpc.IsSerializable

class RegistryListing implements IsSerializable {
  String[] path
  String[] dirs
  String[] keys
  String[] vals

  protected new() {}

  new(String[] path, String[] dirs, String[] keys, String[] vals) {
    this.path = path
    this.dirs = dirs
    this.keys = keys
    this.vals = vals
  }

  def String[] getPath() { path }
  def String[] getDirs() { dirs }
  def String[] getKeys() { keys }
  def String[] getVals() { vals }
}

interface TableRow {}

class DirectoryTableRow implements TableRow {
  String name

  new(String name) {
    this.name = name
  }

  def String getName() { name }
}

class KeyTableRow implements TableRow {
  String key
  String value

  new(String key, String value) {
    this.key = key
    this.value = value
  }

  def String getKey() { key }
  def String getValue() { value }
}
