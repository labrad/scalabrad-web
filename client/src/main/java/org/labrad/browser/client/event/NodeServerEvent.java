package org.labrad.browser.client.event;

import org.labrad.browser.common.message.NodeServerMessage;

import com.google.gwt.event.shared.EventHandler;
import com.google.gwt.event.shared.GwtEvent;

public class NodeServerEvent extends GwtEvent<NodeServerEvent.Handler> {

  public static interface Handler extends EventHandler {
    void onNodeServerEvent(NodeServerEvent event);
  }
  public static Type<Handler> TYPE = new Type<Handler>();


  public NodeServerMessage msg;

  public NodeServerEvent(NodeServerMessage msg) {
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
    handler.onNodeServerEvent(this);
  }
}
