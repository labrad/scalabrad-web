package org.labrad.browser.client.event

import com.google.gwt.event.shared.EventHandler
import com.google.gwt.event.shared.GwtEvent
import com.google.gwt.user.client.rpc.IsSerializable

class RegistryKeyEvent extends GwtEvent<RegistryKeyEvent.Handler> implements IsSerializable {
  String path
  String name
  boolean addOrChange

  protected new() {
  }

  new(String path, String name, boolean addOrChange) {
    this.path = path
    this.name = name
    this.addOrChange = addOrChange
  }

  def String getPath() {
    path
  }

  def String getName() {
    name
  }

  def boolean isAddOrChange() {
    addOrChange
  }

  override String toString() {
    '''path: «path», key: "«name»" deleted'''
  }

  static interface Handler extends EventHandler {
    def void onRegistryKeyChanged(RegistryKeyEvent event)

  }

  public static val TYPE = new Type<Handler>

  override GwtEvent.Type<Handler> getAssociatedType() {
    TYPE
  }

  override protected void ^dispatch(Handler handler) {
    handler.onRegistryKeyChanged(this)
  }
}
