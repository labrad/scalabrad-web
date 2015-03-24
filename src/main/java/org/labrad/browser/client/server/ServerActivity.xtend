package org.labrad.browser.client.server

import com.google.gwt.activity.shared.AbstractActivity
import com.google.gwt.event.shared.EventBus
import com.google.gwt.place.shared.Place
import com.google.gwt.place.shared.PlaceTokenizer
import com.google.gwt.place.shared.Prefix
import com.google.gwt.user.client.rpc.AsyncCallback
import com.google.gwt.user.client.ui.AcceptsOneWidget
import com.google.gwt.user.client.ui.Label
import com.google.inject.assistedinject.Assisted
import com.google.inject.assistedinject.AssistedInject

class ServerPlace extends Place {
  String name

  new(String name) {
    this.name = name
  }

  def String getName() { name }

  @Prefix("server")
  static class Tokenizer implements PlaceTokenizer<ServerPlace> {
    override String getToken(ServerPlace place) {
      place.name
    }

    override ServerPlace getPlace(String token) {
      new ServerPlace(token)
    }
  }
}

class ServerActivity extends AbstractActivity {
  ServerPlace place
  InfoServiceAsync infoService

  @AssistedInject
  new(@Assisted ServerPlace place, InfoServiceAsync infoService) {
    this.place = place
    this.infoService = infoService
  }

  override void start(AcceptsOneWidget container, EventBus eventBus) {
    infoService.getServerInfo(place.name, new AsyncCallback<ServerInfo> {
      override void onFailure(Throwable caught) {
        // TODO: make a generic ErrorView for this case
        container.setWidget(new Label('''error while getting server info: «caught.message»'''))
      }

      override void onSuccess(ServerInfo info) {
        container.setWidget(new ServerView(info))
      }
    })
  }
}
