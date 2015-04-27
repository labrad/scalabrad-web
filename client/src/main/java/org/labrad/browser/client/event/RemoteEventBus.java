package org.labrad.browser.client.event;

import java.util.logging.Logger;

import org.labrad.browser.client.message.Codecs;
import org.labrad.browser.client.message.LabradConnectMessage;
import org.labrad.browser.client.message.LabradDisconnectMessage;
import org.labrad.browser.client.message.NodeServerMessage;
import org.labrad.browser.client.message.NodeServerStatus;
import org.labrad.browser.client.message.NodeStatusMessage;
import org.labrad.browser.client.message.RegistryDirMessage;
import org.labrad.browser.client.message.RegistryKeyMessage;
import org.labrad.browser.client.message.ServerConnectMessage;
import org.labrad.browser.client.message.ServerDisconnectMessage;
import org.labrad.browser.client.util.Util;

import com.google.gwt.core.client.GWT;
import com.google.gwt.core.client.JavaScriptObject;
import com.google.gwt.core.client.js.JsProperty;
import com.google.gwt.core.client.js.JsType;
import com.google.gwt.event.shared.EventBus;
import com.google.gwt.event.shared.GwtEvent;
import com.google.gwt.json.client.JSONObject;
import com.google.gwt.json.client.JSONValue;
import com.google.gwt.user.client.Timer;
import com.google.gwt.user.client.rpc.AsyncCallback;
import com.google.inject.Inject;
import com.sksamuel.gwt.websockets.Websocket;
import com.sksamuel.gwt.websockets.WebsocketListener;

import elemental.json.impl.JsonUtil;

public class RemoteEventBus {
  // how long to wait before retrying when we lose our connection
  private static final int ERROR_DELAY = 5000;
  private static final int INITIAL_POLL_DELAY = 1000;
  private static final int MINIMUM_POLL_DELAY = 100;
  private static final int PING_DELAY = 30000;
  private static final Logger log = Logger.getLogger("RemoteEventBus");

  private boolean running = false;
  private boolean connected = false;
  private final String connectionId = Util.randomId();

  private final AsyncCallback<Void> connectCallback;
  private final AsyncCallback<GwtEvent<?>[]> getEventCallback;
  private final Timer pollTimer;
  private final Timer pingTimer;

  private final String location = GWT.getHostPageBaseURL().replace("http", "ws") + "ws/echo";
  private final Websocket socket = new Websocket(location);

  @JsType
  public interface Message {
    @JsProperty String type();
    @JsProperty <T> T payload();
  }

  @Inject
  public RemoteEventBus(final EventBus eventBus) {

    socket.addListener(new WebsocketListener() {

      @Override
      public void onOpen() {
        log.info("web socket sending: Hello!!");
        ping();
      }

      @Override
      public void onMessage(String data) {
        log.info("web socket received: " + data);
        if ("PING".equals(data)) {
          pong();
        } else if ("PONG".equals(data)) {
          // send another ping in a few seconds
          pingLater(PING_DELAY);
        } else {
          Message msg = JsonUtil.parse(data);
          if (RegistryKeyMessage.class.getName().equals(msg.type())) {
            RegistryKeyMessage m = Codecs.registryKey.decode(payload(msg));
            eventBus.fireEvent(new RegistryKeyEvent(m));

          } else if (RegistryDirMessage.class.getName().equals(msg.type())) {
            RegistryDirMessage m = Codecs.registryDir.decode(payload(msg));
            eventBus.fireEvent(new RegistryDirEvent(m));

          } else if (LabradConnectMessage.class.getName().equals(msg.type())) {
            LabradConnectMessage m = Codecs.labradConnect.decode(payload(msg));
            eventBus.fireEvent(new LabradConnectEvent(m));

          } else if (LabradDisconnectMessage.class.getName().equals(msg.type())) {
            LabradDisconnectMessage m = Codecs.labradDisconnect.decode(payload(msg));
            eventBus.fireEvent(new LabradDisconnectEvent(m));

          } else if (ServerConnectMessage.class.getName().equals(msg.type())) {
            ServerConnectMessage m = Codecs.serverConnect.decode(payload(msg));
            eventBus.fireEvent(new ServerConnectEvent(m));

          } else if (ServerDisconnectMessage.class.getName().equals(msg.type())) {
            ServerDisconnectMessage m = Codecs.serverDisconnect.decode(payload(msg));
            eventBus.fireEvent(new ServerDisconnectEvent(m));

          } else if (NodeServerMessage.class.getName().equals(msg.type())) {
            NodeServerMessage m = Codecs.nodeServer.decode(payload(msg));
            eventBus.fireEvent(new NodeServerEvent(m));

          } else if (NodeStatusMessage.class.getName().equals(msg.type())) {
            NodeStatusMessage m = Codecs.nodeStatus.decode(payload(msg));
            eventBus.fireEvent(new NodeStatusEvent(m));

          } else {
            log.info("got message with unknown type: " + msg.type());
          }
        }
      }

      @Override
      public void onClose() {
        log.info("web socket closed.");
      }
    });
    socket.open();

    // callback for when we connect to the event service
    connectCallback = new AsyncCallback<Void>() {
      public void onFailure(Throwable caught) {
        log.severe("Error while connecting: " + caught.getMessage());
        if (running) {
          pollLater(ERROR_DELAY);
        }
      }

      public void onSuccess(Void result) {
        log.info("web socket location: " + location);
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
        log.info("got events: " + (events == null ? 0 : events.length));
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

    pingTimer = new Timer() {
      public void run() { ping(); }
    };

    pollTimer = new Timer() {
      public void run() { poll(); }
    };
  }

  private JSONObject payload(Message msg) {
    JavaScriptObject jso = msg.payload();
    return new JSONObject(jso);
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
        //eventService.connect(connectionId, connectCallback);
      } else {
        log.info("getEvents");
        //eventService.getEvents(connectionId, getEventCallback);
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

  private void ping() {
    socket.send("PING");
  }

  private void pong() {
    socket.send("PONG");
  }

  private void pingLater(int delayMillis) {
    if (running) {
      pingTimer.schedule(delayMillis);
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
//      eventService.disconnect(connectionId, new AsyncCallback<Void>() {
//        public void onFailure(Throwable caught) {}
//        public void onSuccess(Void result) {}
//      });
    }
  }
}
