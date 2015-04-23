package org.labrad.browser.client.event;

import org.labrad.browser.client.message.NodeStatusMessage;

import com.google.gwt.event.shared.EventHandler;
import com.google.gwt.event.shared.GwtEvent;

public class NodeStatusEvent extends GwtEvent<NodeStatusEvent.Handler> {

  public static interface Handler extends EventHandler {
    void onNodeStatus(NodeStatusEvent event);
  }
  public static Type<Handler> TYPE = new Type<Handler>();


  public NodeStatusMessage msg;

  protected NodeStatusEvent() {}

  public NodeStatusEvent(NodeStatusMessage msg) {
    this.msg = msg;
  }

  @Override
  public String toString() { return msg.toString(); }

  @Override
  public GwtEvent.Type<Handler> getAssociatedType() {
    return TYPE;
  }

  @Override
  protected void dispatch(Handler handler) {
    handler.onNodeStatus(this);
  }
}
