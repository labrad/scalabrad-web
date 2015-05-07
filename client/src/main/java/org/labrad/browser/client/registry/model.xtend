package org.labrad.browser.client.registry

interface TableRow {}

class ParentTableRow implements TableRow {}

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
