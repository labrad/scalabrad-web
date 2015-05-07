package org.labrad.browser.client.util;

import com.google.gwt.core.client.JavaScriptObject;

public class LogUtil {
  public static native void consoleLog(JavaScriptObject obj) /*-{
    console.log(obj);
  }-*/;
}
