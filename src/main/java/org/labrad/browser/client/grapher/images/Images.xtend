package org.labrad.browser.client.grapher.images

import com.google.gwt.resources.client.ClientBundle
import com.google.gwt.resources.client.ImageResource

interface Images extends ClientBundle {
  /**
   * Server information.
   */
  @Source("dataset.png") def ImageResource datasetIcon()

  /**
   * Server information (disabled).
   */
  @Source("dir.png") def ImageResource directoryIcon()

  @Source("resultset_previous.png") def ImageResource goBack()
}
