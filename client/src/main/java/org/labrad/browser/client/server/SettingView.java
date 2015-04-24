package org.labrad.browser.client.server;

import com.google.gwt.core.client.GWT;
import com.google.gwt.dom.client.DivElement;
import com.google.gwt.dom.client.Element;
import com.google.gwt.dom.client.SpanElement;
import com.google.gwt.dom.client.UListElement;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.uibinder.client.UiField;
import com.google.gwt.user.client.DOM;
import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.Widget;

public class SettingView extends Composite {

  interface MyUiBinder extends UiBinder<Widget, SettingView> {}
  private static MyUiBinder uiBinder = GWT.create(MyUiBinder.class);

  @UiField SpanElement name;
  @UiField SpanElement id;
  @UiField DivElement doc;
  @UiField UListElement accepted;
  @UiField UListElement returned;

  public SettingView(SettingInfo info) {
    initWidget(uiBinder.createAndBindUi(this));
    name.setInnerText(info.getName());
    id.setInnerText(Long.toString(info.getId()));
    doc.setInnerText(info.getDoc());

    for (String type : info.getAcceptedTypes()) {
      Element child = DOM.createElement("li");
      child.setInnerText(type);
      accepted.appendChild(child);
    }

    for (String type : info.getReturnedTypes()) {
      Element child = DOM.createElement("li");
      child.setInnerText(type);
      returned.appendChild(child);
    }
  }
}