package org.labrad.browser.client

import java.util.List

import com.google.gwt.core.shared.GWT
import com.google.gwt.place.shared.PlaceHistoryMapper
import com.google.gwt.user.client.ui.Composite
import com.google.gwt.user.client.ui.HorizontalPanel
import com.google.gwt.user.client.ui.Hyperlink
import com.google.gwt.user.client.ui.Label

public class BreadcrumbView extends Composite {

  private static val bundle = GWT.create(MiscBundle) as MiscBundle
  private static val css = bundle.css() => [ ensureInjected ]

  new(
    String rootName,
    List<String> path,
    PlaceHistoryMapper historyMapper,
    PathPlaceProvider placeProvider
  ) {
    this(rootName, path, false, historyMapper, placeProvider)
  }

  new(
    String rootName,
    List<String> path,
    boolean linkLast,
    PlaceHistoryMapper historyMapper,
    PathPlaceProvider placeProvider
  ) {
    val container = new HorizontalPanel => [
      width = "100%"
      addStyleName(css.breadcrumbsClass)
    ]

    val breadcrumbs = new HorizontalPanel
    container.add(breadcrumbs)

    if (path.size > 0 || linkLast) {
      val place = placeProvider.getPlace(path.subList(0, 0))
      breadcrumbs.add(new Hyperlink(rootName, historyMapper.getToken(place)))
    } else {
      breadcrumbs.add(new Label(rootName))
    }
    for (var i = 0; i < path.size; i++) {
      breadcrumbs.add(new Label("/"))
      if ((i < path.size - 1) || linkLast) {
        val place = placeProvider.getPlace(path.subList(0, i+1))
        breadcrumbs.add(new Hyperlink(path.get(i), historyMapper.getToken(place)))
      } else {
        breadcrumbs.add(new Label(path.get(i)))
      }
    }

    initWidget(container)
  }
}
