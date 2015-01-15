package org.labrad.browser.client;

import com.google.gwt.resources.client.ClientBundle;
import com.google.gwt.resources.client.ImageResource;

public interface NodeImages extends ClientBundle {
  /**
   * Server information.
   */
  @Source("org/labrad/browser/images/information.gif")
  public ImageResource serverInfoIcon();

  /**
   * Server information (disabled).
   */
  @Source("org/labrad/browser/images/information_gray.gif")
  public ImageResource serverInfoIconDisabled();

  /**
   * Start a server.
   */
  @Source("org/labrad/browser/images/add.gif")
  public ImageResource startServerIcon();

  /**
   * Start a server (button disabled).
   */
  @Source("org/labrad/browser/images/add_gray.gif")
  public ImageResource startServerIconDisabled();


  /**
   * Restart a server.
   */
  @Source("org/labrad/browser/images/arrow_refresh.gif")
  public ImageResource restartServerIcon();

  /**
   * Restart a server (button disabled).
   */
  @Source("org/labrad/browser/images/arrow_refresh_gray.gif")
  public ImageResource restartServerIconDisabled();


  /**
   * Stop a server.
   */
  @Source("org/labrad/browser/images/delete.gif")
  public ImageResource stopServerIcon();

  /**
   * Stop a server (button disabled).
   */
  @Source("org/labrad/browser/images/delete_gray.gif")
  public ImageResource stopServerIconDisabled();

  /**
   * IP address on the white list
   */
  @Source("org/labrad/browser/images/tick.gif")
  public ImageResource ipAllowed();

  /**
   * IP address on the black list
   */
  @Source("org/labrad/browser/images/cross.gif")
  public ImageResource ipDisallowed();

  /**
   * Folder in the registry
   */
  @Source("org/labrad/browser/images/folder.png")
  public ImageResource folder();

  /**
   * Folder add
   */
  @Source("org/labrad/browser/images/folder_add.png")
  public ImageResource folderAdd();

  /**
   * Key in the registry
   */
  @Source("org/labrad/browser/images/key.png")
  public ImageResource key();

  /**
   * Key add
   */
  @Source("org/labrad/browser/images/key_add.png")
  public ImageResource keyAdd();
}
