package org.labrad.browser.client.registry

import java.util.logging.Logger
import org.labrad.browser.client.ViewFactory
import org.labrad.browser.client.event.LabradConnectEvent
import org.labrad.browser.client.event.LabradDisconnectEvent
import org.labrad.browser.client.event.RemoteEventBus
import org.labrad.browser.client.event.RemoteEventBusConnectEvent
import org.labrad.browser.client.event.RemoteEventBusDisconnectEvent
import org.labrad.browser.client.event.RemoteEventServiceAsync
import org.labrad.browser.client.ui.PlaceRedirector
import org.labrad.browser.client.util.Util
import com.google.gwt.activity.shared.AbstractActivity
import com.google.gwt.event.shared.EventBus
import com.google.gwt.place.shared.Place
import com.google.gwt.place.shared.PlaceController
import com.google.gwt.user.client.rpc.AsyncCallback
import com.google.gwt.user.client.ui.AcceptsOneWidget
import com.google.gwt.user.client.ui.IsWidget
import com.google.inject.assistedinject.Assisted
import com.google.inject.assistedinject.AssistedInject

interface RegistryView extends IsWidget {
  interface Presenter {
    def void goTo(Place place)

  }
}

class RegistryActivity extends AbstractActivity implements RegistryView.Presenter {
  static val log = Logger.getLogger("RegistryActivity")
  val RegistryPlace place
  val RegistryServiceAsync registryService
  val RemoteEventServiceAsync remoteEventService
  val RemoteEventBus remoteEventBus
  val ViewFactory viewFactory
  val PlaceController placeController
  val PlaceRedirector redirector

  val watchId = Util.randomId()

  val watchCallback = new AsyncCallback<Void> {
    override void onFailure(Throwable caught) {
      log.severe('''watchRegistryPath failed. path=«place.pathString», error=«caught.message»''')
    }
    override void onSuccess(Void result) {
      log.info('''watchRegistryPath. path=«place.pathString», watchId=«watchId»''')
    }
  }
  val unwatchCallback = new AsyncCallback<Void> {
    override void onFailure(Throwable caught) {
      log.severe('''unwatchRegistryPath failed. path=«place.pathString», error=«caught.message»''')
    }
    override void onSuccess(Void result) {
      log.info('''unwatchRegistryPath. path=«place.pathString»''')
    }
  }

  @AssistedInject
  new(@Assisted RegistryPlace place, RemoteEventServiceAsync remoteEventService,
    RemoteEventBus remoteEventBus, RegistryServiceAsync registryService, ViewFactory viewFactory,
    PlaceController placeController, PlaceRedirector redirector) {
    this.place = place
    this.registryService = registryService
    this.remoteEventService = remoteEventService
    this.remoteEventBus = remoteEventBus
    this.viewFactory = viewFactory
    this.placeController = placeController
    this.redirector = redirector
  }

  override void start(AcceptsOneWidget container, EventBus eventBus) {
    remoteEventBus.start() // when the event bus connects, start watching the registry path
    eventBus.addHandler(RemoteEventBusConnectEvent.TYPE) [
      log.info('''remote event bus connected. watching registry path «place.pathString»''')
      registryService.watchRegistryPath(remoteEventBus.id, watchId, place.pathString, watchCallback)
    ]
    eventBus.addHandler(RemoteEventBusDisconnectEvent.TYPE) [
      log.info('''remote event bus disconnected. unwatching registry path «place.pathString»''')
      registryService.unwatchRegistryPath(remoteEventBus.id, watchId, unwatchCallback)
      redirector.reload(place)
    ]
    eventBus.addHandler(LabradConnectEvent.TYPE) [
      log.info('''connected to labrad. watching registry path «place.pathString»''')
      registryService.watchRegistryPath(remoteEventBus.id, watchId, place.pathString, watchCallback)
    ]
    eventBus.addHandler(LabradDisconnectEvent.TYPE) [
      log.info("disconnected from labrad. no longer watching registry path")
      redirector.reload(place)
    ]
    registryService.getListing(place.pathArray, new AsyncCallback<RegistryListing> {
      override void onFailure(Throwable caught) {
        container.setWidget(viewFactory.createDisconnectedView(place, caught))
      }

      override void onSuccess(RegistryListing result) {
        container.setWidget(viewFactory.createRegistryView(place, result, RegistryActivity.this, eventBus))
      }
    })
  }

  override void goTo(Place place) {
    placeController.goTo(place)
  }

  override void onCancel() {
    registryService.unwatchRegistryPath(remoteEventBus.id, watchId, unwatchCallback)
  }

  override void onStop() {
    registryService.unwatchRegistryPath(remoteEventBus.id, watchId, unwatchCallback)
  }

}
