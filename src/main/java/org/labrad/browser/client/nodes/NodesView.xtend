package org.labrad.browser.client.nodes

import com.google.gwt.place.shared.Place
import com.google.gwt.user.client.ui.IsWidget
import com.google.inject.assistedinject.AssistedInject
import com.google.inject.assistedinject.Assisted
import com.google.gwt.user.client.ui.Composite
import com.google.gwt.event.shared.EventBus
import com.google.gwt.place.shared.PlaceController
import org.labrad.browser.client.BrowserImages

interface NodesView extends IsWidget {
  interface Presenter {
    def void goTo(Place place)

  }
}

class NodesViewImpl extends Composite implements NodesView {
  val Presenter presenter

  @AssistedInject
  new(
    @Assisted Presenter presenter,
    @Assisted EventBus eventBus,
    PlaceController placeController,
    NodeServiceAsync nodeService,
    BrowserImages imageBundle
  ) {
    this.presenter = presenter
    initWidget(new ControlPanel(eventBus, placeController, nodeService, imageBundle))
  }

}
