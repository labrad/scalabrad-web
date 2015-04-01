package org.labrad.browser.client.nodes

import java.util.ArrayList
import java.util.logging.Logger
import org.labrad.browser.client.BrowserImages
import org.labrad.browser.client.event.NodeServerEvent
import org.labrad.browser.client.server.ServerPlace
import com.google.gwt.core.client.GWT
import com.google.gwt.event.dom.client.ClickEvent
import com.google.gwt.event.dom.client.ClickHandler
import com.google.gwt.event.dom.client.MouseOutEvent
import com.google.gwt.event.dom.client.MouseOverEvent
import com.google.gwt.event.shared.EventBus
import com.google.gwt.event.shared.HandlerRegistration
import com.google.gwt.place.shared.PlaceController
import com.google.gwt.user.client.rpc.AsyncCallback
import com.google.gwt.user.client.ui.DeckPanel
import com.google.gwt.user.client.ui.HasHorizontalAlignment
import com.google.gwt.user.client.ui.HorizontalPanel
import com.google.gwt.user.client.ui.Image
import com.google.gwt.user.client.ui.Label
import com.google.gwt.user.client.ui.PushButton
import com.google.gwt.user.client.ui.VerticalPanel

class InstanceController extends HorizontalPanel implements ClickHandler, AsyncCallback<String>, NodeServerEvent.Handler {
  static val log = Logger.getLogger("InstanceController")
  static val nodeService = GWT.create(NodeService) as NodeServiceAsync
  static val images = GWT.create(BrowserImages) as BrowserImages

  static val BUTTONS = 0
  static val THROBBER = 1

  private static enum Color {
    GRAY,
    GREEN,
    RED
  }

  val EventBus eventBus
  val PlaceController placeController
  val ControlPanel parent
  val String node
  val String server
  String instance
  val String version
  val Label statusLabel
  val PushButton info
  val PushButton start
  val PushButton stop
  val PushButton restart
  val DeckPanel controls
  val boolean isLocal

  Color color
  InstanceStatus status

  new(EventBus eventBus, PlaceController placeController, ControlPanel parent, String node, String server,
    String instance, String version, String[] runningInstances, String[] environmentVars) {
    this.eventBus = eventBus
    this.placeController = placeController
    this.parent = parent
    this.node = node
    this.server = server
    if (runningInstances.length > 0) {
      this.instance = runningInstances.get(0)
    } else {
      this.instance = instance
    }
    this.version = version
    this.isLocal = environmentVars.length > 0
    this.color = Color.GRAY

    // build widget
    statusLabel = new Label
    statusLabel.addStyleDependentName("status")

    // build info button
    info = new PushButton(new Image(images.serverInfoIcon))
    info.upDisabledFace.setImage(new Image(images.serverInfoIconDisabled))
    info.addClickHandler(this)
    info.setEnabled(version != null)
    info.setTitle(version)

    // build control button
    start = new PushButton(new Image(images.startServerIcon))
    start.upDisabledFace.setImage(new Image(images.startServerIconDisabled))
    start.addClickHandler(this)

    stop = new PushButton(new Image(images.stopServerIcon))
    stop.upDisabledFace.setImage(new Image(images.stopServerIconDisabled))
    stop.addClickHandler(this)

    restart = new PushButton(new Image(images.restartServerIcon))
    restart.upDisabledFace.setImage(new Image(images.restartServerIconDisabled))
    restart.addClickHandler(this)

    // put control buttons in a panel
    val buttons = new HorizontalPanel => [
      add(start)
      add(stop)
      add(restart)
    ]

    // build a panel to hold the throbber
    val throbber = new VerticalPanel => [
      add(new Image(images.throbber))
      setHorizontalAlignment(HasHorizontalAlignment.ALIGN_CENTER)
    ]

    // build deck that will show either control buttons or throbber
    controls = new DeckPanel => [
      add(buttons)
      add(throbber)
    ]

    // put together the whole widget
    add(statusLabel)
    add(info)
    add(controls)

    // set the initial status of the widget
    val running = runningInstances.length > 0
    setStatus(if (running) InstanceStatus.STARTED else InstanceStatus.STOPPED, true) // register all event handlers
    registerHandlers()
  }

