package org.labrad.browser.client.connections

import org.labrad.browser.client.ui.RedirectPlace
import com.google.gwt.place.shared.Place
import com.google.gwt.place.shared.PlaceController
import com.google.gwt.place.shared.PlaceHistoryMapper
import com.google.gwt.user.client.Timer
import com.google.gwt.user.client.ui.Composite
import com.google.gwt.user.client.ui.Label
import com.google.gwt.user.client.ui.VerticalPanel
import com.google.inject.assistedinject.Assisted
import com.google.inject.assistedinject.AssistedInject

class DisconnectedView extends Composite {
  @AssistedInject
  new(
    @Assisted Place place,
    @Assisted Throwable error,
    PlaceController controller,
    PlaceHistoryMapper placeMapper
  ) {
    var container = new VerticalPanel => [
      add(new Label("Unable to connect to labrad:"))
      add(new Label(error.message))
    ]
    initWidget(container)
    val timer = [
      val current = controller.where
      val currentToken = placeMapper.getToken(current)
      val destToken = placeMapper.getToken(place)
      if (currentToken == destToken) {
        controller.goTo(new RedirectPlace(destToken))
      }
    ] as Timer
    timer.schedule(5000)
  }
}

class ErrorView extends Composite {
  new(Throwable error) {
    val container = new VerticalPanel => [
      add(new Label("An error occurred:"))
      add(new Label(error.message))
    ]
    initWidget(container)
  }
}
