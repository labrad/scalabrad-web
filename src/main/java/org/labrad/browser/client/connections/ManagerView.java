package org.labrad.browser.client.connections;

import com.google.gwt.place.shared.Place;
import com.google.gwt.user.client.ui.IsWidget;

public interface ManagerView extends IsWidget {
  public interface Presenter {
    void goTo(Place place);
    void closeConnection(long id);
  }

  public void setData(ConnectionInfo[] info);
}
