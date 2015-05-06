package org.labrad.browser.client.nodes;

import java.util.ArrayList;
import java.util.List;
import java.util.logging.Logger;

import org.fusesource.restygwt.client.Method;
import org.fusesource.restygwt.client.MethodCallback;
import org.labrad.browser.client.BrowserImages;
import org.labrad.browser.client.MiscBundle;
import org.labrad.browser.client.event.NodeServerEvent;
import org.labrad.browser.client.server.ServerPlace;
import org.labrad.browser.common.message.InstanceStatus;

import com.google.gwt.core.client.GWT;
import com.google.gwt.event.dom.client.ClickEvent;
import com.google.gwt.event.dom.client.ClickHandler;
import com.google.gwt.event.dom.client.MouseOutEvent;
import com.google.gwt.event.dom.client.MouseOutHandler;
import com.google.gwt.event.dom.client.MouseOverEvent;
import com.google.gwt.event.dom.client.MouseOverHandler;
import com.google.gwt.event.shared.EventBus;
import com.google.gwt.event.shared.HandlerRegistration;
import com.google.gwt.place.shared.PlaceController;
import com.google.gwt.user.client.ui.DeckPanel;
import com.google.gwt.user.client.ui.HasHorizontalAlignment;
import com.google.gwt.user.client.ui.HorizontalPanel;
import com.google.gwt.user.client.ui.Image;
import com.google.gwt.user.client.ui.Label;
import com.google.gwt.user.client.ui.PushButton;
import com.google.gwt.user.client.ui.VerticalPanel;

