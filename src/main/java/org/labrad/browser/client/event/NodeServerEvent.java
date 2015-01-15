package org.labrad.browser.client.event;

import java.io.Serializable;

import org.labrad.browser.client.nodes.InstanceStatus;

import com.google.gwt.event.shared.EventHandler;
import com.google.gwt.event.shared.GwtEvent;

@SuppressWarnings("serial")
public class NodeServerEvent extends GwtEvent<NodeServerEvent.Handler> implements Serializable {
  private String node;
  private String server;
  private String instance;
  private InstanceStatus status;

  protected NodeServerEvent() {}

  public NodeServerEvent(String node, String server, String instance, InstanceStatus status) {
    this.node = node;
    this.server = server;
    this.instance = instance;
    this.status = status;
  }

  public String getNode() { return node; }
  public String getServer() { return server; }
  public String getInstance() { return instance; }
  public InstanceStatus getStatus() { return status; }

  @Override
  public String toString() {
    return status + ", node='" + node + "', server='" + server + "', instance='" + instance + "'";
  }


  public static interface Handler extends EventHandler {
    void onNodeServerEvent(NodeServerEvent event);
  }

  public static Type<Handler> TYPE = new Type<Handler>();

  @Override
  public GwtEvent.Type<Handler> getAssociatedType() {
    return TYPE;
  }

  @Override
  protected void dispatch(Handler handler) {
    handler.onNodeServerEvent(this);
  }
}
