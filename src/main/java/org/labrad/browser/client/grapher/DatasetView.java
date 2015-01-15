package org.labrad.browser.client.grapher;

import com.google.gwt.place.shared.Place;
import com.google.gwt.user.client.ui.IsWidget;

public interface DatasetView extends IsWidget {
  public interface Presenter {
    void goTo(Place place);
  }
}
