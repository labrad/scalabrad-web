package org.labrad.browser.client.server

import com.google.gwt.user.client.DOM
import com.google.gwt.user.client.ui.Composite
import de.itemis.xtend.auto.gwt.WithUiBinding

@WithUiBinding
class ServerView extends Composite {

  new(ServerInfo info) {
    initWidget(UI_BINDER.createAndBindUi(this))
    nameField.innerText = info.name
    id.innerText = Long.toString(info.id)
    doc.innerText = info.description
    for (setting : info.settings) {
      settings.add(new SettingView(setting))
    }
  }
}

@WithUiBinding
class SettingView extends Composite {

  new(SettingInfo info) {
    initWidget(UI_BINDER.createAndBindUi(this))

    name.innerText = info.name
    id.innerText = Long.toString(info.id)
    doc.innerText = info.doc

    for (type : info.acceptedTypes) {
      var child = DOM.createElement("li")
      child.innerText = type
      accepted.appendChild(child)
    }
    for (type : info.returnedTypes) {
      var child = DOM.createElement("li")
      child.innerText = type
      returned.appendChild(child)
    }
  }
}
