package org.labrad.browser.client.ui;

import com.google.gwt.place.shared.Place;
import com.google.gwt.place.shared.PlaceController;
import com.google.gwt.place.shared.PlaceHistoryMapper;
import com.google.inject.Inject;

public class PlaceRedirector {

  private final PlaceController controller;
  private final PlaceHistoryMapper placeMapper;

  @Inject
  public PlaceRedirector(PlaceHistoryMapper placeMapper, PlaceController controller) {
    this.controller = controller;
    this.placeMapper = placeMapper;
  }

  public void reload(Place place) {
    String destToken = placeMapper.getToken(place);
    controller.goTo(new RedirectPlace(destToken));
  }
}
