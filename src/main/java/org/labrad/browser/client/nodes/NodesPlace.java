package org.labrad.browser.client.nodes;

import com.google.gwt.place.shared.Place;
import com.google.gwt.place.shared.PlaceTokenizer;
import com.google.gwt.place.shared.Prefix;

public class NodesPlace extends Place {
  public NodesPlace() {
  }

  @Prefix("nodes")
  public static class Tokenizer implements PlaceTokenizer<NodesPlace> {
    public String getToken(NodesPlace place) {
      return "";
    }

    public NodesPlace getPlace(String token) {
      return new NodesPlace();
    }
  }
}
