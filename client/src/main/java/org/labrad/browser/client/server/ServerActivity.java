package org.labrad.browser.client.server;

import org.labrad.browser.client.ViewFactory;

import com.google.gwt.activity.shared.AbstractActivity;
import com.google.gwt.event.shared.EventBus;
import com.google.gwt.place.shared.Place;
import com.google.gwt.place.shared.PlaceController;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.ui.AcceptsOneWidget;
import com.google.inject.assistedinject.Assisted;
import com.google.inject.assistedinject.AssistedInject;

public class ServerActivity extends AbstractActivity implements ServerView.Presenter {
  private ServerPlace place;
  private ViewFactory viewFactory;
  private PlaceController placeController;

  @AssistedInject
  public ServerActivity(@Assisted ServerPlace place, ViewFactory viewFactory, PlaceController placeController) {
    this.place = place;
    this.viewFactory = viewFactory;
    this.placeController = placeController;
  }

  public void start(AcceptsOneWidget container, EventBus eventBus) {
    Window.setTitle("LabRAD - Servers - " + place.getName());
    container.setWidget(viewFactory.createServerView(place.getName(), this, eventBus));
  }

  public void goTo(Place place) {
    placeController.goTo(place);
  }
}
