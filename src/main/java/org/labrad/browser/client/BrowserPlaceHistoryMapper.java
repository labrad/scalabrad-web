package org.labrad.browser.client;

import org.labrad.browser.client.connections.ManagerPlace;
import org.labrad.browser.client.grapher.DataPlace;
import org.labrad.browser.client.nodes.NodesPlace;
import org.labrad.browser.client.registry.RegistryPlace;
import org.labrad.browser.client.server.ServerPlace;
import org.labrad.browser.client.ui.RedirectPlace;

import com.google.gwt.place.shared.PlaceHistoryMapper;
import com.google.gwt.place.shared.WithTokenizers;

@WithTokenizers({
  DataPlace.Tokenizer.class,
  ManagerPlace.Tokenizer.class,
  NodesPlace.Tokenizer.class,
  RedirectPlace.Tokenizer.class,
  RegistryPlace.Tokenizer.class,
  ServerPlace.Tokenizer.class})
public interface BrowserPlaceHistoryMapper extends PlaceHistoryMapper {}
