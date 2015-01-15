package org.labrad.browser.client.server;

import com.google.gwt.user.client.rpc.IsSerializable;

public class SettingInfo implements IsSerializable {
  private long id;
  private String name;
  private String doc;
  private String[] acceptedTypes;
  private String[] returnedTypes;

  protected SettingInfo() {}

  public SettingInfo(long id, String name, String doc, String[] acceptedTypes, String[] returnedTypes) {
    this.id = id;
    this.name = name;
    this.doc = doc;
    this.acceptedTypes = acceptedTypes;
    this.returnedTypes = returnedTypes;
  }

  public long getId() {
    return id;
  }

  public String getName() {
    return name;
  }

  public String getDoc() {
    return doc;
  }

  public String[] getAcceptedTypes() {
    return acceptedTypes;
  }

  public String[] getReturnedTypes() {
    return returnedTypes;
  }
}
