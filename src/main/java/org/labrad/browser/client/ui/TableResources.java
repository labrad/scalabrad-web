package org.labrad.browser.client.ui;

import com.google.gwt.user.cellview.client.CellTable;

public interface TableResources extends CellTable.Resources {
  @Source({CellTable.Style.DEFAULT_CSS, "TableStyle.css"})
  TableStyle cellTableStyle();

  public interface TableStyle extends CellTable.Style {
  }
}
