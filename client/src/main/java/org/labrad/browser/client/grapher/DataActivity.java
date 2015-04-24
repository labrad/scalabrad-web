package org.labrad.browser.client.grapher;

import org.labrad.browser.client.ViewFactory;

import com.google.gwt.activity.shared.AbstractActivity;
import com.google.gwt.place.shared.Place;
import com.google.gwt.place.shared.PlaceController;
import com.google.gwt.user.client.rpc.AsyncCallback;
import com.google.gwt.user.client.ui.AcceptsOneWidget;
import com.google.inject.assistedinject.Assisted;
import com.google.inject.assistedinject.AssistedInject;
import com.google.gwt.event.shared.EventBus;

public class DataActivity extends AbstractActivity implements DataView.Presenter {

  private final DataPlace place;
  private final ViewFactory viewFactory;
  private final VaultServiceAsync service;
  private final PlaceController placeController;

  @AssistedInject
  public DataActivity(@Assisted DataPlace place, VaultServiceAsync service, ViewFactory viewFactory, PlaceController placeController) {
    this.place = place;
    this.service = service;
    this.viewFactory = viewFactory;
    this.placeController = placeController;
  }

  public void start(final AcceptsOneWidget panel, final EventBus eventBus) {
    service.getListing(place.getPath().toArray(new String[] {}), new AsyncCallback<DirectoryListing>() {
      public void onFailure(Throwable caught) {
        panel.setWidget(new DataViewImplError(place, caught));
      }

      public void onSuccess(DirectoryListing result) {
        panel.setWidget(createView(result, eventBus));
      }
    });
  }

  private DataView createView(DirectoryListing listing, EventBus eventBus) {
    return viewFactory.createDataView(place.getPath(), listing, this, eventBus);
  }

  public void goTo(Place place) {
    placeController.goTo(place);
  }
}
