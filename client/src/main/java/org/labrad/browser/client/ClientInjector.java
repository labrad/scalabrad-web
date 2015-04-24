package org.labrad.browser.client;

import org.labrad.browser.client.event.RemoteEventBus;

import com.google.gwt.activity.shared.ActivityManager;
import com.google.gwt.activity.shared.ActivityMapper;
import com.google.gwt.event.shared.EventBus;
import com.google.gwt.inject.client.GinModules;
import com.google.gwt.inject.client.Ginjector;
import com.google.gwt.place.shared.PlaceController;
import com.google.gwt.place.shared.PlaceHistoryHandler;
import com.google.gwt.place.shared.PlaceHistoryMapper;

@GinModules(LabradBrowser.Module.class)
public interface ClientInjector extends Ginjector {
  EventBus getEventBus();
  PlaceController getPlaceController();
  ActivityMapper getActivityMapper();
  ActivityManager getActivityManager();
  PlaceHistoryMapper getPlaceHistoryMapper();
  PlaceHistoryHandler getPlaceHistoryHandler();

  RemoteEventBus getRemoteEventManager();
}
