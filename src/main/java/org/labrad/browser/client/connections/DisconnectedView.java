package org.labrad.browser.client.connections;

import org.labrad.browser.client.ui.RedirectPlace;

import com.google.gwt.place.shared.Place;
import com.google.gwt.place.shared.PlaceController;
import com.google.gwt.place.shared.PlaceHistoryMapper;
import com.google.gwt.user.client.Timer;
import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.Label;
import com.google.gwt.user.client.ui.VerticalPanel;
import com.google.inject.assistedinject.Assisted;
import com.google.inject.assistedinject.AssistedInject;

public class DisconnectedView extends Composite {
  @AssistedInject
  public DisconnectedView(
    @Assisted final Place place,
    @Assisted Throwable error,
    final PlaceController controller,
    final PlaceHistoryMapper placeMapper
  ) {
    VerticalPanel container = new VerticalPanel();
    container.add(new Label("Unable to connect to labrad:"));
    container.add(new Label(error.getMessage()));
    initWidget(container);

    new Timer() {
      public void run() {
        Place current = controller.getWhere();
        String currentToken = placeMapper.getToken(current);
        String destToken = placeMapper.getToken(place);
        if (currentToken.equals(destToken)) {
          controller.goTo(new RedirectPlace(destToken));
        }
      }
    }.schedule(5000);
  }
}
