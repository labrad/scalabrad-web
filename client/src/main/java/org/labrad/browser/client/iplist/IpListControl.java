package org.labrad.browser.client.iplist;

import com.google.gwt.core.client.GWT;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.event.dom.client.KeyPressEvent;
import com.google.gwt.event.dom.client.KeyPressHandler;
import com.google.gwt.user.client.rpc.AsyncCallback;
import com.google.gwt.user.client.ui.Button;
import com.google.gwt.user.client.ui.Grid;
import com.google.gwt.user.client.ui.HorizontalPanel;
import com.google.gwt.user.client.ui.TextBox;
import com.google.gwt.user.client.ui.VerticalPanel;

public class IpListControl extends VerticalPanel implements AsyncCallback<IpAddress[]> {
  TextBox address;
  Grid ipTable;

  private static final IpListServiceAsync ipService = GWT.create(IpListService.class);

  public void fetchTable() {
    ipService.getIpList(this);
  }

  public void whitelist(String addr) {
    ipService.addToWhitelist(addr, this);
  }

  public void blacklist(String addr) {
    ipService.addToBlacklist(addr, this);
  }

  public void onFailure(Throwable caught) {
    // nothing yet
  }

  public void onSuccess(IpAddress[] result) {
    makeTable(result);
  }

  public void makeTable(IpAddress[] ips) {
    if (ipTable != null) remove(ipTable);
    ipTable = new Grid(ips.length, 1);
    for (int i = 0; i < ips.length; i++) {
      IpAddress ip = ips[i];
      ipTable.setWidget(i, 0, new IpEntry(this, ip.getAddress(), ip.isAllowed()));
    }
    add(ipTable);
  }

  public void addAddress() {
    String addr = address.getText();
    if (addr.length() > 0) {
      whitelist(addr);
    }
    address.setText("");
  }

  public IpListControl() {
    ipTable = null;

    address = new TextBox();
    address.addKeyPressHandler(new KeyPressHandler() {
      public void onKeyPress(KeyPressEvent event) {
        if (event.getCharCode() == '\r') {
          addAddress();
        }
      }
    });

    Button button = new Button("add to whitelist");
    button.addClickHandler(new ClickHandler() {
      public void onClick(ClickEvent e) {
        addAddress();
      }
    });

    HorizontalPanel hp = new HorizontalPanel();
    hp.add(address);
    hp.add(button);
    add(hp);

    fetchTable();
  }
}
