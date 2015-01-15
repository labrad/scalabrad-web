package org.labrad.browser.client;

import java.util.List;

import org.labrad.browser.client.connections.DisconnectedView;
import org.labrad.browser.client.connections.ManagerActivity;
import org.labrad.browser.client.connections.ManagerPlace;
import org.labrad.browser.client.connections.ManagerView;
import org.labrad.browser.client.grapher.DataActivity;
import org.labrad.browser.client.grapher.DataPlace;
import org.labrad.browser.client.grapher.DataView;
import org.labrad.browser.client.grapher.DatasetActivity;
import org.labrad.browser.client.grapher.DatasetPlace;
import org.labrad.browser.client.grapher.DatasetView;
import org.labrad.browser.client.grapher.DirectoryListing;
import org.labrad.browser.client.nodes.NodesActivity;
import org.labrad.browser.client.nodes.NodesPlace;
import org.labrad.browser.client.nodes.NodesView;
import org.labrad.browser.client.registry.RegistryActivity;
import org.labrad.browser.client.registry.RegistryListing;
import org.labrad.browser.client.registry.RegistryPlace;
import org.labrad.browser.client.registry.RegistryView;
import org.labrad.browser.client.server.ServerActivity;
import org.labrad.browser.client.server.ServerPlace;
import org.labrad.browser.client.server.ServerView;
import org.labrad.browser.client.ui.RedirectActivity;
import org.labrad.browser.client.ui.RedirectPlace;

import com.google.gwt.event.shared.EventBus;
import com.google.gwt.place.shared.Place;
import com.google.gwt.place.shared.PlaceHistoryMapper;

public interface ViewFactory {
  DataActivity createDataActivity(DataPlace place);
  DataView createDataView(List<String> path, DirectoryListing listing, DataView.Presenter presenter, EventBus eventBus);

  DatasetActivity createDatasetActivity(DatasetPlace place);
  DatasetView createDatasetView(List<String> path, int num, DatasetView.Presenter presenter, EventBus eventBus);

  ManagerActivity createManagerActivity(ManagerPlace place);
  ManagerView createManagerView(ManagerView.Presenter presenter, EventBus eventBus, PlaceHistoryMapper placeMapper);

  RegistryActivity createRegistryActivity(RegistryPlace place);
  RegistryView createRegistryView(List<String> path, RegistryListing listing, RegistryView.Presenter presenter, EventBus eventBus);

  NodesActivity createNodesActivity(NodesPlace place);
  NodesView createNodesView(NodesView.Presenter presenter, EventBus eventBus);

  ServerActivity createServerActivity(ServerPlace place);
  ServerView createServerView(String name, ServerView.Presenter presenter, EventBus eventBus);

  RedirectActivity createRedirectActivity(RedirectPlace place);
  DisconnectedView createDisconnectedView(Place place, Throwable cause);
}
