package org.labrad
package tray

import scala.swing.Action

import javax.swing.{JDialog, JPopupMenu}
import javax.swing.event.{PopupMenuListener, PopupMenuEvent}
import java.awt.{Frame, Image}
import java.awt.event.{ActionListener, ActionEvent, MouseAdapter, MouseEvent, MouseListener}

object TrayIcon {
  val dialog = new JDialog(null: Frame)
  dialog.setUndecorated(true)
  dialog.setAlwaysOnTop(true)

  import java.awt.TrayIcon.MessageType
  val INFO = MessageType.INFO
  val ERROR = MessageType.ERROR
  val WARNING = MessageType.WARNING
  val NONE = MessageType.NONE
}

class TrayIcon(image: Image) extends java.awt.TrayIcon(image) {
  import TrayIcon.dialog

  @transient private val _popupListener = new TrayPopupListener
  @transient private val _mouseListener = new TrayMouseAdapter

  @transient private var _menu: JPopupMenu = _
  def menu = _menu
  def menu_=(newMenu: JPopupMenu) {
    if (_menu != null) {
      _menu.removePopupMenuListener(_popupListener)
      removeMouseListener(_mouseListener)
    }
    if (newMenu != null) {
      _menu = newMenu
      _menu.addPopupMenuListener(_popupListener)
      addMouseListener(_mouseListener)
    }
  }
  def menu_=(newMenu: PopupMenu) {
    menu_=(newMenu.peer)
  }

  def action: Action = null
  def action_=(action: Action) {
    addActionListener(new ActionListener {
      def actionPerformed(e: ActionEvent) {
        action()
      }
    })
  }

  private class TrayMouseAdapter extends MouseAdapter {
    private def showJPopupMenu(evt: MouseEvent) {
      if (evt.isPopupTrigger && menu != null) {
        dialog.setLocation(evt.getX, evt.getY - menu.getPreferredSize.height)
        dialog.setVisible(true)
        menu.show(dialog.getContentPane, 0, 0)
        // popup works only for focused windows
        dialog.toFront
      }
    }

    override def mousePressed(evt: MouseEvent) {
      showJPopupMenu(evt)
    }

    override def mouseReleased(evt: MouseEvent) {
      showJPopupMenu(evt)
    }

    override def mouseClicked(evt: MouseEvent) {
      showJPopupMenu(evt);
    }
  }

  private class TrayPopupListener extends PopupMenuListener {
    override def popupMenuWillBecomeVisible(evt: PopupMenuEvent) {
      // not used
    }

    override def popupMenuWillBecomeInvisible(evt: PopupMenuEvent) {
      dialog.setVisible(false)
    }

    override def popupMenuCanceled(evt: PopupMenuEvent) {
      dialog.setVisible(false)
    }
  }
}