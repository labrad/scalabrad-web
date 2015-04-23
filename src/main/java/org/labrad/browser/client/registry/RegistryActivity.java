package org.labrad.browser.client.registry;

import java.util.logging.Logger;

import org.labrad.browser.client.ViewFactory;
import org.labrad.browser.client.event.LabradConnectEvent;
import org.labrad.browser.client.event.LabradDisconnectEvent;
import org.labrad.browser.client.event.RemoteEventBus;
import org.labrad.browser.client.event.RemoteEventBusConnectEvent;
import org.labrad.browser.client.event.RemoteEventBusDisconnectEvent;
import org.labrad.browser.client.ui.PlaceRedirector;
import org.labrad.browser.client.util.Util;

import com.google.gwt.activity.shared.AbstractActivity;
import com.google.gwt.event.shared.EventBus;
import com.google.gwt.place.shared.Place;
import com.google.gwt.place.shared.PlaceController;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.rpc.AsyncCallback;
import com.google.gwt.user.client.ui.AcceptsOneWidget;
import com.google.inject.assistedinject.Assisted;
import com.google.inject.assistedinject.AssistedInject;

public class RegistryActivity extends AbstractActivity implements RegistryView.Presenter {
  private static final Logger log = Logger.getLogger("RegistryActivity");

  private final RegistryPlace place;
  private final RegistryServiceAsync registryService;
  private final RemoteEventBus remoteEventBus;
  private final ViewFactory viewFactory;
  private final PlaceController placeController;
  private final PlaceRedirector redirector;
  private final String watchId = Util.randomId();


  private final AsyncCallback<Void> watchCallback = new AsyncCallback<Void>() {
    @Override public void onFailure(Throwable caught) {
      log.severe("watchRegistryPath failed. path=" + place.getPathString() + ", error=" + caught.getMessage());
    }
    @Override public void onSuccess(Void result) {
      log.info("watchRegistryPath. path=" + place.getPathString() + ", watchId=" + watchId);
    }
  };

  private final AsyncCallback<Void> unwatchCallback = new AsyncCallback<Void>() {
    @Override public void onFailure(Throwable caught) {
      log.severe("unwatchRegistryPath failed. path=" + place.getPathString() + ", error=" + caught.getMessage());
    }
    @Override public void onSuccess(Void result) {
      log.info("unwatchRegistryPath. path=" + place.getPathString());
    }
  };

  @AssistedInject
  public RegistryActivity(
      @Assisted RegistryPlace place,
      RemoteEventBus remoteEventBus,
      RegistryServiceAsync registryService,
      ViewFactory viewFactory,
      PlaceController placeController,
      PlaceRedirector redirector) {
    this.place = place;
    this.registryService = registryService;
    this.remoteEventBus = remoteEventBus;
    this.viewFactory = viewFactory;
    this.placeController = placeController;
    this.redirector = redirector;
  }

  public void start(final AcceptsOneWidget container, final EventBus eventBus) {
    Window.setTitle("LabRAD - Registry");
    remoteEventBus.start();

    // when the event bus connects, start watching the registry path
    eventBus.addHandler(RemoteEventBusConnectEvent.TYPE, new RemoteEventBusConnectEvent.Handler() {
      @Override public void onConnect(RemoteEventBusConnectEvent event) {
        log.info("remote event bus connected. watching registry path " + place.getPathString());
        registryService.watchRegistryPath(remoteEventBus.getId(), watchId, place.getPathString(), watchCallback);
      }
    });
    eventBus.addHandler(RemoteEventBusDisconnectEvent.TYPE, new RemoteEventBusDisconnectEvent.Handler() {
      @Override public void onDisconnect(RemoteEventBusDisconnectEvent event) {
        log.info("remote event bus disconnected. unwatching registry path " + place.getPathString());
        registryService.unwatchRegistryPath(remoteEventBus.getId(), watchId, unwatchCallback);
        redirector.reload(place);
      }
    });

    eventBus.addHandler(LabradConnectEvent.TYPE, new LabradConnectEvent.Handler() {
      @Override public void onLabradConnect(LabradConnectEvent event) {
        log.info("connected to labrad. watching registry path " + place.getPathString());
        registryService.watchRegistryPath(remoteEventBus.getId(), watchId, place.getPathString(), watchCallback);
      }
    });
    eventBus.addHandler(LabradDisconnectEvent.TYPE, new LabradDisconnectEvent.Handler() {
      @Override public void onLabradDisconnect(LabradDisconnectEvent event) {
        log.info("disconnected from labrad. no longer watching registry path");
        redirector.reload(place);
      }
    });

    registryService.getListing(place.getPathArray(), new AsyncCallback<RegistryListing>() {
      public void onFailure(Throwable caught) {
        container.setWidget(viewFactory.createDisconnectedView(place, caught));
      }
      public void onSuccess(RegistryListing result) {
        container.setWidget(viewFactory.createRegistryView(place.getPath(), result, RegistryActivity.this, eventBus));
      }
    });
  }

  public void goTo(Place place) {
    placeController.goTo(place);
  }

  @Override
  public void onCancel() {
    registryService.unwatchRegistryPath(remoteEventBus.getId(), watchId, unwatchCallback);
  }

  @Override
  public void onStop() {
    registryService.unwatchRegistryPath(remoteEventBus.getId(), watchId, unwatchCallback);
  }
}
