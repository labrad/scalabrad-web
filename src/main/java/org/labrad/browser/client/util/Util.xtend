package org.labrad.browser.client.util

import java.util.Random

class Util {
  static val random = new Random
  static val CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"

  def static String randomId() {
    var char[] chars = newCharArrayOfSize(32)

    for (var int i = 0; i < 32; i++) {
      var int index = random.nextInt(CHARS.length)
      chars.set(i, CHARS.charAt(index))
    }
    String.valueOf(chars)
  }
}