public class InstanceController extends HorizontalPanel
    implements ClickHandler, MethodCallback<String>, NodeServerEvent.Handler {

  private static final Logger log = Logger.getLogger("InstanceController");
  private static NodeService nodeService = GWT.create(NodeService.class);
  private static BrowserImages images = GWT.create(BrowserImages.class);

  private static MiscBundle bundle = GWT.create(MiscBundle.class);
  private static MiscBundle.Css css = bundle.css();

  static {
    css.ensureInjected();
  }

  private final EventBus eventBus;
  private final PlaceController placeController;
  private final ControlPanel parent;
  private final String node;
  private final String server;
  private String instance;
  private final String version;

  private final Label statusLabel;
  private final PushButton info;
  private final PushButton start;
  private final PushButton stop;
  private final PushButton restart;
  private final DeckPanel controls;

  private boolean isLocal;

  private final static int BUTTONS = 0;
  private final static int THROBBER = 1;

  private enum Color { GRAY, GREEN, RED }
  private Color color;

  private InstanceStatus status;

  public InstanceController(
      final EventBus eventBus, final PlaceController placeController, final ControlPanel parent,
      final String node, final String server, String instance, String version,
      String[] runningInstances, String[] environmentVars) {
    this.eventBus = eventBus;
    this.placeController = placeController;
    this.parent = parent;
    this.node = node;
    this.server = server;
    if (runningInstances.length > 0) {
      this.instance = runningInstances[0];
    } else {
      this.instance = instance;
    }
    this.version = version;
    this.isLocal = environmentVars.length > 0;
    this.color = Color.GRAY;

    // build widget
    statusLabel = new Label();
    statusLabel.addStyleName(css.labelStatusClass());

    // build info button
    info = new PushButton(new Image(images.serverInfoIcon()));
    info.getUpDisabledFace().setImage(new Image(images.serverInfoIconDisabled()));
    info.addClickHandler(this);
    info.setEnabled(version != null);
    info.setTitle(version);

    // build control button
    start = new PushButton(new Image(images.startServerIcon()));
    start.getUpDisabledFace().setImage(new Image(images.startServerIconDisabled()));
    start.addClickHandler(this);

    stop = new PushButton(new Image(images.stopServerIcon()));
    stop.getUpDisabledFace().setImage(new Image(images.stopServerIconDisabled()));
    stop.addClickHandler(this);

    restart = new PushButton(new Image(images.restartServerIcon()));
    restart.getUpDisabledFace().setImage(new Image(images.restartServerIconDisabled()));
    restart.addClickHandler(this);

    // put control buttons in a panel
    HorizontalPanel buttons = new HorizontalPanel();
    buttons.add(start);
    buttons.add(stop);
    buttons.add(restart);

    // build a panel to hold the throbber
    VerticalPanel throbber = new VerticalPanel();
    throbber.add(new Image(images.throbber()));
    throbber.setHorizontalAlignment(HasHorizontalAlignment.ALIGN_CENTER);

    // build deck that will show either control buttons or throbber
    controls = new DeckPanel();
    controls.add(buttons);
    controls.add(throbber);

    // put together the whole widget
    add(statusLabel);
    add(info);
    add(controls);

    // set the initial status of the widget
    boolean running = runningInstances.length > 0;
    setStatus(running ? InstanceStatus.STARTED : InstanceStatus.STOPPED, true);

    // register all event handlers
    registerHandlers();
  }

  /**
   * Keep track of all event registrations so we can remove them later
   */
  private final List<HandlerRegistration> registrations = new ArrayList<HandlerRegistration>();

  /**
   * Register event handlers for events we care about
   */
  private void registerHandlers() {
    registrations.add(
      eventBus.addHandler(NodeServerEvent.TYPE, this)
    );

    // highlight the row for this server when the user mouses over
    registrations.add(
      this.addDomHandler(new MouseOverHandler() {
        public void onMouseOver(MouseOverEvent event) {
          parent.highlight(server);
        }
      }, MouseOverEvent.getType())
    );

    // unhighlight the row for this server when the user mouses out
    registrations.add(
      this.addDomHandler(new MouseOutHandler() {
        public void onMouseOut(MouseOutEvent event) {
          parent.unhighlight(server);
        }
      }, MouseOutEvent.getType())
    );
  }

  /**
   * Remove all registered event handlers
   */
  public void unregisterHandlers() {
    for (HandlerRegistration reg : registrations) {
      reg.removeHandler();
    }
  }

  /**
   * Handle a server status change event
   * @param e
   * @param status
   */
  public void onNodeServerEvent(NodeServerEvent e) {
    if (e.msg.server.equals(server)) {
      boolean here = e.msg.node.equals(node);
      if (here && e.msg.instance != null) {
        instance = e.msg.instance;
      }
      setStatus(e.msg.status, here);
    }
  }

  /**
   * Return whether this instance is currently running
   * @return
   */
  public boolean isRunning() {
    return status == InstanceStatus.STARTED;
  }

  /**
   * Whether this is a local server (ie one that can run multiple instances)
   * @return
   */
  public boolean isLocal() {
    return isLocal;
  }

  public String getVersion() {
    return version;
  }

  /**
   * Handle button clicks by invoking the appropriate action on the server
   */
  public void onClick(ClickEvent e) {
    if (e.getSource() == start) {
      nodeService.startServer(node, server, this);
    } else if (e.getSource() == restart) {
      nodeService.restartServer(node, instance, this);
    } else if (e.getSource() == stop) {
      nodeService.stopServer(node, instance, this);
    } else if (e.getSource() == info) {
      placeController.goTo(new ServerPlace(instance));
    }
  }

  /**
   * Log a failure when a request to start/stop/restart a server fails
   */
  public void onFailure(Method method, Throwable caught) {
    log.severe("error: " + caught);
  }

  /**
   * Start/stop/restart requests return the server instance name
   */
  public void onSuccess(Method method, String result) {}

  /**
   * Set the widget status in response to state changes
   * @param status
   * @param here
   */
  private void setStatus(InstanceStatus status, boolean here) {
    if (here) {
      switch (status) {
        case STARTING: configure("starting...", Color.RED, false, false, false, THROBBER); break;
        case STARTED: configure("started", Color.GREEN, false, true, true, BUTTONS); break;
        case STOPPING: configure("stopping...", Color.RED, false, false, false, THROBBER); break;
        case STOPPED: configure("stopped", Color.RED, true, false, false, BUTTONS); break;
      }
      this.status = status;
    } else {
      if (isLocal) return;
      switch (status) {
        case STARTING: configure("starting", Color.GRAY, false, false, false, BUTTONS); break;
        case STARTED: configure("started", Color.GRAY, false, false, false, BUTTONS); break;
        case STOPPING: break;
        case STOPPED: configure("stopped", Color.RED, true, false, false, BUTTONS); break;
      }
    }
  }

  /**
   * Configure the visual appearance of the widget in response to state changes
   * @param state
   * @param newColor
   * @param canStart
   * @param canRestart
   * @param canStop
   * @param buttonPage
   */
  private void configure(String state, Color newColor,
      boolean canStart, boolean canRestart, boolean canStop,
      int buttonPage) {
    // set the status text
    statusLabel.setText(state);

    // remove old color style
    switch (color) {
      case GREEN: statusLabel.removeStyleName(css.labelGreenClass()); break;
      case RED: statusLabel.removeStyleName(css.labelRedClass()); break;
      default: break;
    }
    // add new color style
    switch (newColor) {
      case GREEN: statusLabel.addStyleName(css.labelGreenClass()); break;
      case RED: statusLabel.addStyleName(css.labelRedClass()); break;
      default: break;
    }
    color = newColor;

    // set button state
    start.setEnabled(canStart);
    restart.setEnabled(canRestart);
    stop.setEnabled(canStop);
    info.setEnabled(canStop);

    // show either buttons or throbber
    controls.showWidget(buttonPage);
  }
}
