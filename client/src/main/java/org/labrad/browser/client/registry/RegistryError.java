package org.labrad.browser.client.registry;

@SuppressWarnings("serial")
public class RegistryError extends Exception {
  protected RegistryError() {}

  public RegistryError(String message) {
    super(message);
  }
}
