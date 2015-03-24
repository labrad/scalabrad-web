package org.labrad.browser.client

import com.google.gwt.resources.client.ClientBundle
import com.google.gwt.resources.client.ImageResource

interface BrowserImages extends ClientBundle {
  /**
   * Server information
   */
  @Source("images/information.gif")
  def ImageResource serverInfoIcon()

  /**
   * Server information (disabled)
   */
  @Source("images/information_gray.gif")
  def ImageResource serverInfoIconDisabled()

  /**
   * Start a server
   */
  @Source("images/add.gif")
  def ImageResource startServerIcon()

  /**
   * Start a server (disabled)
   */
  @Source("images/add_gray.gif")
  def ImageResource startServerIconDisabled()

  /**
   * Restart a server
   */
  @Source("images/arrow_refresh.gif")
  def ImageResource restartServerIcon()

  /**
   * Restart a server (button disabled)
   */
  @Source("images/arrow_refresh_gray.gif")
  def ImageResource restartServerIconDisabled()

  /**
   * Stop a server
   */
  @Source("images/delete.gif")
  def ImageResource stopServerIcon()

  /**
   * Stop a server (button disabled)
   */
  @Source("images/delete_gray.gif")
  def ImageResource stopServerIconDisabled()

  /**
   * IP address on the white list
   */
  @Source("images/tick.gif")
  def ImageResource ipAllowed()

  /**
   * IP address on the black list
   */
  @Source("images/cross.gif")
  def ImageResource ipDisallowed()

  /**
   * Folder in the registry
   */
  @Source("images/folder.png")
  def ImageResource folder()

  /**
   * Folder add
   */
  @Source("images/folder_add.png")
  def ImageResource folderAdd()

  /**
   * Key in the registry
   */
  @Source("images/key.png")
  def ImageResource key()

  /**
   * Key add
   */
  @Source("images/key_add.png")
  def ImageResource keyAdd()

  @Source("images/resultset_previous.png")
  def ImageResource goBack()

  /**
   * Throbber
   */
  @Source("images/throbber.gif")
  def ImageResource throbber()

  @Source("images/ic_cancel_black_18dp.png")
  def ImageResource cancel()

  @Source("images/ic_content_copy_black_18dp.png")
  def ImageResource copy()

  @Source("images/ic_delete_black_18dp.png")
  def ImageResource delete()

  @Source("images/ic_mode_edit_black_18dp.png")
  def ImageResource edit()

}
