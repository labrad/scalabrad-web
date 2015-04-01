package org.labrad.browser.client.ui

import com.google.gwt.activity.shared.AbstractActivity
import com.google.gwt.event.shared.EventBus
import com.google.gwt.place.shared.Place
import com.google.gwt.place.shared.PlaceController
import com.google.gwt.place.shared.PlaceHistoryMapper
import com.google.gwt.place.shared.PlaceTokenizer
import com.google.gwt.place.shared.Prefix
import com.google.gwt.user.client.ui.AcceptsOneWidget
import com.google.inject.Inject
import com.google.inject.assistedinject.Assisted
import com.google.inject.assistedinject.AssistedInject

/**
 * A utility that allows to force reload a particular place by first
 * loading a RedirectPlace pointing to that location.
 */
class PlaceRedirector {
  val PlaceController controller
  val PlaceHistoryMapper placeMapper

  @Inject
  new(PlaceHistoryMapper placeMapper, PlaceController controller) {
    this.controller = controller
    this.placeMapper = placeMapper
  }

  def void reload(Place place) {
    val destToken = placeMapper.getToken(place)
    controller.goTo(new RedirectPlace(destToken))
  }
}

/**
 * A place that contains a token pointing to another place
 */
class RedirectPlace extends Place {
  val String token

  new(String token) {
    this.token = token
  }

  def String getToken() {
    token
  }

  @Prefix("redirect")
  static class Tokenizer implements PlaceTokenizer<RedirectPlace> {
    override String getToken(RedirectPlace place) {
      place.token
    }

    override RedirectPlace getPlace(String token) {
      new RedirectPlace(token)
    }
  }
}

/**
 * Activity for a redirect that simply loads the place pointed to by the
 * redirect place.
 */
class RedirectActivity extends AbstractActivity {
  val RedirectPlace place
  val PlaceController controller
  val PlaceHistoryMapper placeMapper

  @AssistedInject new(@Assisted RedirectPlace place, PlaceRedirector placeRedirector, PlaceController controller) {
    this.place = place
    this.controller = controller
    this.placeMapper = placeMapper
  }

  @Override override void start(AcceptsOneWidget panel, EventBus eventBus) {
    var Place destination = placeMapper.getPlace(place.token)
    controller.goTo(destination)
  }
}
