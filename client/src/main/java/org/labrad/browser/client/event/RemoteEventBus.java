package org.labrad.browser.client.event;

import java.util.List;
import java.util.logging.Logger;

import org.fusesource.restygwt.client.MethodCallback;
import org.labrad.browser.client.message.Codecs;
import org.labrad.browser.common.message.LabradConnectMessage;
import org.labrad.browser.common.message.LabradDisconnectMessage;
import org.labrad.browser.common.message.NodeServerMessage;
import org.labrad.browser.common.message.NodeStatusMessage;
import org.labrad.browser.common.message.RegistryDirMessage;
import org.labrad.browser.common.message.RegistryKeyMessage;
import org.labrad.browser.common.message.ServerConnectMessage;
import org.labrad.browser.common.message.ServerDisconnectMessage;

import com.google.gwt.core.client.GWT;
import com.google.gwt.core.client.JavaScriptObject;
import com.google.gwt.core.client.js.JsProperty;
import com.google.gwt.core.client.js.JsType;
import com.google.gwt.event.shared.EventBus;
import com.google.gwt.json.client.JSONArray;
import com.google.gwt.json.client.JSONObject;
import com.google.gwt.json.client.JSONString;
import com.google.gwt.user.client.Timer;
import com.google.inject.Inject;
import com.sksamuel.gwt.websockets.Websocket;
import com.sksamuel.gwt.websockets.WebsocketListener;

import elemental.json.impl.JsonUtil;

public class RemoteEventBus {
  // how long to wait before retrying when we lose our connection
  private static final int POLL_DELAY = 5000;
  private static final int PING_DELAY = 30000;
  private static final Logger log = Logger.getLogger("RemoteEventBus");

  private boolean running = false;
  private boolean connected = false;

  private final Timer pollTimer;
  private final Timer pingTimer;

  private final String location = GWT.getHostPageBaseURL().replace("http", "ws") + "api/socket";
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
        log.info("web socket connected");
        connected = true;
        ping();
        eventBus.fireEvent(new RemoteEventBusConnectEvent(RemoteEventBus.this));
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
        connected = false;
        eventBus.fireEvent(new RemoteEventBusDisconnectEvent(RemoteEventBus.this));
      }
    });

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
      socket.open();
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
    if (running && !connected) {
      socket.open();
    }
    pollLater(POLL_DELAY);
  }

  /**
   * Restart the message polling loop after a specified delay
   * @param delayMillis
   */
  private void pollLater(int delayMillis) {
    if (running && !pollTimer.isRunning()) {
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
    if (running && !pingTimer.isRunning()) {
      pingTimer.schedule(delayMillis);
    }
  }

  public boolean isConnected() {
    return connected;
  }

  public void disconnect() {
    if (connected) {
      socket.close();
    }
  }

  public void registryWatch(List<String> path) {
    if (!connected) return;
    JSONArray pth = new JSONArray();
    for (int i = 0; i < path.size(); i++) {
      pth.set(i, new JSONString(path.get(i)));
    }
    JSONObject payload = new JSONObject();
    payload.put("path", pth);
    JSONObject obj = new JSONObject();
    obj.put("type", new JSONString("watch"));
    obj.put("payload", payload);
    socket.send(obj.toString());
  }

  public void registryUnwatch(List<String> path) {
    if (!connected) return;
    JSONArray pth = new JSONArray();
    for (int i = 0; i < path.size(); i++) {
      pth.set(i, new JSONString(path.get(i)));
    }
    JSONObject payload = new JSONObject();
    payload.put("path", pth);
    JSONObject obj = new JSONObject();
    obj.put("type", new JSONString("unwatch"));
    obj.put("payload", payload);
    socket.send(obj.toString());
  }
}
