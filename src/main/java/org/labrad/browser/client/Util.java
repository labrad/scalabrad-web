package org.labrad.browser.client;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class Util {
  public static <T> List<T> newArrayList() {
    return new ArrayList<T>();
  }

  public static <T> List<T> newArrayList(List<T> list) {
    return new ArrayList<T>(list);
  }

  public static <K, V> Map<K, V> newHashMap() {
    return new HashMap<K, V>();
  }
}
