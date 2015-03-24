package org.labrad.browser.client.grapher

import java.util.ArrayList
import java.util.List
import org.labrad.browser.client.BreadcrumbView
import org.labrad.browser.client.grapher.images.Images
import com.google.gwt.event.shared.EventBus
import com.google.gwt.place.shared.PlaceHistoryMapper
import com.google.gwt.user.client.ui.Composite
import com.google.gwt.user.client.ui.VerticalPanel
import com.google.inject.assistedinject.Assisted
import com.google.inject.assistedinject.AssistedInject
import com.google.gwt.user.client.ui.HorizontalPanel
import com.google.gwt.user.client.ui.Image
import com.google.gwt.user.client.ui.Hyperlink
import com.google.gwt.user.client.ui.Label
import java.util.logging.Logger

class DataViewImpl extends Composite implements DataView {
  final PlaceHistoryMapper historyMapper
  final Images images

  @AssistedInject
  new(
    @Assisted DataPlace place,
    @Assisted DirectoryListing listing,
    @Assisted Presenter presenter,
    @Assisted EventBus eventBus,
    PlaceHistoryMapper historyMapper,
    Images images
  ) {
    this.historyMapper = historyMapper
    this.images = images
    val path = place.path
    val breadcrumbs = new BreadcrumbView("DataVault", path, historyMapper) [new DataPlace(it)]
    val directoriesPanel = new VerticalPanel
    if (path.size >= 2 || (path.size == 1 && !path.get(0).isEmpty)) {
      // add a link to go up to the parent directory
      directoriesPanel.add(new ParentItem(path, historyMapper, images))
    }
    for (dir : listing.dirs) {
      val subdirPath = new ArrayList<String>(path) => [add(dir)]
      directoriesPanel.add(new DirectoryItem(subdirPath, dir, historyMapper, images))
    }
    val datasetsPanel = new VerticalPanel
    for (dataset : listing.datasets) {
      val dsPath = new ArrayList<String>(path)
      datasetsPanel.add(new DatasetItem(dsPath, dataset, historyMapper, images))
    }
    val container = new VerticalPanel => [
      add(breadcrumbs)
      add(directoriesPanel)
      add(datasetsPanel)
    ]
    initWidget(container)
  }
}

class ParentItem extends Composite {
  new(List<String> path, PlaceHistoryMapper mapper, Images images) {
    this(path, "..", mapper, images)
  }

  new(List<String> path, String dir, PlaceHistoryMapper mapper, Images images) {
    val parent = path.subList(0, path.size - 1)
    val place = new DataPlace(parent)
    val p = new HorizontalPanel => [
      add(new Image(images.goBack))
      add(new Hyperlink(dir, mapper.getToken(place)))
    ]
    initWidget(p)
  }
}

class DirectoryItem extends Composite {
  new(List<String> path, String dir, PlaceHistoryMapper mapper, Images images) {
    this(path, dir, true, mapper, images)
  }

  new(List<String> path, String dir, boolean link, PlaceHistoryMapper mapper, Images images) {
    val p = new HorizontalPanel => [
      add(new Image(images.directoryIcon))
      if (link) {
        val place = new DataPlace(path)
        add(new Hyperlink(dir, mapper.getToken(place)))
      } else {
        add(new Label(dir))
      }
    ]
    initWidget(p)
  }
}

class DatasetItem extends Composite {
  static val log = Logger.getLogger("DatasetItem")

  new(List<String> path, String name, PlaceHistoryMapper mapper, Images images) {
    this(path, name, true, mapper, images)
  }

  new(List<String> path, String name, boolean link, PlaceHistoryMapper mapper, Images images) {
    var numStrSp = name.split("-").get(0)
    while (numStrSp.endsWith(" ")) {
      numStrSp = numStrSp.substring(0, numStrSp.length - 1)
    }
    val numStr = numStrSp
    for (segment : path) {
      log.info("segment: " + segment)
    }
    log.info("numStr: " + numStr)
    val num = Integer.parseInt(numStr)
    val p = new HorizontalPanel => [
      add(new Image(images.datasetIcon))
      if (link) {
        val place = new DatasetPlace(path, num)
        add(new Hyperlink(name, mapper.getToken(place)))
      } else {
        add(new Label(numStr))
      }
    ]
    initWidget(p)
  }
}
