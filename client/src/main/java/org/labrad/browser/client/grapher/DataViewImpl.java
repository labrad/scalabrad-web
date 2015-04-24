package org.labrad.browser.client.grapher;

import java.util.ArrayList;
import java.util.List;

import org.labrad.browser.client.BreadcrumbView;
import org.labrad.browser.client.PathPlaceProvider;
import org.labrad.browser.client.grapher.images.Images;

import com.google.gwt.event.shared.EventBus;
import com.google.gwt.place.shared.Place;
import com.google.gwt.place.shared.PlaceHistoryMapper;
import com.google.gwt.user.client.ui.Composite;
import com.google.gwt.user.client.ui.VerticalPanel;
import com.google.inject.assistedinject.Assisted;
import com.google.inject.assistedinject.AssistedInject;

public class DataViewImpl extends Composite implements DataView {
  private final PlaceHistoryMapper historyMapper;
  private final Images images;

  private final Presenter presenter;
  private final DirectoryListing listing;
  private final List<String> path;

  @AssistedInject
  public DataViewImpl(
      @Assisted List<String> path,
      @Assisted DirectoryListing listing,
      @Assisted Presenter presenter,
      @Assisted EventBus eventBus,
      PlaceHistoryMapper historyMapper,
      Images images) {
    this.path = path;
    this.listing = listing;
    this.presenter = presenter;
    this.historyMapper = historyMapper;
    this.images = images;


    BreadcrumbView breadcrumbs = new BreadcrumbView("DataVault", path, historyMapper, new PathPlaceProvider() {
      public Place getPlace(List<String> path) {
        return new DataPlace(path);
      }
    });

    VerticalPanel directoriesPanel = new VerticalPanel();
    if (path.size() >= 2 || (path.size() == 1 && !path.get(0).isEmpty())) {
      // add a link to go up to the parent directory
      directoriesPanel.add(new ParentItem(path, historyMapper, images));
    }
    for (String dir : listing.getDirs()) {
      List<String> subdirPath = new ArrayList<String>(path);
      subdirPath.add(dir);
      directoriesPanel.add(new DirectoryItem(subdirPath, dir, historyMapper, images));
    }

    VerticalPanel datasetsPanel = new VerticalPanel();
    for (String dataset : listing.getDatasets()) {
      datasetsPanel.add(new DatasetItem(path, dataset, historyMapper, images));
    }

    VerticalPanel container = new VerticalPanel();
    container.add(breadcrumbs);
    container.add(directoriesPanel);
    container.add(datasetsPanel);
    initWidget(container);
  }
}
