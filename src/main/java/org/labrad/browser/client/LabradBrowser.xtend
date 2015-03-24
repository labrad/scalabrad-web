package org.labrad.browser.client

import org.labrad.browser.client.connections.ManagerPlace
import org.labrad.browser.client.connections.ManagerView
import org.labrad.browser.client.connections.ManagerViewImpl
import org.labrad.browser.client.event.RemoteEventBus
import org.labrad.browser.client.grapher.DataView
import org.labrad.browser.client.grapher.DataViewImpl
import org.labrad.browser.client.grapher.DatasetView
import org.labrad.browser.client.grapher.DatasetViewImpl
import org.labrad.browser.client.nodes.NodesPlace
import org.labrad.browser.client.nodes.NodesView
import org.labrad.browser.client.nodes.NodesViewImpl
import org.labrad.browser.client.registry.RegistryPlace
import org.labrad.browser.client.registry.RegistryView
import org.labrad.browser.client.registry.RegistryViewImpl
import com.google.gwt.activity.shared.ActivityManager
import com.google.gwt.activity.shared.ActivityMapper
import com.google.gwt.core.client.EntryPoint
import com.google.gwt.core.client.GWT
import com.google.gwt.event.shared.EventBus
import com.google.gwt.event.shared.SimpleEventBus
import com.google.gwt.inject.client.AbstractGinModule
import com.google.gwt.inject.client.assistedinject.GinFactoryModuleBuilder
import com.google.gwt.place.shared.PlaceChangeEvent
import com.google.gwt.place.shared.PlaceController
import com.google.gwt.place.shared.PlaceHistoryHandler
import com.google.gwt.place.shared.PlaceHistoryMapper
import com.google.gwt.user.client.ui.FlowPanel
import com.google.gwt.user.client.ui.HasHorizontalAlignment
import com.google.gwt.user.client.ui.Hyperlink
import com.google.gwt.user.client.ui.RootPanel
import com.google.gwt.user.client.ui.SimplePanel
import com.google.gwt.user.client.ui.VerticalPanel
import com.google.inject.Provides
import com.google.inject.Singleton
import com.google.gwt.inject.client.GinModules
import com.google.gwt.inject.client.Ginjector
import org.labrad.browser.client.grapher.DataActivity
import org.labrad.browser.client.grapher.DataPlace
import org.labrad.browser.client.grapher.DirectoryListing
import org.labrad.browser.client.grapher.DatasetPlace
import org.labrad.browser.client.grapher.DatasetActivity
import org.labrad.browser.client.connections.ManagerActivity
import org.labrad.browser.client.registry.RegistryActivity
import org.labrad.browser.client.registry.RegistryListing
import org.labrad.browser.client.nodes.NodesActivity
import org.labrad.browser.client.server.ServerActivity
import org.labrad.browser.client.server.ServerPlace
import org.labrad.browser.client.ui.RedirectActivity
import org.labrad.browser.client.ui.RedirectPlace
import com.google.gwt.place.shared.Place
import org.labrad.browser.client.connections.DisconnectedView
import com.google.gwt.user.cellview.client.CellTable
import org.labrad.browser.client.ui.TableResources
import org.labrad.browser.client.grapher.DatasetInfo

/**
 * Main configuration module for dependency injection.
 *
 * Here we configure which implementations should be used
 * when particular interfaces are requested for injection.
 */
class Module extends AbstractGinModule {
  override protected void configure() {
    bind(EventBus).to(SimpleEventBus).in(Singleton)
    bind(RemoteEventBus).in(Singleton)
    bind(ActivityMapper).to(BrowserActivityMapper).in(Singleton)
    bind(PlaceHistoryMapper).to(BrowserPlaceHistoryMapper).in(Singleton)
    bind(CellTable.Resources).to(TableResources).in(Singleton) // custom cell table styles
    install(
      new GinFactoryModuleBuilder()
        .implement(DataView, DataViewImpl)
        .implement(DatasetView, DatasetViewImpl)
        .implement(ManagerView, ManagerViewImpl)
        .implement(NodesView, NodesViewImpl)
        .implement(RegistryView, RegistryViewImpl)
        .build(ViewFactory)
    )
  }

  // the following classes are not marked for injection, so we must
  // tell Gin how to construct them with provider methods

  @Provides @Singleton
  def PlaceController providePlaceController(EventBus eventBus) {
    new PlaceController(eventBus as com.google.web.bindery.event.shared.EventBus)
  }

