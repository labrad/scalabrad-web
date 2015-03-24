package org.labrad.browser.client.ui

import com.google.gwt.user.cellview.client.CellTable

/**
 * Custom css styles for cell tables, which extend and override
 * the builtin styles.
 */
interface TableResources extends CellTable.Resources {
  interface TableStyle extends CellTable.Style {}

  @Source(#[CellTable.Style.DEFAULT_CSS, "TableStyle.css"])
  override TableStyle cellTableStyle()
}
