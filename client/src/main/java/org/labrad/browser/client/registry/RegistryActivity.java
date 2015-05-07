package org.labrad.browser.client.registry;

import java.util.logging.Logger;

import org.fusesource.restygwt.client.Method;
import org.fusesource.restygwt.client.MethodCallback;
import org.labrad.browser.client.ViewFactory;
import org.labrad.browser.client.event.LabradConnectEvent;
import org.labrad.browser.client.event.LabradDisconnectEvent;
import org.labrad.browser.client.event.RemoteEventBus;
import org.labrad.browser.client.event.RemoteEventBusConnectEvent;
import org.labrad.browser.client.event.RemoteEventBusDisconnectEvent;
import org.labrad.browser.client.ui.PlaceRedirector;

import com.google.gwt.activity.shared.AbstractActivity;
import com.google.gwt.event.shared.EventBus;
import com.google.gwt.place.shared.Place;
import com.google.gwt.place.shared.PlaceController;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.ui.AcceptsOneWidget;
import com.google.inject.assistedinject.Assisted;
import com.google.inject.assistedinject.AssistedInject;

public class RegistryActivity extends AbstractActivity implements RegistryView.Presenter {
  private static final Logger log = Logger.getLogger("RegistryActivity");

  private final RegistryPlace place;
  private final RegistryService registryService;
  private final RemoteEventBus remoteEventBus;
  private final ViewFactory viewFactory;
  private final PlaceController placeController;
  private final PlaceRedirector redirector;


  private final MethodCallback<String> watchCallback = new MethodCallback<String>() {
    @Override public void onFailure(Method method, Throwable caught) {
      log.severe("watchRegistryPath failed. path=" + place.getPathString() + ", error=" + caught.getMessage());
    }
    @Override public void onSuccess(Method method, String result) {
      log.info("watchRegistryPath. path=" + place.getPathString());
    }
  };

  private final MethodCallback<String> unwatchCallback = new MethodCallback<String>() {
    @Override public void onFailure(Method method, Throwable caught) {
      log.severe("unwatchRegistryPath failed. path=" + place.getPathString() + ", error=" + caught.getMessage());
    }
    @Override public void onSuccess(Method method, String result) {
      log.info("unwatchRegistryPath. path=" + place.getPathString());
    }
  };

  @AssistedInject
  public RegistryActivity(
      @Assisted RegistryPlace place,
      RemoteEventBus remoteEventBus,
      RegistryService registryService,
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
        remoteEventBus.registryWatch(place.getPath());
      }
    });
    eventBus.addHandler(RemoteEventBusDisconnectEvent.TYPE, new RemoteEventBusDisconnectEvent.Handler() {
      @Override public void onDisconnect(RemoteEventBusDisconnectEvent event) {
        log.info("remote event bus disconnected. unwatching registry path " + place.getPathString());
        remoteEventBus.registryUnwatch(place.getPath());
        redirector.reload(place);
      }
    });

    eventBus.addHandler(LabradConnectEvent.TYPE, new LabradConnectEvent.Handler() {
      @Override public void onLabradConnect(LabradConnectEvent event) {
        log.info("connected to labrad. watching registry path " + place.getPathString());
        remoteEventBus.registryWatch(place.getPath());
      }
    });
    eventBus.addHandler(LabradDisconnectEvent.TYPE, new LabradDisconnectEvent.Handler() {
      @Override public void onLabradDisconnect(LabradDisconnectEvent event) {
        log.info("disconnected from labrad. no longer watching registry path");
        redirector.reload(place);
      }
    });

    remoteEventBus.registryWatch(place.getPath());
    registryService.dir(place.getPath(), new MethodCallback<RegistryListing>() {
      public void onFailure(Method method, Throwable caught) {
        container.setWidget(viewFactory.createDisconnectedView(place, caught));
      }
      public void onSuccess(Method method, RegistryListing result) {
        container.setWidget(viewFactory.createRegistryView(place, result, RegistryActivity.this, eventBus));
      }
    });
  }

  public void goTo(Place place) {
    placeController.goTo(place);
  }

  @Override
  public void onCancel() {
    remoteEventBus.registryUnwatch(place.getPath());
  }

  @Override
  public void onStop() {
    remoteEventBus.registryUnwatch(place.getPath());
  }
}
