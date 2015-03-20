package org.labrad.browser.client;

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
import com.google.gwt.safehtml.client.SafeHtmlTemplates;
import com.google.gwt.safehtml.shared.SafeHtml;
import com.google.gwt.user.client.ui.FlowPanel;
import com.google.gwt.user.client.ui.HTMLPanel;
import com.google.gwt.user.client.ui.HasHorizontalAlignment;
import com.google.gwt.user.client.ui.Hyperlink;
import com.google.gwt.user.client.ui.RootPanel;
import com.google.gwt.user.client.ui.SimplePanel;
import com.google.gwt.user.client.ui.VerticalPanel;
import com.google.inject.Provides;
import com.google.inject.Singleton;

public class LabradBrowser implements EntryPoint {
  public static class Module extends AbstractGinModule {
    protected void configure() {
      bind(EventBus.class).to(SimpleEventBus.class).in(Singleton.class);
      bind(RemoteEventBus.class).in(Singleton.class);

      bind(ActivityMapper.class).to(BrowserActivityMapper.class);
      bind(PlaceHistoryMapper.class).to(BrowserPlaceHistoryMapper.class);

      install(new GinFactoryModuleBuilder()
        .implement(DataView.class, DataViewImpl.class)
        .implement(DatasetView.class, DatasetViewImpl.class)
        .implement(ManagerView.class, ManagerViewImpl.class)
        .implement(NodesView.class, NodesViewImpl.class)
        .implement(RegistryView.class, RegistryViewImpl.class)
        .implement(ServerView.class, ServerViewImpl.class)
        .build(ViewFactory.class));
    }

    @Provides @Singleton
    com.google.web.bindery.event.shared.EventBus provideBinderyEventBus(EventBus eventBus) {
      return eventBus;
    }

    @Provides @Singleton
    PlaceController providePlaceController(com.google.web.bindery.event.shared.EventBus eventBus) {
      return new PlaceController(eventBus);
    }

    @Provides @Singleton
    PlaceHistoryHandler providePlaceHistoryHandler(PlaceHistoryMapper mapper) {
      return new PlaceHistoryHandler(mapper);
    }

    @Provides @Singleton
    ActivityManager provideActivityManager(ActivityMapper activityMapper, EventBus eventBus) {
      return new ActivityManager(activityMapper, eventBus);
    }
  }

  public static interface Templates extends SafeHtmlTemplates {
    @Template(
      "<paper-tabs selected=\"0\">" +
        "<paper-tab>info</paper-tab>" +
        "<paper-tab>nodes</paper-tab>" +
        "<paper-tab>registry</paper-tab>" +
        "<paper-tab>vault</paper-tab>" +
      "</paper-tabs>")
    SafeHtml tabs();
  }

  private static final Templates TEMPLATES = GWT.create(Templates.class);

  private Place defaultPlace = new NodesPlace();
  private SimplePanel appWidget = new SimplePanel();

  public void onModuleLoad() {
    ClientInjector injector = GWT.create(ClientInjector.class);
    com.google.web.bindery.event.shared.EventBus eventBus = injector.getEventBus();
    PlaceController placeController = injector.getPlaceController();
    PlaceHistoryHandler historyHandler = injector.getPlaceHistoryHandler();
    historyHandler.register(placeController, eventBus, defaultPlace);

    PlaceHistoryMapper historyMapper = injector.getPlaceHistoryMapper();
    final Hyperlink managerLink = new Hyperlink("info", historyMapper.getToken(new ManagerPlace()));
    final Hyperlink nodesLink = new Hyperlink("nodes", historyMapper.getToken(new NodesPlace()));
    final Hyperlink registryLink = new Hyperlink("registry", historyMapper.getToken(new RegistryPlace()));
    //final Hyperlink dataLink = new Hyperlink("data", historyMapper.getToken(new DataPlace()));

    eventBus.addHandler(PlaceChangeEvent.TYPE, new PlaceChangeEvent.Handler() {
      public void onPlaceChange(PlaceChangeEvent event) {
        Place place = event.getNewPlace();
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

    HTMLPanel tabs = new HTMLPanel(TEMPLATES.tabs());

    FlowPanel menu = new FlowPanel();
    menu.add(managerLink);
    menu.add(nodesLink);
    menu.add(registryLink);
    //menu.add(dataLink);
    menu.addStyleName("page-menu");

    VerticalPanel page = new VerticalPanel();
    page.addStyleName("full-page");
    page.setHorizontalAlignment(HasHorizontalAlignment.ALIGN_LEFT);
    page.add(tabs);
    page.add(menu);
    page.add(appWidget);
    RootPanel.get().add(page);

    ActivityManager activityManager = injector.getActivityManager();
    activityManager.setDisplay(appWidget);

    historyHandler.handleCurrentHistory();
  }
}
