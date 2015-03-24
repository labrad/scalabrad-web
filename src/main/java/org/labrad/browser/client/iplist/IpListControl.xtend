package org.labrad.browser.client.iplist

import com.google.gwt.user.client.rpc.AsyncCallback
import com.google.gwt.user.client.ui.Button
import com.google.gwt.user.client.ui.Grid
import com.google.gwt.user.client.ui.HorizontalPanel
import com.google.gwt.user.client.ui.TextBox
import com.google.gwt.user.client.ui.VerticalPanel
import com.google.inject.Inject
import org.labrad.browser.client.BrowserImages
import com.google.gwt.core.client.GWT
import com.google.gwt.user.client.ui.Image
import com.google.gwt.user.client.ui.PushButton
import com.google.gwt.user.client.ui.Label

class IpListControl extends VerticalPanel implements AsyncCallback<IpAddress[]> {
  TextBox address
  Grid ipTable
  IpListServiceAsync ipService

  @Inject
  new(IpListServiceAsync ipService) {
    this.ipService = ipService
    ipTable = null
    address = new TextBox => [
      addKeyPressHandler [
        if (charCode == Character.valueOf('\r').charValue) {
          addAddress()
        }
      ]
    ]
    val button = new Button("add to whitelist") => [
      addClickHandler [
        addAddress()
      ]
    ]

    var hp = new HorizontalPanel => [
      add(address)
      add(button)
    ]
    add(hp)
    fetchTable()
  }

  def void fetchTable() {
    ipService.getIpList(this)
  }

  def void whitelist(String addr) {
    ipService.addToWhitelist(addr, this)
  }

  def void blacklist(String addr) {
    ipService.addToBlacklist(addr, this)
  }

  override void onFailure(Throwable caught) {
    // nothing yet
  }

  override void onSuccess(IpAddress[] result) {
    makeTable(result)
  }

  def void makeTable(IpAddress[] ips) {
    if (ipTable != null) remove(ipTable)
    ipTable = new Grid(ips.length, 1)
    for (var int i = 0; i < ips.length; i++) {
      val ip = ips.get(i)
      ipTable.setWidget(i, 0, new IpEntry(this, ip.address, ip.isAllowed))
    }
    add(ipTable)
  }

  def void addAddress() {
    val addr = address.text
    if (addr.length > 0) {
      whitelist(addr)
    }
    address.text = ""
  }
}

class IpEntry extends HorizontalPanel {
  static final BrowserImages images = GWT.create(BrowserImages)

  new(IpListControl parent, String address, boolean allowed) {
    val img = new Image(if(allowed) images.ipAllowed else images.ipDisallowed)
    val button = new PushButton(img) => [
      addClickHandler [
        if (allowed) {
          parent.blacklist(address)
        } else {
          parent.whitelist(address)
        }
      ]
    ]
    add(button)
    val lbl = new Label(address)
    lbl.addStyleDependentName("padded")
    add(lbl)
  }

}
