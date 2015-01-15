package org.labrad.browser.client.grapher;

import java.util.List;

import org.labrad.browser.client.grapher.images.Images;

import com.google.gwt.place.shared.PlaceHistoryMapper;
import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.HorizontalPanel;
import com.google.gwt.user.client.ui.Hyperlink;
import com.google.gwt.user.client.ui.Image;

public class ParentItem extends Composite {
  public ParentItem(List<String> path, PlaceHistoryMapper mapper, Images images) {
    this(path, "..", mapper, images);
  }

  public ParentItem(List<String> path, String dir, PlaceHistoryMapper mapper, Images images) {
    path = path.subList(0, path.size()-1);
    DataPlace place = new DataPlace(path);
    HorizontalPanel p = new HorizontalPanel();
    p.add(new Image(images.goBack()));
    p.add(new Hyperlink(dir, mapper.getToken(place)));
    initWidget(p);
  }
}
