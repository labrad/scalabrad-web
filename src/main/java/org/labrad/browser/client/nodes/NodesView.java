package org.labrad.browser.client.nodes;

import com.google.gwt.place.shared.Place;
import com.google.gwt.user.client.ui.IsWidget;

public interface NodesView extends IsWidget {
  public interface Presenter {
    void goTo(Place place);
  }
}
