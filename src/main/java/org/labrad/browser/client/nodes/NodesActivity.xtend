package org.labrad.browser.client.nodes

import org.labrad.browser.client.ViewFactory
import org.labrad.browser.client.event.NodeStatusEvent
import org.labrad.browser.client.event.RemoteEventBus
import org.labrad.browser.client.event.RemoteEventBusDisconnectEvent
import org.labrad.browser.client.ui.PlaceRedirector
import com.google.gwt.activity.shared.AbstractActivity
import com.google.gwt.event.shared.EventBus
import com.google.gwt.place.shared.Place
import com.google.gwt.place.shared.PlaceController
import com.google.gwt.user.client.rpc.AsyncCallback
import com.google.gwt.user.client.ui.AcceptsOneWidget
import com.google.inject.assistedinject.Assisted
import com.google.inject.assistedinject.AssistedInject
import com.google.gwt.place.shared.Prefix
import com.google.gwt.place.shared.PlaceTokenizer

class NodesPlace extends Place {
  new() {}

  @Prefix("nodes")
  static class Tokenizer implements PlaceTokenizer<NodesPlace> {
    override String getToken(NodesPlace place) { "" }
    override NodesPlace getPlace(String token) { new NodesPlace }
  }
}

class NodesActivity extends AbstractActivity implements NodesView.Presenter {
  final NodesPlace place
  final ViewFactory viewFactory
  final PlaceController placeController
  final PlaceRedirector placeRedirector
  final RemoteEventBus remoteEventBus
  final NodeServiceAsync nodeService

  @AssistedInject
  new(
    @Assisted NodesPlace place,
    ViewFactory viewFactory,
    PlaceController placeController,
    RemoteEventBus remoteEventBus,
    PlaceRedirector placeRedirector,
    NodeServiceAsync nodeService
  ) {
    this.place = place
    this.viewFactory = viewFactory
    this.placeController = placeController
    this.placeRedirector = placeRedirector
    this.remoteEventBus = remoteEventBus
    this.nodeService = nodeService
  }

  override void start(AcceptsOneWidget container, EventBus eventBus) {
    remoteEventBus.start()
    eventBus.addHandler(RemoteEventBusDisconnectEvent.TYPE) [
      placeRedirector.reload(place)
    ]
    nodeService.getNodeInfo(new AsyncCallback<NodeStatusEvent[]> {
      override void onFailure(Throwable caught) {
        container.setWidget(viewFactory.createDisconnectedView(place, caught))
      }

      override void onSuccess(NodeStatusEvent[] result) {
        container.setWidget(viewFactory.createNodesView(NodesActivity.this, eventBus))
      }
    })
  }

  override void goTo(Place place) {
    placeController.goTo(place)
  }

  override void onCancel() {
  }

  override void onStop() {
  }
}