  /**
   * Keep track of all event registrations so we can remove them later
   */
  val registrations = new ArrayList<HandlerRegistration>

  /**
   * Register event handlers for events we care about
   */
  def private void registerHandlers() {
    registrations.add(eventBus.addHandler(NodeServerEvent.TYPE, this)) // highlight the row for this server when the user mouses over
    registrations.add(this.addDomHandler([parent.highlight(server)], MouseOverEvent.type)) // unhighlight the row for this server when the user mouses out
    registrations.add(this.addDomHandler([parent.unhighlight(server)], MouseOutEvent.type))
  }

  /**
   * Remove all registered event handlers
   */
  def void unregisterHandlers() {
    for (reg : registrations) {
      reg.removeHandler()
    }
  }

  /**
   * Handle a server status change event
   * @param e
   * @param status
   */
  override void onNodeServerEvent(NodeServerEvent e) {
    if (e.server == server) {
      val here = (e.node == node)
      if (here && e.instance != null) {
        instance = e.instance
      }
      setStatus(e.status, here)
    }

  }

  /** 
   * Return whether this instance is currently running
   * @return
   */
  def boolean isRunning() {
    status == InstanceStatus.STARTED
  }

  /** 
   * Whether this is a local server (ie one that can run multiple instances)
   * @return
   */
  def boolean isLocal() {
    isLocal
  }

  def String getVersion() {
    version
  }

  /** 
   * Handle button clicks by invoking the appropriate action on the server
   */
  override void onClick(ClickEvent e) {
    switch e.source {
      case start: nodeService.startServer(node, server, this)
      case restart: nodeService.restartServer(node, instance, this)
      case stop: nodeService.stopServer(node, instance, this)
      case info: placeController.goTo(new ServerPlace(instance))
    }
  }

  /** 
   * Log a failure when a request to start/stop/restart a server fails
   */
  override void onFailure(Throwable e) {
    if (e instanceof NodeRequestError) {
      log.severe('''failed to «e.action» server '«e.server»' on node '«e.node»': «e.details»''')
    } else {
      log.severe('''error: «e»''')
    }
  }

  /** 
   * Start/stop/restart requests return the server instance name
   */
  override void onSuccess(String result) {
  }

  /** 
   * Set the widget status in response to state changes
   * @param status
   * @param here
   */
  def private void setStatus(InstanceStatus status, boolean here) {
    if (here) {
      this.status = status
      switch status {
        case STARTING: configure("starting...", Color.RED, false, false, false, THROBBER)
        case STARTED: configure("started", Color.GREEN, false, true, true, BUTTONS)
        case STOPPING: configure("stopping...", Color.RED, false, false, false, THROBBER)
        case STOPPED: configure("stopped", Color.RED, true, false, false, BUTTONS)
      }
    } else {
      if (isLocal) { return }
      switch status {
        case STARTING: configure("starting", Color.GRAY, false, false, false, BUTTONS)
        case STARTED: configure("started", Color.GRAY, false, false, false, BUTTONS)
        case STOPPING: {} // do nothing
        case STOPPED: configure("stopped", Color.RED, true, false, false, BUTTONS)
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
  def private void configure(String state, Color newColor, boolean canStart, boolean canRestart, boolean canStop,
    int buttonPage) {
    // set the status text
    statusLabel.setText(state)
    // remove old color style
    switch color {
      case GREEN: statusLabel.removeStyleDependentName("green")
      case RED: statusLabel.removeStyleDependentName("red")
      default: {}
    }
    // add new color style
    switch newColor {
      case GREEN: statusLabel.addStyleDependentName("green")
      case RED: statusLabel.addStyleDependentName("red")
      default: {}
    }
    color = newColor // set button state
    start.setEnabled(canStart)
    restart.setEnabled(canRestart)
    stop.setEnabled(canStop)
    info.setEnabled(canStop) // show either buttons or throbber
    controls.showWidget(buttonPage)
  }
}