  @Provides @Singleton
  def PlaceHistoryHandler providePlaceHistoryHandler(PlaceHistoryMapper mapper) {
    new PlaceHistoryHandler(mapper)
  }

  @Provides @Singleton
  def ActivityManager provideActivityManager(ActivityMapper activityMapper, EventBus eventBus) {
    new ActivityManager(activityMapper, eventBus)
  }
}

/**
 * The injector that will be created by gin and used to get the basic
 * objects needed to bootstrap the application.
 */
@GinModules(Module)
interface Injector extends Ginjector {
  def EventBus getEventBus()
  def PlaceController getPlaceController()
  def ActivityMapper getActivityMapper()
  def ActivityManager getActivityManager()
  def PlaceHistoryMapper getPlaceHistoryMapper()
  def PlaceHistoryHandler getPlaceHistoryHandler()
  def RemoteEventBus getRemoteEventManager()
}

/**
 * A factory to create activities and views with the minimal set of required dependencies.
 *
 * The actual implementation of this class is generated at compile-time by Gin
 * and the rest of the parameters needed to create any given activity or view
 * will be injected as needed.
 */
interface ViewFactory {
  def DataActivity createDataActivity(DataPlace place)
  def DataView createDataView(DataPlace place, DirectoryListing listing, DataView.Presenter presenter,
    EventBus eventBus)

  def DatasetActivity createDatasetActivity(DatasetPlace place)
  def DatasetView createDatasetView(DatasetPlace place, DatasetInfo info, DatasetView.Presenter presenter, EventBus eventBus)

  def ManagerActivity createManagerActivity(ManagerPlace place)
  def ManagerView createManagerView(ManagerView.Presenter presenter, EventBus eventBus)

  def RegistryActivity createRegistryActivity(RegistryPlace place)
  def RegistryView createRegistryView(RegistryPlace place, RegistryListing listing, RegistryView.Presenter presenter,
    EventBus eventBus)

  def NodesActivity createNodesActivity(NodesPlace place)
  def NodesView createNodesView(NodesView.Presenter presenter, EventBus eventBus)

  def ServerActivity createServerActivity(ServerPlace place)

  def RedirectActivity createRedirectActivity(RedirectPlace place)

  def DisconnectedView createDisconnectedView(Place place, Throwable cause)
}

/**
 * The main entry point of the app. Create the injector, set up the basic ui,
 * and fire the history handler to the correct location in the app.
 */
class LabradBrowser implements EntryPoint {

  override void onModuleLoad() {
    val injector = GWT::create(Injector) as Injector
    val eventBus = injector.eventBus as com.google.web.bindery.event.shared.EventBus
    val placeController = injector.placeController
    val historyHandler = injector.placeHistoryHandler
    historyHandler.register(placeController, eventBus, new NodesPlace)

    val historyMapper = injector.placeHistoryMapper
    val managerLink = new Hyperlink("info", historyMapper.getToken(new ManagerPlace))
    val nodesLink = new Hyperlink("nodes", historyMapper.getToken(new NodesPlace))
    val registryLink = new Hyperlink("registry", historyMapper.getToken(new RegistryPlace))
    //val dataLink = new Hyperlink("data", historyMapper.getToken(new DataPlace))

    eventBus.addHandler(PlaceChangeEvent::TYPE) [
      val place = newPlace
      managerLink.removeStyleName("selected")
      nodesLink.removeStyleName("selected")
      registryLink.removeStyleName("selected")
      //dataLink.removeStyleName("selected")
      switch place {
        ManagerPlace: managerLink.addStyleName("selected")
        NodesPlace: nodesLink.addStyleName("selected")
        RegistryPlace: registryLink.addStyleName("selected")
        //DataPlace: dataLink.addStyleName("selected")
      }
    ]

    val menu = new FlowPanel => [
      add(managerLink)
      add(nodesLink)
      add(registryLink)
      //add(dataLink)
      addStyleName("page-menu")
    ]
    val appWidget = new SimplePanel

    val page = new VerticalPanel => [
      addStyleName("full-page")
      setHorizontalAlignment(HasHorizontalAlignment::ALIGN_LEFT)
      add(menu)
      add(appWidget)
    ]
    RootPanel::get.add(page)

    val activityManager = injector.activityManager
    activityManager.setDisplay(appWidget)
    historyHandler.handleCurrentHistory()
  }
}
