package org.labrad.browser.client.grapher.images;

import com.google.gwt.resources.client.ClientBundle;
import com.google.gwt.resources.client.ImageResource;

public interface Images extends ClientBundle {
  /**
   * Server information.
   */
  @Source("dataset.png")
  public ImageResource datasetIcon();

  /**
   * Server information (disabled).
   */
  @Source("dir.png")
  public ImageResource directoryIcon();

  @Source("resultset_previous.png")
  public ImageResource goBack();
}
