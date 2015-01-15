package org.labrad.browser.client.grapher;

import com.google.gwt.user.client.rpc.AsyncCallback;

public interface VaultServiceAsync {

  void getListing(String[] path, AsyncCallback<DirectoryListing> callback);

  void getDatasetInfo(String[] path, String dataset,
      AsyncCallback<DatasetInfo> callback);

  void getData(String[] path, String dataset,
      AsyncCallback<double[][]> callback);

  void getDatasetInfo(String[] path, int dataset,
      AsyncCallback<DatasetInfo> callback);

  void getData(String[] path, int dataset,
      AsyncCallback<double[][]> callback);

}
