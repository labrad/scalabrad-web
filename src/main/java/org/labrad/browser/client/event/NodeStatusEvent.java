package org.labrad.browser.client.event;

import java.io.Serializable;

import com.google.gwt.event.shared.EventHandler;
import com.google.gwt.event.shared.GwtEvent;


@SuppressWarnings("serial")
public class NodeStatusEvent extends GwtEvent<NodeStatusEvent.Handler> implements Serializable {
  private String name;
  private NodeServerStatus[] servers;

  protected NodeStatusEvent() {}

  public NodeStatusEvent(String name, NodeServerStatus[] servers) {
    this.name = name;
    this.servers = servers;
  }

  public void setName(String name) {
    this.name = name;
  }

  public void setServers(NodeServerStatus[] servers) {
    this.servers = servers;
  }

  public String getName() {
    return name;
  }

  public NodeServerStatus[] getServers() {
    return servers;
  }

  @Override
  public String toString() {
    return "node: '" + name + "'";
  }


  public static interface Handler extends EventHandler {
    void onNodeStatus(NodeStatusEvent event);
  }

  public static Type<Handler> TYPE = new Type<Handler>();

  @Override
  public GwtEvent.Type<Handler> getAssociatedType() {
    return TYPE;
  }

  @Override
  protected void dispatch(Handler handler) {
    handler.onNodeStatus(this);
  }
}
