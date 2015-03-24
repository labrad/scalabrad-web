package org.labrad.browser.client.grapher

import com.google.gwt.user.client.rpc.AsyncCallback
import com.google.gwt.user.client.rpc.RemoteService
import com.google.gwt.user.client.rpc.RemoteServiceRelativePath

/**
 * The client side stub for the RPC service.
 */
@RemoteServiceRelativePath(VaultService.PATH)
interface VaultService extends RemoteService {
  public static String PATH = "vault"

  def DirectoryListing getListing(String[] path) throws VaultError
  def DatasetInfo getDatasetInfo(String[] path, String dataset) throws VaultError
  def DatasetInfo getDatasetInfo(String[] path, int dataset) throws VaultError
  def double[][] getData(String[] path, String dataset) throws VaultError
  def double[][] getData(String[] path, int dataset) throws VaultError
}

interface VaultServiceAsync {
  def void getListing(String[] path, AsyncCallback<DirectoryListing> callback)
  def void getDatasetInfo(String[] path, String dataset, AsyncCallback<DatasetInfo> callback)
  def void getData(String[] path, String dataset, AsyncCallback<double[][]> callback)
  def void getDatasetInfo(String[] path, int dataset, AsyncCallback<DatasetInfo> callback)
  def void getData(String[] path, int dataset, AsyncCallback<double[][]> callback)
}

@SuppressWarnings("serial")
class VaultError extends Exception {
  protected new() {
    super()
  }

  new(String message) {
    super(message)
  }
}
