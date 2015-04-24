package org.labrad.browser.client.nodes;

import java.util.logging.Logger;

import org.labrad.browser.client.ViewFactory;
import org.labrad.browser.client.event.RemoteEventBus;
import org.labrad.browser.client.event.RemoteEventBusDisconnectEvent;
import org.labrad.browser.client.message.NodeStatusMessage;
import org.labrad.browser.client.ui.PlaceRedirector;

import com.google.gwt.activity.shared.AbstractActivity;
import com.google.gwt.event.shared.EventBus;
import com.google.gwt.place.shared.Place;
import com.google.gwt.place.shared.PlaceController;
import com.google.gwt.user.client.Window;
import com.google.gwt.user.client.rpc.AsyncCallback;
import com.google.gwt.user.client.ui.AcceptsOneWidget;
import com.google.inject.assistedinject.Assisted;
import com.google.inject.assistedinject.AssistedInject;

public class NodesActivity extends AbstractActivity implements NodesView.Presenter {
  private static final Logger log = Logger.getLogger("NodesActivity");

  private final NodesPlace place;
  private final ViewFactory viewFactory;
  private final PlaceController placeController;
  private final PlaceRedirector placeRedirector;
  private final RemoteEventBus remoteEventBus;
  private final NodeServiceAsync nodeService;

  @AssistedInject
  public NodesActivity(
    @Assisted NodesPlace place,
    ViewFactory viewFactory,
    PlaceController placeController,
    RemoteEventBus remoteEventBus,
    PlaceRedirector placeRedirector,
    NodeServiceAsync nodeService
  ) {
    this.place = place;
    this.viewFactory = viewFactory;
    this.placeController = placeController;
    this.placeRedirector = placeRedirector;
    this.remoteEventBus = remoteEventBus;
    this.nodeService = nodeService;
  }

  public void start(final AcceptsOneWidget container, final EventBus eventBus) {
    Window.setTitle("LabRAD - Nodes");
    remoteEventBus.start();

    eventBus.addHandler(RemoteEventBusDisconnectEvent.TYPE, new RemoteEventBusDisconnectEvent.Handler() {
      @Override public void onDisconnect(RemoteEventBusDisconnectEvent event) {
        placeRedirector.reload(place);
      }
    });

    nodeService.getNodeInfo(new AsyncCallback<NodeStatusMessage[]>() {
      @Override
      public void onFailure(Throwable caught) {
        container.setWidget(viewFactory.createDisconnectedView(place, caught));
      }

      @Override
      public void onSuccess(NodeStatusMessage[] result) {
        container.setWidget(viewFactory.createNodesView(NodesActivity.this, eventBus));
      }
    });
  }

  public void goTo(Place place) {
    placeController.goTo(place);
  }

  @Override
  public void onCancel() {
  }

  @Override
  public void onStop() {
  }
}
