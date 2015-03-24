package org.labrad.browser.client.grapher

import java.util.ArrayList
import java.util.Arrays
import com.google.gwt.event.shared.EventBus
import com.google.gwt.user.client.ui.Composite
import com.google.gwt.user.client.ui.DisclosurePanel
import com.google.gwt.user.client.ui.Grid
import com.google.gwt.user.client.ui.Label
import com.google.gwt.user.client.ui.VerticalPanel
import com.google.inject.assistedinject.Assisted
import com.google.inject.assistedinject.AssistedInject

class DatasetViewImpl extends Composite implements DatasetView {
  Presenter presenter
  DatasetPlace place
  DatasetInfo info
  final VerticalPanel panel = new VerticalPanel
  final VaultServiceAsync service

  @AssistedInject
  new(
    @Assisted DatasetPlace place,
    @Assisted DatasetInfo info,
    @Assisted Presenter presenter,
    @Assisted EventBus eventBus,
    VaultServiceAsync service
  ) {
    initWidget(panel)
    this.place = place
    this.info = info
    this.presenter = presenter
    this.service = service
    handleDatasetInfo(info)
  }

  def void handleDatasetInfo(DatasetInfo info) {
    this.info = info
    val paramPanel = new DisclosurePanel(info.name)
    val contents = new VerticalPanel => [
      add(new Label(Arrays.asList(info.independents).toString))
      add(new Label(Arrays.asList(info.dependents).toString))
    ]
    val params = info.parameters
    val t = new Grid(params.size, 2)
    var int i = 0
    val keyList = new ArrayList<String>(params.keySet)
    val keys = newArrayOfSize(keyList.size)

    for (var int j = 0; j < keyList.size; j++) {
      keys.set(j, keyList.get(j))
    }
    Arrays.sort(keys, String.CASE_INSENSITIVE_ORDER)
    for (String key : keys) {
      t.setText(i, 0, key)
      t.setText(i, 1, params.get(key))
      i++
    }
    contents.add(t)
    paramPanel.add(contents)
    paramPanel.setOpen(true)
    panel.clear()
    panel.add(paramPanel) // service.getData(path, info.getNum(), new AsyncCallback<double[][]>() {
    //
    // @Override
    // public void onFailure(Throwable caught) {
    // final DialogBox msg = new DialogBox();
    // msg.setModal(true);
    // msg.setText("Error occurred while grabbing data:\n\n" + caught.getMessage());
    // Button ok = new Button("OK");
    // ok.addClickHandler(new ClickHandler() {
    // public void onClick(ClickEvent event) {
    // msg.hide();
    // }
    // });
    // msg.setWidget(ok);
    // msg.show();
    // }
    //
    // @Override
    // public void onSuccess(double[][] result) {
    // handleData(result);
    // }
    //
    // });
  }

  def void handleData(double[][] data) {
    if (info.independents.length == 1) {
      // create plot with gflot
      // PlotModel model = new PlotModel();
      // for (int i = 0; i < info.getDependents().size(); i++) {
      // SeriesHandler handler = model.addSeries(info.getDependents().get(i));
      // handler.setOptions(SeriesType.POINTS, (new PointsSeriesOptions()).setRadius(4).setFill(true));
      // for (int j = 0; j < data.length; j++) {
      // handler.add(new DataPoint(data[j][0], data[j][i+1]));
      // }
      // }
      // SimplePlot plot = new SimplePlot(model);
      // plot.setWidth(800);
      // plot.setHeight(600);
      // panel.add(plot);
    } else if (info.independents.length == 2) {
      // draw 2D data
      // GWTCanvas canvas = new GWTCanvas(800, 600);
      // drawData2D(canvas, data);
      // panel.add(canvas);
    }

  }

}
