package org.labrad.browser.client;

import org.labrad.browser.client.connections.ManagerPlace;
import org.labrad.browser.client.grapher.DataPlace;
import org.labrad.browser.client.grapher.DatasetPlace;
import org.labrad.browser.client.nodes.NodesPlace;
import org.labrad.browser.client.registry.RegistryPlace;
import org.labrad.browser.client.server.ServerPlace;
import org.labrad.browser.client.ui.RedirectPlace;

import com.google.gwt.activity.shared.Activity;
import com.google.gwt.activity.shared.ActivityMapper;
import com.google.gwt.place.shared.Place;
import com.google.inject.Inject;

public class BrowserActivityMapper implements ActivityMapper {
  private final ViewFactory viewFactory;

  @Inject
  public BrowserActivityMapper(ViewFactory viewFactory) {
    super();
    this.viewFactory = viewFactory;
  }

  public Activity getActivity(Place place) {
    if (place instanceof DatasetPlace) return viewFactory.createDatasetActivity((DatasetPlace) place);
    if (place instanceof DataPlace) return viewFactory.createDataActivity((DataPlace) place);
    if (place instanceof ManagerPlace) return viewFactory.createManagerActivity((ManagerPlace) place);
    if (place instanceof NodesPlace) return viewFactory.createNodesActivity((NodesPlace) place);
    if (place instanceof RedirectPlace) return viewFactory.createRedirectActivity((RedirectPlace) place);
    if (place instanceof RegistryPlace) return viewFactory.createRegistryActivity((RegistryPlace) place);
    if (place instanceof ServerPlace) return viewFactory.createServerActivity((ServerPlace) place);
    return null;
  }
}
