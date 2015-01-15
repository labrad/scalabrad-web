package org.labrad.browser.client.grapher;

import com.google.gwt.user.client.rpc.RemoteService;
import com.google.gwt.user.client.rpc.RemoteServiceRelativePath;

/**
 * The client side stub for the RPC service.
 */
@RemoteServiceRelativePath(VaultService.PATH)
public interface VaultService extends RemoteService {
  public static String PATH = "vault";
  DirectoryListing getListing(String[] path) throws VaultException;
  DatasetInfo getDatasetInfo(String[] path, String dataset) throws VaultException;
  DatasetInfo getDatasetInfo(String[] path, int dataset) throws VaultException;
  double[][] getData(String[] path, String dataset) throws VaultException;
  double[][] getData(String[] path, int dataset) throws VaultException;
}
