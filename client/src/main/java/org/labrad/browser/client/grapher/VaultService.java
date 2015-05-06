package org.labrad.browser.client.grapher;

import java.util.List;

import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.Produces;

import org.fusesource.restygwt.client.MethodCallback;
import org.fusesource.restygwt.client.RestService;

public interface VaultService extends RestService {

  public static class NamedDataset {
    public List<String> path;
    public String dataset;

    protected NamedDataset() {}
    public NamedDataset(List<String> path, String dataset) {
      this.path = path;
      this.dataset = dataset;
    }
  }

  public static class NumberedDataset {
    public List<String> path;
    public int dataset;

    protected NumberedDataset() {}
    public NumberedDataset(List<String> path, int dataset) {
      this.path = path;
      this.dataset = dataset;
    }
  }

  @GET @Path("/vault/dir") @Consumes("application/json") @Produces("application/json")
  void getListing(List<String> path, MethodCallback<DirectoryListing> callback);

  @GET @Path("/vault/info/by-name") @Consumes("application/json") @Produces("application/json")
  void getDatasetInfo(NamedDataset request, MethodCallback<DatasetInfo> callback);

  @GET @Path("/vault/data/by-name") @Consumes("application/json") @Produces("application/json")
  void getData(NamedDataset request, MethodCallback<List<List<Double>>> callback);

  @GET @Path("/vault/info/by-number") @Consumes("application/json") @Produces("application/json")
  void getDatasetInfo(NumberedDataset dataset, MethodCallback<DatasetInfo> callback);

  @GET @Path("/vault/data/by-number") @Consumes("application/json") @Produces("application/json")
  void getData(NumberedDataset dataset, MethodCallback<List<List<Double>>> callback);
}
