package org.labrad.browser.client

import org.labrad.browser.client.connections.ManagerPlace
import org.labrad.browser.client.grapher.DataPlace
import org.labrad.browser.client.grapher.DatasetPlace
import org.labrad.browser.client.nodes.NodesPlace
import org.labrad.browser.client.registry.RegistryPlace
import org.labrad.browser.client.server.ServerPlace
import org.labrad.browser.client.ui.RedirectPlace
import com.google.gwt.activity.shared.Activity
import com.google.gwt.activity.shared.ActivityMapper
import com.google.gwt.place.shared.Place
import com.google.inject.Inject
import com.google.gwt.place.shared.WithTokenizers
import com.google.gwt.place.shared.PlaceHistoryMapper

/**
 * HistoryMapper that knows how to translate urls in the application
 * into Place objects which in turn map to different activities.
 */
@WithTokenizers(#[
  DataPlace.Tokenizer,
  ManagerPlace.Tokenizer,
  NodesPlace.Tokenizer,
  RedirectPlace.Tokenizer,
  RegistryPlace.Tokenizer,
  ServerPlace.Tokenizer
])
interface BrowserPlaceHistoryMapper extends PlaceHistoryMapper {}

/**
 * ActivityMapper converts Places in our application into activities,
 * which set up the ui and behavior for those screens within the app.
 */
class BrowserActivityMapper implements ActivityMapper {
  val ViewFactory viewFactory

  @Inject new(ViewFactory viewFactory) {
    super()
    this.viewFactory = viewFactory
  }

  override Activity getActivity(Place place) {
    switch place {
      DatasetPlace: viewFactory.createDatasetActivity(place)
      DataPlace: viewFactory.createDataActivity(place)
      ManagerPlace: viewFactory.createManagerActivity(place)
      NodesPlace: viewFactory.createNodesActivity(place)
      RedirectPlace: viewFactory.createRedirectActivity(place)
      RegistryPlace: viewFactory.createRegistryActivity(place)
      ServerPlace: viewFactory.createServerActivity(place)
      default: null
    }
  }
}
