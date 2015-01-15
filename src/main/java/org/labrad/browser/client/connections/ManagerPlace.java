package org.labrad.browser.client.connections;

import com.google.gwt.place.shared.Place;
import com.google.gwt.place.shared.PlaceTokenizer;
import com.google.gwt.place.shared.Prefix;

public class ManagerPlace extends Place {
  public ManagerPlace() {
  }

  @Prefix("info")
  public static class Tokenizer implements PlaceTokenizer<ManagerPlace> {
    public String getToken(ManagerPlace place) {
      return "";
    }

    public ManagerPlace getPlace(String token) {
      return new ManagerPlace();
    }
  }
}
