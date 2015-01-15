package org.labrad.browser.client.server;

import com.google.gwt.place.shared.Place;
import com.google.gwt.user.client.ui.IsWidget;

public interface ServerView extends IsWidget {
  public interface Presenter {
    void goTo(Place place);
  }
}
