package org.labrad.browser.client.grapher;

import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.Label;
import com.google.gwt.user.client.ui.VerticalPanel;

public class DataViewImplError extends Composite {
  public DataViewImplError(DataPlace place, Throwable error) {
    VerticalPanel container = new VerticalPanel();
    container.add(new Label("An error occurred:"));
    container.add(new Label(error.getMessage()));
    initWidget(container);
  }
}
