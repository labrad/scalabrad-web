package org.labrad.browser.client.event;

import java.util.logging.Logger;

import org.labrad.browser.client.util.Util;

import com.google.gwt.event.shared.EventBus;
import com.google.gwt.event.shared.GwtEvent;
import com.google.gwt.user.client.Timer;
import com.google.gwt.user.client.rpc.AsyncCallback;
import com.google.inject.Inject;

public class RemoteEventBus {
  // how long to wait before retrying when we lose our connection
  private static final int ERROR_DELAY = 5000;
  private static final int INITIAL_POLL_DELAY = 1000;
  private static final int MINIMUM_POLL_DELAY = 100;
  private static final Logger log = Logger.getLogger("RemoteEventBus");

  private boolean running = false;
  private boolean connected = false;
  private final String connectionId = Util.randomId();

  private final RemoteEventServiceAsync eventService;
  private final AsyncCallback<Void> connectCallback;
  private final AsyncCallback<GwtEvent<?>[]> getEventCallback;
  private final Timer pollTimer;

  @Inject
  public RemoteEventBus(final EventBus eventBus, RemoteEventServiceAsync eventService) {
    this.eventService = eventService;

    // callback for when we connect to the event service
    connectCallback = new AsyncCallback<Void>() {
      public void onFailure(Throwable caught) {
        log.severe("Error while connecting: " + caught.getMessage());
        if (running) {
          pollLater(ERROR_DELAY);
        }
      }

      public void onSuccess(Void result) {
        log.info("Connected remote event bus. id=" + connectionId);
        connected = true;
        if (running) {
          eventBus.fireEvent(new RemoteEventBusConnectEvent(RemoteEventBus.this));
          pollLater(INITIAL_POLL_DELAY); // if we poll immediately then some browsers (e.g. chrome) display busy icon forever
        }
      }
    };

    // callback for when we are notified that an event is ready
    getEventCallback = new AsyncCallback<GwtEvent<?>[]>() {
      public void onFailure(Throwable caught) {
        log.severe("Error while getting events: " + caught.toString());
        connected = false;
        if (running) {
          eventBus.fireEvent(new RemoteEventBusDisconnectEvent(RemoteEventBus.this));
          pollLater(ERROR_DELAY);
        }
      }

      public void onSuccess(GwtEvent<?>[] events) {
        log.info("got events: " + (events == null ? "null" : ("" + events.length)));
        if (running) {
          if (events != null) {
            for (GwtEvent<?> e : events) {
              String[] segments = e.getClass().getName().split("\\.");
              String className = segments[segments.length-1];
              log.info(className + ": " + e.toString());

              eventBus.fireEvent(e);
            }
          }
          pollLater(MINIMUM_POLL_DELAY);
        }
      }
    };

    pollTimer = new Timer() {
      public void run() { poll(); }
    };
  }

  public void start() {
    if (!running) {
      running = true;
      poll();
    }
  }

  public void stop() {
    running = false;
  }

  /**
   * The main polling loop.  Tries to establish a connection to the server,
   * or if already connected, tries to fetch available events.
   */
  private void poll() {
    if (running) {
      if (!connected) {
        eventService.connect(connectionId, connectCallback);
      } else {
        log.info("getEvents");
        eventService.getEvents(connectionId, getEventCallback);
      }
    }
  }

  /**
   * Restart the message polling loop after a specified delay
   * @param delayMillis
   */
  private void pollLater(int delayMillis) {
    if (running) {
      pollTimer.schedule(delayMillis);
    }
  }

  public boolean isConnected() {
    return connected;
  }

  public String getId() {
    return connectionId;
  }

  public void disconnect() {
    if (connected) {
      // add a dummy callback, even though we can't really respond to
      // either failure or success since the window is closing
      eventService.disconnect(connectionId, new AsyncCallback<Void>() {
        public void onFailure(Throwable caught) {}
        public void onSuccess(Void result) {}
      });
    }
  }
}
