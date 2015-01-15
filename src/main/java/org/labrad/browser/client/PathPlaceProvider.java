package org.labrad.browser.client;

import java.util.List;

import com.google.gwt.place.shared.Place;

public interface PathPlaceProvider {
  Place getPlace(List<String> path);
}
