package org.labrad
package tray

import com.google.inject.AbstractModule
import java.awt.{Desktop, Image, MenuItem, PopupMenu, SystemTray, Toolkit, TrayIcon}
import java.awt.event.{ActionEvent, ActionListener}
import java.net.URI
import javax.inject._
import org.slf4j.{Logger, LoggerFactory}
import play.api.inject.ApplicationLifecycle
import scala.concurrent.Future


class TrayModule extends AbstractModule {
  def configure() = {
    if (SystemTray.isSupported) {
      bind(classOf[TrayController]).asEagerSingleton()
    }
  }
}

class TrayController @Inject() (lifecycle: ApplicationLifecycle) {

  private val log = LoggerFactory.getLogger(getClass)

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

  lifecycle.addStopHook{ () =>
    SystemTray.getSystemTray.remove(trayIcon)
    Future.successful(())
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
      log.error("Resource not found: {}", path)
      null
    } else {
      Toolkit.getDefaultToolkit.getImage(imageURL)
    }
  }
}
