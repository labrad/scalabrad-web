package org.labrad.browser.client.server;

import java.util.List;

import com.google.gwt.user.client.rpc.IsSerializable;

public class SettingInfo implements IsSerializable {
  private long id;
  private String name;
  private String doc;
  private List<String> acceptedTypes;
  private List<String> returnedTypes;

  protected SettingInfo() {}

  public SettingInfo(long id, String name, String doc, List<String> acceptedTypes, List<String> returnedTypes) {
    this.id = id;
    this.name = name;
    this.doc = doc;
    this.acceptedTypes = acceptedTypes;
    this.returnedTypes = returnedTypes;
  }

  public long getId() { return id; }
  public void setId(long id) { this.id = id; }

  public String getName() { return name; }
  public void setName(String name) { this.name = name; }

  public String getDoc() { return doc; }
  public void setDoc(String doc) { this.doc = doc; }

  public List<String> getAcceptedTypes() { return acceptedTypes; }
  public void setAcceptedTypes(List<String> ts) { this.acceptedTypes = ts; }

  public List<String> getReturnedTypes() { return returnedTypes; }
  public void setReturnedTypes(List<String> ts) { this.returnedTypes = ts; }
}
