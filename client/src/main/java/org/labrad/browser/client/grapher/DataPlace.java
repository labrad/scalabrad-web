package org.labrad.browser.client.grapher;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

import com.google.gwt.place.shared.Place;
import com.google.gwt.place.shared.PlaceTokenizer;
import com.google.gwt.place.shared.Prefix;

public class DataPlace extends Place {
  private List<String> path;

  public DataPlace() {
    this(new ArrayList<String>());
  }

  public DataPlace(List<String> path) {
    this.path = path;
  }

  public List<String> getPath() {
    return path;
  }

  @Prefix("data")
  public static class Tokenizer implements PlaceTokenizer<DataPlace> {
    /*
     * /dir/ -> directory
     * /dir/001 -> dataset
     *
     */
    public String getToken(DataPlace place) {
      StringBuilder sb = new StringBuilder("/");
      for (String dir : place.getPath()) {
        if (dir.equals("") || dir.equals(".") || dir.equals("..")) continue;
        sb.append(dir).append("/");
      }
      if (place instanceof DatasetPlace) {
        DatasetPlace dp = (DatasetPlace) place;
        sb.append(Integer.toString(dp.getNum()));
      }
      return sb.toString();
    }

    public DataPlace getPlace(String token) {
      if ("".equals(token) || "/".equals(token)) return new DataPlace();
      if (token.startsWith("/")) token = token.substring(1);
      List<String> segments = Arrays.asList(token.split("/"));
      if (token.endsWith("/") || segments.isEmpty()) {
        return new DataPlace(segments);
      } else {
        // can't use subList here because sublists are not serializable...
        List<String> path = new ArrayList<String>(segments);
        path.remove(path.size()-1);
        try {
          int num = Integer.parseInt(segments.get(segments.size()-1));
          return new DatasetPlace(path, num);
        } catch (Exception e) {
          return new DataPlace();
        }
      }
    }
  }
}
