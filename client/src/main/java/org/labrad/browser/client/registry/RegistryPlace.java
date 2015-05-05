package org.labrad.browser.client.registry;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import com.google.gwt.place.shared.Place;
import com.google.gwt.place.shared.PlaceTokenizer;
import com.google.gwt.place.shared.Prefix;

public class RegistryPlace extends Place {
  private List<String> path;

  public RegistryPlace() {
    this(new ArrayList<String>());
  }

  public RegistryPlace(List<String> path) {
    this.path = path;
  }

  public List<String> getPath() {
    return path;
  }

  public String getPathString() {
    return new Tokenizer().getToken(this).replace("registry:", "");
  }

  public RegistryPlace subDir(String dir) {
    List<String> subPath = new ArrayList<String>(path);
    subPath.add(dir);
    return new RegistryPlace(subPath);
  }

  @Prefix("registry")
  public static class Tokenizer implements PlaceTokenizer<RegistryPlace> {
    public String getToken(RegistryPlace place) {
      StringBuilder sb = new StringBuilder("/");
      for (String dir : place.getPath()) {
        dir = dir.replace("&", "&amp;");
        dir = dir.replace("%", "&pct;");
        dir = dir.replace("/", "&fs;");
        if (dir.equals("") || dir.equals(".") || dir.equals("..")) continue;
        sb.append(dir).append("/");
      }
      return sb.toString();
    }

    public RegistryPlace getPlace(String token) {
      if ("".equals(token) || "/".equals(token)) return new RegistryPlace();
      if (token.startsWith("/")) token = token.substring(1);
      if (token.endsWith("/")) token = token.substring(0, token.length() - 1);
      String[] tokens = token.split("/");
      for (int i = 0; i < tokens.length; i++) {
        tokens[i] = tokens[i].replace("&fs;", "/");
        tokens[i] = tokens[i].replace("&pct;", "%");
        tokens[i] = tokens[i].replace("&amp;", "&");
      }
      return new RegistryPlace(Arrays.asList(tokens));
    }
  }
}
