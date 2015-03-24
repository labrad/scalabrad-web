package org.labrad.browser.client.util;

import com.google.gwt.dom.client.DataTransfer;

public class DataTransferUtil {
  public static native void setEffectAllowed(DataTransfer dt, String effectAllowed) /*-{
    dt.effectAllowed = effectAllowed;
  }-*/;

  public static native String getEffectAllowed(DataTransfer dt) /*-{
    return dt.effectAllowed;
  }-*/;
}
