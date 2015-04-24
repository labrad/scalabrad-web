package org.labrad.browser.client.grapher;

import org.labrad.browser.client.ViewFactory;

import com.google.gwt.activity.shared.AbstractActivity;
import com.google.gwt.event.shared.EventBus;
import com.google.gwt.place.shared.Place;
import com.google.gwt.place.shared.PlaceController;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.ui.AcceptsOneWidget;
import com.google.inject.assistedinject.Assisted;
import com.google.inject.assistedinject.AssistedInject;

public class DatasetActivity extends AbstractActivity implements DatasetView.Presenter {

  private final DatasetPlace place;
  private final ViewFactory viewFactory;
  private final PlaceController placeController;

  @AssistedInject
  public DatasetActivity(@Assisted DatasetPlace place, ViewFactory viewFactory, PlaceController placeController) {
    this.place = place;
    this.viewFactory = viewFactory;
    this.placeController = placeController;
  }

  public void start(AcceptsOneWidget panel, EventBus eventBus) {
    Window.setTitle("LabRAD - Grapher");
    panel.setWidget(viewFactory.createDatasetView(place.getPath(), place.getNum(), this, eventBus));
  }

  public void goTo(Place place) {
    placeController.goTo(place);
  }
}
