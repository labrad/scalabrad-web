package org.labrad.browser.client.ui;

import com.google.gwt.activity.shared.AbstractActivity;
import com.google.gwt.event.shared.EventBus;
import com.google.gwt.place.shared.Place;
import com.google.gwt.place.shared.PlaceController;
import com.google.gwt.place.shared.PlaceHistoryMapper;
import com.google.gwt.user.client.ui.AcceptsOneWidget;
import com.google.inject.assistedinject.Assisted;
import com.google.inject.assistedinject.AssistedInject;

public class RedirectActivity extends AbstractActivity {

  private final RedirectPlace place;
  private final PlaceController controller;
  private final PlaceHistoryMapper placeMapper;

  @AssistedInject
  public RedirectActivity(@Assisted RedirectPlace place, PlaceHistoryMapper placeMapper, PlaceController controller) {
    this.place = place;
    this.controller = controller;
    this.placeMapper = placeMapper;
  }

  @Override
  public void start(AcceptsOneWidget panel, EventBus eventBus) {
    Place destination = placeMapper.getPlace(place.getToken());
    controller.goTo(destination);
  }
}
