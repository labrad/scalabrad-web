package org.labrad.browser.client.connections

import java.util.logging.Level
import java.util.logging.Logger
import org.labrad.browser.client.ViewFactory
import org.labrad.browser.client.ui.RedirectPlace
import com.google.gwt.activity.shared.AbstractActivity
import com.google.gwt.event.shared.EventBus
import com.google.gwt.place.shared.Place
import com.google.gwt.place.shared.PlaceController
import com.google.gwt.place.shared.PlaceHistoryMapper
import com.google.gwt.place.shared.PlaceTokenizer
import com.google.gwt.place.shared.Prefix
import com.google.gwt.user.client.Timer
import com.google.gwt.user.client.rpc.AsyncCallback
import com.google.gwt.user.client.ui.AcceptsOneWidget
import com.google.gwt.user.client.ui.IsWidget
import com.google.inject.assistedinject.Assisted
import com.google.inject.assistedinject.AssistedInject

class ManagerPlace extends Place {
  new() {
  }

  @Prefix("info")
  static class Tokenizer implements PlaceTokenizer<ManagerPlace> {
    override String getToken(ManagerPlace place) {
      ""
    }

    override ManagerPlace getPlace(String token) {
      new ManagerPlace
    }
  }
}

interface ManagerView extends IsWidget {
  interface Presenter {
    def void goTo(Place place)
    def void closeConnection(long id)
  }

  def void setData(ConnectionInfo[] info)
}

class ManagerActivity extends AbstractActivity implements ManagerView.Presenter, AsyncCallback<ConnectionInfo[]> {
  final ManagerPlace place
  final ManagerServiceAsync managerService
  final ViewFactory viewFactory
  final PlaceController placeController
  final PlaceHistoryMapper placeMapper
  ManagerView view = null
  boolean alive = true
  static val log = Logger.getLogger(ManagerActivity.name)
  static val UPDATE_INTERVAL = 2000

  @AssistedInject new(@Assisted ManagerPlace place, ManagerServiceAsync managerService, ViewFactory viewFactory,
    PlaceController placeController, PlaceHistoryMapper placeMapper) {
    this.place = place
    this.managerService = managerService
    this.viewFactory = viewFactory
    this.placeController = placeController
    this.placeMapper = placeMapper
  }

  override void start(AcceptsOneWidget container, EventBus eventBus) {
    managerService.getConnectionInfo(new AsyncCallback<ConnectionInfo[]> {
      override void onFailure(Throwable caught) {
        container.setWidget(viewFactory.createDisconnectedView(place, caught))
      }

      override void onSuccess(ConnectionInfo[] result) {
        view = viewFactory.createManagerView(ManagerActivity.this, eventBus)
        container.setWidget(view)
        ManagerActivity.this.onSuccess(result)
      }
    })
  }

  override void onFailure(Throwable caught) {
    log.log(Level.WARNING, "Error while getting connection info", caught)
    placeController.goTo(new RedirectPlace(placeMapper.getToken(place)))
    pingLater()
  }

  override void onSuccess(ConnectionInfo[] result) {
    view.setData(result)
    pingLater()
  }

  private def void ping() {
    if(alive) managerService.getConnectionInfo(this)
  }

  private def void pingLater() {
    if (alive) {
      var Timer timer = [ping()]
      timer.schedule(UPDATE_INTERVAL)
    }

  }

  override void goTo(Place place) {
    placeController.goTo(place)
  }

  override void closeConnection(long id) {
    managerService.closeConnection(id, new AsyncCallback<Void> {
      override void onFailure(Throwable caught) {
        log.severe('''error while closing connection: id=«id», error=«caught.getMessage»''')
      }

      override void onSuccess(Void result) {
        log.info('''connection closed:«id»''')
      }
    })
  }

  override void onStop() {
    alive = false
  }

}
