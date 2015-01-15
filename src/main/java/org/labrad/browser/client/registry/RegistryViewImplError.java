package org.labrad.browser.client.registry;

import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.Label;
import com.google.gwt.user.client.ui.VerticalPanel;

public class RegistryViewImplError extends Composite {
  public RegistryViewImplError(RegistryPlace place, Throwable error) {
    VerticalPanel container = new VerticalPanel();
    container.add(new Label("An error occurred:"));
    container.add(new Label(error.getMessage()));
    initWidget(container);
  }
}
