package org.labrad.browser.client;

import com.google.gwt.resources.client.ClientBundle;
import com.google.gwt.resources.client.ImageResource;

public interface BrowserImages extends ClientBundle {
  /** Server information */
  @Source("images/information.gif")
  public ImageResource serverInfoIcon();

  /** Server information (disabled) */
  @Source("images/information_gray.gif")
  public ImageResource serverInfoIconDisabled();

  /** Start a server */
  @Source("images/add.gif")
  public ImageResource startServerIcon();

  /** Start a server (disabled) */
  @Source("images/add_gray.gif")
  public ImageResource startServerIconDisabled();


  /** Restart a server */
  @Source("images/arrow_refresh.gif")
  public ImageResource restartServerIcon();

  /** Restart a server (button disabled) */
  @Source("images/arrow_refresh_gray.gif")
  public ImageResource restartServerIconDisabled();


  /** Stop a server */
  @Source("images/delete.gif")
  public ImageResource stopServerIcon();

  /** Stop a server (button disabled) */
  @Source("images/delete_gray.gif")
  public ImageResource stopServerIconDisabled();

  /** IP address on the white list */
  @Source("images/tick.gif")
  public ImageResource ipAllowed();

  /** IP address on the black list */
  @Source("images/cross.gif")
  public ImageResource ipDisallowed();

  /** Folder in the registry */
  @Source("images/folder.png")
  public ImageResource folder();

  /** Folder add */
  @Source("images/folder_add.png")
  public ImageResource folderAdd();

  /** Key in the registry */
  @Source("images/key.png")
  public ImageResource key();

  /** Key add */
  @Source("images/key_add.png")
  public ImageResource keyAdd();

  @Source("images/resultset_previous.png")
  public ImageResource goBack();

  /** Throbber */
  @Source("images/throbber.gif")
  public ImageResource throbber();


  @Source("images/ic_cancel_black_18dp.png")
  public ImageResource cancel();

  @Source("images/ic_content_copy_black_18dp.png")
  public ImageResource copy();

  @Source("images/ic_delete_black_18dp.png")
  public ImageResource delete();

  @Source("images/ic_mode_edit_black_18dp.png")
  public ImageResource edit();
}
