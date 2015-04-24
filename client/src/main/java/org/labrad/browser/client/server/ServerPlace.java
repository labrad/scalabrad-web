package org.labrad.browser.client.server;

import com.google.gwt.place.shared.Place;
import com.google.gwt.place.shared.PlaceTokenizer;
import com.google.gwt.place.shared.Prefix;

public class ServerPlace extends Place {
  private String name;

  public ServerPlace(String name) {
    this.name = name;
  }

  public String getName() {
    return name;
  }

  @Prefix("server")
  public static class Tokenizer implements PlaceTokenizer<ServerPlace> {
    public String getToken(ServerPlace place) {
      return place.getName();
    }

    public ServerPlace getPlace(String token) {
      return new ServerPlace(token);
    }
  }

}
