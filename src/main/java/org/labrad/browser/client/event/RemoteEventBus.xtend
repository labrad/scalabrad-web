package org.labrad.browser.client.event

import java.util.logging.Logger
import org.labrad.browser.client.util.Util
import com.google.gwt.event.shared.EventBus
import com.google.gwt.event.shared.GwtEvent
import com.google.gwt.user.client.Timer
import com.google.gwt.user.client.rpc.AsyncCallback
import com.google.inject.Inject

class RemoteEventBus {
  // how long to wait before retrying when we lose our connection
  static val ERROR_DELAY = 5000
  static val INITIAL_POLL_DELAY = 1000
  static val MINIMUM_POLL_DELAY = 100
  static val log = Logger::getLogger("RemoteEventBus")

  boolean running = false
  boolean connected = false
  val connectionId = Util::randomId()
  val RemoteEventServiceAsync eventService
  val AsyncCallback<Void> connectCallback
  val AsyncCallback<GwtEvent<?>[]> getEventCallback
  val Timer pollTimer

  @Inject
  new(EventBus eventBus, RemoteEventServiceAsync eventService) {
    this.eventService = eventService

    // callback for when we connect to the event service
    connectCallback = new AsyncCallback<Void> {
      override void onFailure(Throwable caught) {
        log.severe("Error while connecting: " + caught.getMessage)
        if (running) {
          pollLater(ERROR_DELAY)
        }

      }

      override void onSuccess(Void result) {
        log.info("Connected remote event bus. id=" + connectionId)
        connected = true
        if (running) {
          eventBus.fireEvent(new RemoteEventBusConnectEvent(RemoteEventBus.this))
          pollLater(INITIAL_POLL_DELAY) // if we poll immediately then some browsers (e.g. chrome) display busy icon forever
        }

      }
    }

    // callback for when we are notified that an event is ready
    getEventCallback = new AsyncCallback<GwtEvent<?>[]> {
      override void onFailure(Throwable caught) {
        log.severe("Error while getting events: " + caught)
        connected = false
        if (running) {
          eventBus.fireEvent(new RemoteEventBusDisconnectEvent(RemoteEventBus.this))
          pollLater(ERROR_DELAY)
        }

      }

      override void onSuccess(GwtEvent<?>[] events) {
        log.info("got events: " + (if (events == null) "null" else events.length.toString))
        if (running) {
          if (events != null) {
            for (e : events) {
              val segments = e.class.name.split("\\.")
              val className = segments.get(segments.length - 1)
              log.info(className + ": " + e)
              eventBus.fireEvent(e)
            }

          }
          pollLater(MINIMUM_POLL_DELAY)
        }

      }
    }
    pollTimer = [poll()] as Timer
  }

  def void start() {
    if (!running) {
      running = true
      poll()
    }

  }

  def void stop() {
    running = false
  }

  /** 
   * The main polling loop.  Tries to establish a connection to the server,
   * or if already connected, tries to fetch available events.
   */
  private def void poll() {
    if (running) {
      if (!connected) {
        eventService.connect(connectionId, connectCallback)
      } else {
        log.info("getEvents")
        eventService.getEvents(connectionId, getEventCallback)
      }
    }

  }

  /** 
   * Restart the message polling loop after a specified delay
   * @param delayMillis
   */
  private def void pollLater(int delayMillis) {
    if (running) {
      pollTimer.schedule(delayMillis)
    }

  }

  def boolean isConnected() {
    return connected
  }

  def String getId() {
    return connectionId
  }

  def void disconnect() {
    if (connected) {
      // add a dummy callback, even though we can't really respond to
      // either failure or success since the window is closing
      eventService.disconnect(connectionId, new AsyncCallback<Void> {
        override void onFailure(Throwable caught) {
        }

        override void onSuccess(Void result) {
        }
      })
    }

  }

}
