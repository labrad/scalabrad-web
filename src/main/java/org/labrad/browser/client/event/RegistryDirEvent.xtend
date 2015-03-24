package org.labrad.browser.client.event

import com.google.gwt.event.shared.EventHandler
import com.google.gwt.event.shared.GwtEvent
import com.google.gwt.user.client.rpc.IsSerializable

class RegistryDirEvent extends GwtEvent<RegistryDirEvent.Handler> implements IsSerializable {
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
    return path
  }

  def String getName() {
    return name
  }

  def boolean isAddOrChange() {
    return addOrChange
  }

  override String toString() {
    return '''path: «path», dir: "«name»" deleted'''
  }

  static interface Handler extends EventHandler {
    def void onRegistryDirChanged(RegistryDirEvent event)

  }

  public static val TYPE = new Type<Handler>

  override GwtEvent.Type<Handler> getAssociatedType() {
    return TYPE
  }

  override protected void ^dispatch(Handler handler) {
    handler.onRegistryDirChanged(this)
  }

}
