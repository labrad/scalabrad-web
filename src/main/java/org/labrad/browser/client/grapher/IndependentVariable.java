package org.labrad.browser.client.grapher;

import java.io.Serializable;

@SuppressWarnings("serial")
public class IndependentVariable implements Serializable {
  private String name;
  private String label;
  private String units;

  protected IndependentVariable() {}

  public IndependentVariable(String name, String label, String units) {
    this.name = name;
    this.label = label;
    this.units = units;
  }

  public String getName() { return this.name; }
  public String getLabel() { return this.label; }
  public String getUnits() { return this.units; }
}
