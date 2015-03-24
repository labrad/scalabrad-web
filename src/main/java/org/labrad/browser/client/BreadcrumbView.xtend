package org.labrad.browser.client

import java.util.List
import com.google.gwt.place.shared.Place
import com.google.gwt.place.shared.PlaceHistoryMapper
import com.google.gwt.user.client.ui.Composite
import com.google.gwt.user.client.ui.HorizontalPanel
import com.google.gwt.user.client.ui.Hyperlink
import com.google.gwt.user.client.ui.Label

class BreadcrumbView extends Composite {
  new(
    String rootName,
    List<String> path,
    PlaceHistoryMapper historyMapper,
    (List<String>)=>Place placeFunc
  ) {
    this(rootName, path, false, historyMapper, placeFunc)
  }

  new(
    String rootName,
    List<String> path,
    boolean linkLast,
    PlaceHistoryMapper historyMapper,
    (List<String>)=>Place placeFunc
  ) {
    val container = new HorizontalPanel => [
      setWidth("100%")
      addStyleName("breadcrumbs")
      val breadcrumbs = new HorizontalPanel => [
        add(if (path.size > 0 || linkLast) {
          val place = placeFunc.apply(#[])
          new Hyperlink(rootName, historyMapper.getToken(place))
        } else {
          new Label(rootName)
        })
        for (var i = 0; i < path.size; i++) {
          add(new Label("/") => [addStyleDependentName("separator")])
          add(if ((i < path.size - 1) || linkLast) {
            val place = placeFunc.apply(path.subList(0, i + 1))
            new Hyperlink(path.get(i), historyMapper.getToken(place))
          } else {
            new Label(path.get(i))
          })
        }
      ]
      add(breadcrumbs)
    ]
    initWidget(container)
  }
}
