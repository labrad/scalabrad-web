package org.labrad.browser.client.util;

import java.util.Random;

public class Util {
  private static final Random random = new Random();

  private static final String CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  public static String randomId() {
    char[] chars = new char[32];
    for (int i = 0; i < 32; i++) {
      int index = random.nextInt(CHARS.length());
      chars[i] = CHARS.charAt(index);
    }
    return String.valueOf(chars);
  }
}
