package org.labrad.browser.client.grapher;

@SuppressWarnings("serial")
public class VaultException extends Exception {
  protected VaultException() {
    super();
  }

  public VaultException(String message) {
    super(message);
  }
}
