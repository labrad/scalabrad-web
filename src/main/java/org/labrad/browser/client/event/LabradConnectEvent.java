package org.labrad.browser.client.event;

import java.io.Serializable;

import com.google.gwt.event.shared.EventHandler;
import com.google.gwt.event.shared.GwtEvent;
import com.google.gwt.json.client.JSONObject;
import com.google.gwt.json.client.JSONString;
import com.google.gwt.json.client.JSONValue;

@SuppressWarnings("serial")
public class LabradConnectEvent extends GwtEvent<LabradConnectEvent.Handler> implements Serializable {
  private String host;

  protected LabradConnectEvent() {}

  public LabradConnectEvent(String host) {
    this.host = host;
  }

  public JSONObject toJson() {
    JSONObject result = new JSONObject();
    result.put("event", new JSONString("LabradConnectEvent"));
    result.put("host", new JSONString(host));
    return result;
  }

  public static LabradConnectEvent fromJson(JSONValue value) {
    JSONObject obj = value.isObject();
    if (obj == null) return null;

    JSONString event = obj.get("event").isString();
    if (event == null || !"LabradConnectEvent".equals(event.stringValue())) {
      return null;
    }

    String host = obj.get("host").isString().stringValue();
    return new LabradConnectEvent(host);
  }

  public String getHost() { return host; }

  @Override
  public String toString() { return "host: '" + host + "'"; }


  public static interface Handler extends EventHandler {
    void onLabradConnect(LabradConnectEvent event);
  }
  public static Type<Handler> TYPE = new Type<Handler>();

  @Override
  public GwtEvent.Type<Handler> getAssociatedType() {
    return TYPE;
  }

  @Override
  protected void dispatch(Handler handler) {
    handler.onLabradConnect(this);
  }
}
