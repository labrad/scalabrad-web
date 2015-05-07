package org.labrad.browser.client.registry

import java.util.ArrayList
import java.util.Arrays
import java.util.List
import com.google.gwt.place.shared.Place
import com.google.gwt.place.shared.PlaceTokenizer
import com.google.gwt.place.shared.Prefix

class RegistryPlace extends Place {
  List<String> path

  new(){
    this(#[])
  }

  new(List<String> path){
    this.path = path
  }

  def List<String> getPath() { path }

  def String getPathString() {
    new Tokenizer().getToken(this).replace("registry:", "")
  }

  def RegistryPlace getParent() {
    if (path.isEmpty) {
      this
    } else {
      val parentPath = new ArrayList<String>(path)
      parentPath.remove(parentPath.size - 1)
      new RegistryPlace(parentPath)
    }
  }

  def RegistryPlace subDir(String dir) {
    val subPath = new ArrayList<String>(path)
    subPath.add(dir)
    new RegistryPlace(subPath)
  }

  @Prefix("registry")
  public static class Tokenizer implements PlaceTokenizer<RegistryPlace> {
    override String getToken(RegistryPlace place) {
      val sb = new StringBuilder("/")
      for (String dir : place.path) {
        var escaped = dir.replace("&", "&amp;").replace("%", "&pct;").replace("/", "&fs;")
        if (escaped != "" && escaped != "." && escaped != "..") {
          sb.append(dir).append("/")
        }
      }
      sb.toString
    }
    override RegistryPlace getPlace(String token) {
      if (token == "" || token == "/") return new RegistryPlace

      var stripped = token
      if (stripped.startsWith("/")) stripped = stripped.substring(1)
      if (stripped.endsWith("/")) stripped = stripped.substring(0, stripped.length - 1)
      val tokens = stripped.split("/")

      for (var int i = 0 ; i < tokens.length; i++) {
        val tok = tokens.get(i).replace("&fs;", "/").replace("&pct;", "%").replace("&amp;", "&")
        tokens.set(i, tok)
      }
      new RegistryPlace(Arrays.asList(tokens))
    }
  }
}
