package org.labrad.browser.client;

import java.util.List;

import com.google.gwt.core.shared.GWT;
import com.google.gwt.place.shared.Place;
import com.google.gwt.place.shared.PlaceHistoryMapper;
import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.HorizontalPanel;
import com.google.gwt.user.client.ui.Hyperlink;
import com.google.gwt.user.client.ui.Label;

public class BreadcrumbView extends Composite {

  private static MiscBundle bundle = GWT.create(MiscBundle.class);
  private static MiscBundle.Css css = bundle.css();

  static {
    css.ensureInjected();
  }

  public BreadcrumbView(
      String rootName,
      List<String> path,
      PlaceHistoryMapper historyMapper,
      PathPlaceProvider placeProvider) {
    this(rootName, path, false, historyMapper, placeProvider);
  }

  public BreadcrumbView(
      String rootName,
      List<String> path,
      boolean linkLast,
      PlaceHistoryMapper historyMapper,
      PathPlaceProvider placeProvider) {
    HorizontalPanel container = new HorizontalPanel();
    container.setWidth("100%");
    container.addStyleName(css.breadcrumbsClass());

    HorizontalPanel breadcrumbs = new HorizontalPanel();
    container.add(breadcrumbs);

    if (path.size() > 0 || linkLast) {
      Place place = placeProvider.getPlace(path.subList(0, 0));
      breadcrumbs.add(new Hyperlink(rootName, historyMapper.getToken(place)));
    } else {
      breadcrumbs.add(new Label(rootName));
    }
    for (int i = 0; i < path.size(); i++) {
      breadcrumbs.add(new Separator());
      if ((i < path.size() - 1) || linkLast) {
        Place place = placeProvider.getPlace(path.subList(0, i+1));
        breadcrumbs.add(new Hyperlink(path.get(i), historyMapper.getToken(place)));
      } else {
        breadcrumbs.add(new Label(path.get(i)));
      }
    }

    initWidget(container);
  }

  private class Separator extends Label {
    public Separator() {
      super("/");
    }
  }
}
