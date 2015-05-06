package org.labrad.browser.client.iplist;

import org.labrad.browser.client.BrowserImages;
import org.labrad.browser.client.MiscBundle;

import com.google.gwt.core.client.GWT;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.user.client.ui.HorizontalPanel;
import com.google.gwt.user.client.ui.Image;
import com.google.gwt.user.client.ui.Label;
import com.google.gwt.user.client.ui.PushButton;

public class IpEntry extends HorizontalPanel {
  private static final BrowserImages images = GWT.create(BrowserImages.class);
  private static final MiscBundle bundle = GWT.create(MiscBundle.class);
  private static final MiscBundle.Css css = bundle.css();

  static {
    css.ensureInjected();
  }

  public IpEntry(final IpListControl parent, final String address, final boolean allowed) {
    Image img = new Image(allowed ? images.ipAllowed() : images.ipDisallowed());
    PushButton button = new PushButton(img);
    button.addClickHandler(new ClickHandler() {
      @Override
      public void onClick(ClickEvent e) {
        if (allowed) {
          parent.blacklist(address);
        } else {
          parent.whitelist(address);
        }
      }
    });
    add(button);
    Label lbl = new Label(address);
    lbl.addStyleName(css.paddedLabelClass());
    add(lbl);
  }
}
