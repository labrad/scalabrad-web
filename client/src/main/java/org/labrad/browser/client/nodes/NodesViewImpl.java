package org.labrad.browser.client.nodes;

import org.labrad.browser.client.BrowserImages;

import com.google.gwt.event.shared.EventBus;
import com.google.gwt.place.shared.PlaceController;
import com.google.gwt.user.client.ui.Composite;
import com.google.inject.assistedinject.Assisted;
import com.google.inject.assistedinject.AssistedInject;

public class NodesViewImpl extends Composite implements NodesView {

  private final Presenter presenter;

  @AssistedInject
  public NodesViewImpl(
      @Assisted Presenter presenter,
      @Assisted EventBus eventBus,
      PlaceController placeController,
      NodeService nodeService,
      BrowserImages imageBundle) {
    this.presenter = presenter;
    initWidget(new ControlPanel(eventBus, placeController, nodeService, imageBundle));
  }
}
