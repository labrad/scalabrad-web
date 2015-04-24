package org.labrad.browser.client.server;

import com.google.gwt.core.client.GWT;
import com.google.gwt.dom.client.DivElement;
import com.google.gwt.dom.client.SpanElement;
import com.google.gwt.event.shared.EventBus;
import com.google.gwt.uibinder.client.UiBinder;
import com.google.gwt.uibinder.client.UiField;
import com.google.gwt.user.client.rpc.AsyncCallback;
import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.VerticalPanel;
import com.google.gwt.user.client.ui.Widget;
import com.google.inject.assistedinject.Assisted;
import com.google.inject.assistedinject.AssistedInject;

public class ServerViewImpl extends Composite implements ServerView {

  interface MyUiBinder extends UiBinder<Widget, ServerViewImpl> {}
  private static MyUiBinder uiBinder = GWT.create(MyUiBinder.class);

  private final InfoServiceAsync infoService;

  private final Presenter presenter;
  private final String name;

  @UiField SpanElement nameField;
  @UiField SpanElement id;
  @UiField DivElement doc;
  @UiField VerticalPanel settings;

  @AssistedInject
  public ServerViewImpl(
      @Assisted String name,
      @Assisted Presenter presenter,
      @Assisted EventBus eventBus,
      InfoServiceAsync infoService) {
    this.name = name;
    this.presenter = presenter;
    this.infoService = infoService;

    initWidget(uiBinder.createAndBindUi(this));
    getInfo();
  }

  private void getInfo() {
    infoService.getServerInfo(name, new AsyncCallback<ServerInfo>() {
      public void onFailure(Throwable caught) {
        nameField.setInnerText(name);
        doc.setInnerText("error while getting server info: " + caught.getMessage());
      }

      public void onSuccess(ServerInfo info) {
        nameField.setInnerText(info.getName());
        id.setInnerText(Long.toString(info.getId()));
        doc.setInnerText(info.getDescription());

        for (SettingInfo setting : info.getSettings()) {
          settings.add(new SettingView(setting));
        }
      }
    });
  }
}
