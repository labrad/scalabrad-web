package org.labrad.browser.client.grapher;

import java.util.List;

import org.labrad.browser.client.grapher.images.Images;

import com.google.gwt.place.shared.PlaceHistoryMapper;
import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.HorizontalPanel;
import com.google.gwt.user.client.ui.Hyperlink;
import com.google.gwt.user.client.ui.Image;
import com.google.gwt.user.client.ui.Label;

public class DatasetItem extends Composite {
  public DatasetItem(List<String> path, String name, PlaceHistoryMapper mapper, Images images) {
    this(path, name, true, mapper, images);
  }

  public DatasetItem(List<String> path, String name, boolean link, PlaceHistoryMapper mapper, Images images) {
    String numStr = name.split("-")[0];
    int num = Integer.parseInt(numStr);
    HorizontalPanel p = new HorizontalPanel();
    p.add(new Image(images.datasetIcon()));
    if (link) {
      DatasetPlace place = new DatasetPlace(path, num);
      p.add(new Hyperlink(name, mapper.getToken(place)));
    } else {
      p.add(new Label(numStr));
    }
    initWidget(p);
  }
}
