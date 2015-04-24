package org.labrad.browser.client.grapher;

import java.util.List;

import org.labrad.browser.client.grapher.images.Images;

import com.google.gwt.place.shared.PlaceHistoryMapper;
import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.HorizontalPanel;
import com.google.gwt.user.client.ui.Hyperlink;
import com.google.gwt.user.client.ui.Image;
import com.google.gwt.user.client.ui.Label;

public class DirectoryItem extends Composite {
  public DirectoryItem(List<String> path, String dir, PlaceHistoryMapper mapper, Images images) {
    this(path, dir, true, mapper, images);
  }

  public DirectoryItem(List<String> path, String dir, boolean link, PlaceHistoryMapper mapper, Images images) {
    HorizontalPanel p = new HorizontalPanel();
    p.add(new Image(images.directoryIcon()));
    if (link) {
      DataPlace place = new DataPlace(path);
      p.add(new Hyperlink(dir, mapper.getToken(place)));
    } else {
      p.add(new Label(dir));
    }
    initWidget(p);
  }
}
