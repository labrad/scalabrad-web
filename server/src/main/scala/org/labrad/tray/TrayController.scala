package org.labrad.tray

import java.awt.{Desktop, Image, MenuItem, PopupMenu, SystemTray, Toolkit, TrayIcon}
import java.awt.event.{ActionEvent, ActionListener}
import java.net.URI
import org.labrad.util.Logging
import scala.concurrent.Future


class TrayController extends Logging {

  // create popup menu
  private val browseItem = new MenuItem("Manage")
  browseItem.addActionListener(new ActionListener {
    def actionPerformed(e: ActionEvent): Unit = {
      browse()
    }
  })

  private val exitItem = new MenuItem("Exit")
  exitItem.addActionListener(new ActionListener {
    def actionPerformed(e: ActionEvent): Unit = {
      sys.exit(0)
    }
  })

  private val popup = new PopupMenu
  popup.add(browseItem)
  popup.addSeparator()
  popup.add(exitItem)

  // create tray icon
  private val trayIcon = new TrayIcon(createImage("TrayIcon.png", "tray icon"))
  trayIcon.setPopupMenu(popup)
  trayIcon.setImageAutoSize(true)
  trayIcon.setToolTip("LabRAD")
  trayIcon.addActionListener(new ActionListener {
    def actionPerformed(e: ActionEvent): Unit = {
      browse()
    }
  })

  try {
    SystemTray.getSystemTray.add(trayIcon)
  } catch {
    case e: Throwable =>
      log.error("TrayIcon could not be added", e)
      sys.exit(1)
  }

  sys.addShutdownHook {
    SystemTray.getSystemTray.remove(trayIcon)
  }


  private def browse(): Unit = {
    try {
      Desktop.getDesktop.browse(new URI("http://localhost:7667"))
    } catch {
      case e: Exception =>
        trayIcon.displayMessage("LabRAD", "Unable to launch web browser", TrayIcon.MessageType.ERROR)
        log.error("Unable to launch web browser", e)
    }
  }

  protected def createImage(path: String, description: String): Image = {
    val imageURL = getClass.getResource(path)
    if (imageURL == null) {
      log.error(s"Resource not found: $path")
      null
    } else {
      Toolkit.getDefaultToolkit.getImage(imageURL)
    }
  }
}
