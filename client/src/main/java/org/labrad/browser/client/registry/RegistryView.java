package org.labrad.browser.client.registry;

import com.google.gwt.place.shared.Place;
import com.google.gwt.user.client.ui.IsWidget;

public interface RegistryView extends IsWidget {
  public interface Presenter {
    void goTo(Place place);
  }
}
