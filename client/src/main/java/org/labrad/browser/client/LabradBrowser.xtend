package org.labrad.browser.client;

import org.fusesource.restygwt.client.Defaults;
import org.labrad.browser.client.connections.ManagerPlace;
import org.labrad.browser.client.connections.ManagerView;
import org.labrad.browser.client.connections.ManagerViewImpl;
import org.labrad.browser.client.event.RemoteEventBus;
import org.labrad.browser.client.grapher.DataView;
import org.labrad.browser.client.grapher.DataViewImpl;
import org.labrad.browser.client.grapher.DatasetView;
import org.labrad.browser.client.grapher.DatasetViewImpl;
import org.labrad.browser.client.nodes.NodesPlace;
import org.labrad.browser.client.nodes.NodesView;
import org.labrad.browser.client.nodes.NodesViewImpl;
import org.labrad.browser.client.registry.RegistryPlace;
import org.labrad.browser.client.registry.RegistryView;
import org.labrad.browser.client.registry.RegistryViewImpl;
import org.labrad.browser.client.server.ServerView;
import org.labrad.browser.client.server.ServerViewImpl;

import com.google.gwt.activity.shared.ActivityManager;
import com.google.gwt.activity.shared.ActivityMapper;
import com.google.gwt.core.client.EntryPoint;
import com.google.gwt.core.client.GWT;
import com.google.gwt.event.shared.EventBus;
import com.google.gwt.event.shared.SimpleEventBus;
import com.google.gwt.inject.client.AbstractGinModule;
import com.google.gwt.inject.client.assistedinject.GinFactoryModuleBuilder;
import com.google.gwt.place.shared.Place;
import com.google.gwt.place.shared.PlaceChangeEvent;
import com.google.gwt.place.shared.PlaceController;
import com.google.gwt.place.shared.PlaceHistoryHandler;
import com.google.gwt.place.shared.PlaceHistoryMapper;
import com.google.gwt.user.client.ui.FlowPanel;
import com.google.gwt.user.client.ui.HasHorizontalAlignment;
import com.google.gwt.user.client.ui.Hyperlink;
import com.google.gwt.user.client.ui.RootPanel;
import com.google.gwt.user.client.ui.SimplePanel;
import com.google.gwt.user.client.ui.VerticalPanel;
import com.google.inject.Provides;
import com.google.inject.Singleton;

public class LabradBrowser implements EntryPoint {
  public static class Module extends AbstractGinModule {
    protected override def configure() {
      bind(EventBus).to(SimpleEventBus).in(Singleton)
      bind(RemoteEventBus).in(Singleton)

      bind(ActivityMapper).to(BrowserActivityMapper)
      bind(PlaceHistoryMapper).to(BrowserPlaceHistoryMapper)

      install(new GinFactoryModuleBuilder()
        .implement(DataView, DataViewImpl)
        .implement(DatasetView, DatasetViewImpl)
        .implement(ManagerView, ManagerViewImpl)
        .implement(NodesView, NodesViewImpl)
        .implement(RegistryView, RegistryViewImpl)
        .implement(ServerView, ServerViewImpl)
        .build(ViewFactory))
    }

    @Provides @Singleton
    def com.google.web.bindery.event.shared.EventBus provideBinderyEventBus(EventBus eventBus) {
      return eventBus
    }

    @Provides @Singleton
    def PlaceController providePlaceController(com.google.web.bindery.event.shared.EventBus eventBus) {
      return new PlaceController(eventBus)
    }

    @Provides @Singleton
    def PlaceHistoryHandler providePlaceHistoryHandler(PlaceHistoryMapper mapper) {
      return new PlaceHistoryHandler(mapper)
    }

    @Provides @Singleton
    def ActivityManager provideActivityManager(ActivityMapper activityMapper, EventBus eventBus) {
      return new ActivityManager(activityMapper, eventBus)
    }
  }

  private static MiscBundle bundle = GWT.create(MiscBundle)
  private static MiscBundle.Css css = bundle.css() => [ ensureInjected ]

  private Place defaultPlace = new NodesPlace()
  private SimplePanel appWidget = new SimplePanel()

  public override def onModuleLoad() {
    // prefix root for rest urls
    Defaults.setServiceRoot("/api")

    val injector = GWT.create(ClientInjector) as ClientInjector
    val eventBus = injector.getEventBus()
    val placeController = injector.getPlaceController()
    val historyHandler = injector.getPlaceHistoryHandler()
    historyHandler.register(placeController, eventBus, defaultPlace)

    val historyMapper = injector.getPlaceHistoryMapper()
    val managerLink = new Hyperlink("manager", historyMapper.getToken(new ManagerPlace()))
    val nodesLink = new Hyperlink("nodes", historyMapper.getToken(new NodesPlace()))
    val registryLink = new Hyperlink("registry", historyMapper.getToken(new RegistryPlace()))
    //final Hyperlink dataLink = new Hyperlink("data", historyMapper.getToken(new DataPlace()));

    eventBus.addHandler(PlaceChangeEvent.TYPE, new PlaceChangeEvent.Handler() {
      public override def onPlaceChange(PlaceChangeEvent event) {
        val place = event.getNewPlace();
        managerLink.removeStyleName("selected");
        nodesLink.removeStyleName("selected");
        registryLink.removeStyleName("selected");
        //dataLink.removeStyleName("selected");
        //if (place instanceof DataPlace) dataLink.addStyleName("selected");
        if (place instanceof ManagerPlace) managerLink.addStyleName("selected");
        if (place instanceof NodesPlace) nodesLink.addStyleName("selected");
        if (place instanceof RegistryPlace) registryLink.addStyleName("selected");
      }
    });

    val menu = new FlowPanel();
    menu.add(managerLink);
    menu.add(nodesLink);
    menu.add(registryLink);
    //menu.add(dataLink);
    menu.addStyleName(css.pageMenuClass());

    val page = new VerticalPanel();
    page.setWidth("100%");
    page.setHorizontalAlignment(HasHorizontalAlignment.ALIGN_LEFT);
    page.add(menu);
    page.add(appWidget);
    RootPanel.get().add(page);

    val activityManager = injector.getActivityManager();
    activityManager.setDisplay(appWidget);

    historyHandler.handleCurrentHistory();
  }
}
