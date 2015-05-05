package org.labrad.browser.client.connections;

import java.util.List;
import java.util.logging.Level;
import java.util.logging.Logger;

import org.fusesource.restygwt.client.Method;
import org.fusesource.restygwt.client.MethodCallback;
import org.labrad.browser.client.ViewFactory;
import org.labrad.browser.client.ui.RedirectPlace;

import com.google.gwt.activity.shared.AbstractActivity;
import com.google.gwt.event.shared.EventBus;
import com.google.gwt.place.shared.Place;
import com.google.gwt.place.shared.PlaceController;
import com.google.gwt.place.shared.PlaceHistoryMapper;
import com.google.gwt.user.client.Timer;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.rpc.AsyncCallback;
import com.google.gwt.user.client.ui.AcceptsOneWidget;
import com.google.inject.assistedinject.Assisted;
import com.google.inject.assistedinject.AssistedInject;

public class ManagerActivity
    extends AbstractActivity
    implements ManagerView.Presenter,
               MethodCallback<List<ConnectionInfo>> {
  private final ManagerPlace place;
  private final ManagerService managerService;
  private final ViewFactory viewFactory;
  private final PlaceController placeController;
  private final PlaceHistoryMapper placeMapper;
  private ManagerView view = null;
  private boolean alive = true;

  private static Logger log = Logger.getLogger(ManagerActivity.class.getName());
  public static final int UPDATE_INTERVAL = 2000;

  @AssistedInject
  public ManagerActivity(
      @Assisted ManagerPlace place,
      ManagerService managerService,
      ViewFactory viewFactory,
      PlaceController placeController,
      PlaceHistoryMapper placeMapper) {
    this.place = place;
    this.managerService = managerService;
    this.viewFactory = viewFactory;
    this.placeController = placeController;
    this.placeMapper = placeMapper;
  }

  public void start(final AcceptsOneWidget container, final EventBus eventBus) {
    Window.setTitle("LabRAD - Manager");
    managerService.getConnectionInfo(new MethodCallback<List<ConnectionInfo>>() {

      @Override
      public void onFailure(Method method, Throwable caught) {
        container.setWidget(viewFactory.createDisconnectedView(place, caught));
      }

      @Override
      public void onSuccess(Method method, List<ConnectionInfo> result) {
        view = viewFactory.createManagerView(ManagerActivity.this, eventBus, placeMapper);
        container.setWidget(view);
        ManagerActivity.this.onSuccess(method, result);
      }
    });
  }

  public void onFailure(Method method, Throwable caught) {
    log.log(Level.WARNING, "Error while getting connection info", caught);
    placeController.goTo(new RedirectPlace(placeMapper.getToken(place)));
    pingLater();
  }

  public void onSuccess(Method method, List<ConnectionInfo> result) {
    view.setData(result.toArray(new ConnectionInfo[] {}));
    pingLater();
  }

  private void ping() {
    if (alive) managerService.getConnectionInfo(this);
  }

  private void pingLater() {
    if (alive) {
      Timer timer = new Timer() {
        public void run() {
          ping();
        }
      };
      timer.schedule(UPDATE_INTERVAL);
    }
  }

  public void goTo(Place place) {
    placeController.goTo(place);
  }

  public void closeConnection(final long id) {
    managerService.closeConnection(id, new MethodCallback<Void>() {
      @Override public void onFailure(Method method, Throwable caught) {
        log.severe("error while closing connection: id=" + id + ", error=" + caught.getMessage());
      }

      @Override public void onSuccess(Method method, Void result) {
        log.info("connection closed:" + id);
      }
    });
  }

  @Override
  public void onStop() {
    alive = false;
  }
}
