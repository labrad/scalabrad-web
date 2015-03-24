package org.labrad.browser.client.grapher

import java.util.ArrayList
import java.util.Arrays
import java.util.List
import com.google.gwt.activity.shared.AbstractActivity
import com.google.gwt.event.shared.EventBus
import com.google.gwt.place.shared.Place
import com.google.gwt.place.shared.PlaceController
import com.google.gwt.place.shared.PlaceTokenizer
import com.google.gwt.place.shared.Prefix
import com.google.gwt.user.client.rpc.AsyncCallback
import com.google.gwt.user.client.ui.AcceptsOneWidget
import com.google.inject.assistedinject.Assisted
import com.google.inject.assistedinject.AssistedInject
import com.google.gwt.user.client.ui.IsWidget
import org.labrad.browser.client.ViewFactory
import org.labrad.browser.client.connections.ErrorView

class DataPlace extends Place {
  protected List<String> path

  new() {
    this(new ArrayList<String>)
  }

  new(List<String> path) {
    this.path = path
  }

  def List<String> getPath() { path }

  @Prefix("data")
  static class Tokenizer implements PlaceTokenizer<DataPlace> {
    /*
     * /dir/ -> directory
     * /dir/001 -> dataset
     *
     */
    override String getToken(DataPlace place) {
      val sb = new StringBuilder("/")
      for (dir : place.path) {
        if (dir != "" && dir != "." && dir != "..") {
          sb.append(dir).append("/")
        }
      }

      if (place instanceof DatasetPlace) {
        sb.append(Integer::toString(place.num))
      }
      sb.toString
    }

    override DataPlace getPlace(String token) {
      if (token == "" || token == "/") return new DataPlace

      val stripped = if (token.startsWith("/")) token.substring(1) else token
      val segments = Arrays::asList(stripped.split("/"))

      if (stripped.endsWith("/") || segments.isEmpty) {
        new DataPlace(segments)
      } else {
        // can't use subList here because sublists are not serializable...
        val path = new ArrayList<String>(segments)
        val numStr = path.remove(path.size - 1)
        try {
          val num = Integer::parseInt(numStr)
          new DatasetPlace(path, num)
        } catch (Exception e) {
          new DataPlace()
        }
      }
    }
  }
}

/**
 * A subclass of DataPlace that refers to a specific dataset,
 * rather than a directory.
 */
class DatasetPlace extends DataPlace {
  private int num

  new(List<String> path, int num) {
    this.path = path
    this.num = num
  }

  new(List<String> path, String dataset) {
    this(path, Integer.parseInt(dataset))
  }

  def int getNum() { num }
}


interface DataView extends IsWidget {
  interface Presenter {
    def void goTo(Place place)
  }
}

class DataActivity extends AbstractActivity implements DataView.Presenter {
  final DataPlace place
  final ViewFactory viewFactory
  final VaultServiceAsync service
  final PlaceController placeController

  @AssistedInject
  new(
    @Assisted DataPlace place,
    VaultServiceAsync service,
    ViewFactory viewFactory,
    PlaceController placeController
  ) {
    this.place = place
    this.service = service
    this.viewFactory = viewFactory
    this.placeController = placeController
  }

  override void start(AcceptsOneWidget panel, EventBus eventBus) {
    service.getListing(place.path.toArray(#[]), new AsyncCallback<DirectoryListing>() {
      override void onFailure(Throwable caught) {
        panel.setWidget(new ErrorView(caught))
      }

      override void onSuccess(DirectoryListing listing) {
        panel.setWidget(viewFactory.createDataView(place, listing, DataActivity.this, eventBus))
      }
    })
  }

  override void goTo(Place place) {
    placeController.goTo(place)
  }
}

interface DatasetView extends IsWidget {
  interface Presenter {
    def void goTo(Place place)
  }
}

class DatasetActivity extends AbstractActivity implements DatasetView.Presenter {
  final DatasetPlace place
  final ViewFactory viewFactory
  final PlaceController placeController
  final VaultServiceAsync vaultService

  @AssistedInject
  new(
    @Assisted DatasetPlace place,
    ViewFactory viewFactory,
    PlaceController placeController,
    VaultServiceAsync vaultService
  ) {
    this.place = place
    this.viewFactory = viewFactory
    this.placeController = placeController
    this.vaultService = vaultService
  }

  override void start(AcceptsOneWidget panel, EventBus eventBus) {
    vaultService.getDatasetInfo(place.path.toArray(#[]), place.num, new AsyncCallback<DatasetInfo> {
      override void onFailure(Throwable caught) {
        panel.setWidget(new ErrorView(caught))
      }

      override void onSuccess(DatasetInfo info) {
        panel.setWidget(viewFactory.createDatasetView(place, info, DatasetActivity.this, eventBus))
      }
    })
  }

  override void goTo(Place place) {
    placeController.goTo(place)
  }
}
