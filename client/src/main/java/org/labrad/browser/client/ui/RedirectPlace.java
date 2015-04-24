package org.labrad.browser.client.ui;

import com.google.gwt.place.shared.Place;
import com.google.gwt.place.shared.PlaceTokenizer;
import com.google.gwt.place.shared.Prefix;

public class RedirectPlace extends Place {
  private final String token;

  public RedirectPlace(String token) {
    this.token = token;
  }

  public String getToken() {
    return token;
  }

  @Prefix("redirect")
  public static class Tokenizer implements PlaceTokenizer<RedirectPlace> {
    public String getToken(RedirectPlace place) {
      return place.getToken();
    }

    public RedirectPlace getPlace(String token) {
      return new RedirectPlace(token);
    }
  }
}
