package org.labrad
package tray

import scala.swing.{Action, Menu, MenuItem, CheckMenuItem, Separator}
import scala.sys
import scala.util.Random

import java.awt.{Desktop, Image, SystemTray}
import java.awt.event.{ActionEvent, ActionListener, ItemEvent, ItemListener}
import java.io.File
import java.net.{URI, URL}
import java.util.prefs.Preferences

import javax.swing.{ImageIcon, JCheckBoxMenuItem, JMenu, JMenuItem, JOptionPane, JPopupMenu, SwingUtilities, UIManager}
import javax.swing.event.{ChangeEvent, ChangeListener}

import org.slf4j.{Logger, LoggerFactory}

import ch.qos.logback.classic.Level


class TrayController

object TrayController {
  private var trayIcon: TrayIcon = _
  private val log = LoggerFactory.getLogger(getClass)

  def defer(body: => Unit) {
    SwingUtilities.invokeLater(new Runnable {
      def run { body }
    })
  }

  def main(args: Array[String]) {
    try {
      UIManager.setLookAndFeel(UIManager.getSystemLookAndFeelClassName)
    } catch {
      case e: Throwable => log.error("Error while setting look and feel", e)
    }

    if (!SystemTray.isSupported) {
      log.error("SystemTray is not supported")
      sys.exit(1)
    }

    // start the graphical user interface
    defer { createAndShowGUI }

    // start the embedded web server
    BrowserServer.main(args)
  }

  private def createAndShowGUI {
    log.debug("creating GUI...")

    val tray = SystemTray.getSystemTray
    val prefs = Preferences.userRoot.node("/org/labrad/tray")

    // TODO: load these paths/commands lines from a config file
    val homePath = new File(sys.env.get("LABRADHOME").getOrElse(""))
    val logPath = new File(sys.env.get("LABRADSTORE").get, "Logs")

    val managerExe = new File(homePath, "LabRAD.exe").toString
    val managerBuilder = new ProcessBuilder(managerExe).directory(homePath)
    val manager = new ProcessManager("Manager", managerBuilder)

    val nodeExe = new File(homePath, "twistd.py").toString
    val nodeLog = new File(logPath, "node.log").toString
    val nodeBuilder = new ProcessBuilder("python", nodeExe, "--logfile", nodeLog, "-n", "labradnode")
    val node = new ProcessManager("NodeServer", nodeBuilder)

    // create popup menu
    val cbManager = new CheckMenuItem("LabRAD manager")
    val cbNode = new CheckMenuItem("LabRAD node")
    connect("Manager", manager, cbManager)
    connect("Node", node, cbNode)

    val autostartManager = new CheckMenuItem("LabRAD manager") {
      selected = prefs.getBoolean("autostartManager", true)
      action = Action("LabRAD manager") {
        prefs.putBoolean("autostartManager", selected)
      }
    }

    val autostartNode = new CheckMenuItem("LabRAD node") {
      selected = prefs.getBoolean("autostartNode", true)
      action = Action("LabRAD node") {
        prefs.putBoolean("autostartNode", selected)
      }
    }

    val popup = new PopupMenu {
      contents += cbManager
      contents += cbNode

      contents += new Separator
      contents += new Menu("Autostart") {
        contents += autostartManager
        contents += autostartNode
      }

      contents += new Separator
      contents += new CheckMenuItem("Allow remote web access") {
        val allowed = prefs.getBoolean("browserAllowRemote", false)
        BrowserServer.setAllowRemoteAccess(allowed)
        selected = allowed
        action = Action("Allow remote web access") {
          prefs.putBoolean("browserAllowRemote", selected)
          BrowserServer.setAllowRemoteAccess(selected)
        }
      }
      contents += new MenuItem("Set web password...") {
        BrowserServer.setRemotePassword(prefs.get("browserPassword", math.abs(Random.nextLong).toString))
        action = Action("Set web password...") {
          val password = prefs.get("browserPassword", "")
          Option(JOptionPane.showInputDialog("Enter password for remote web access", password)) map { newPass =>
            prefs.put("browserPassword", newPass)
            BrowserServer.setRemotePassword(newPass)
          }
        }
      }

      contents += new Separator
      contents += new MenuItem("Exit") {
        action = Action("Exit") {
          manager.stop
          node.stop
          tray.remove(trayIcon)
          sys.exit(0)
        }
      }
    }

    trayIcon = new TrayIcon(createImage("TrayIcon.png", "tray icon")) {
      menu = popup
      action = Action("browse") {
        try
          Desktop.getDesktop.browse(new URI("http://localhost:7667"))
        catch {
          case e: Exception =>
            trayIcon.displayMessage("LabRAD", "Unable to launch web browser", TrayIcon.ERROR)
            log.error("Unable to launch web browser", e)
        }
      }
    }
    trayIcon.setImageAutoSize(true)
    trayIcon.setToolTip("LabRAD")

    try
      tray.add(trayIcon)
    catch {
      case e: Throwable =>
        log.error("TrayIcon could not be added", e)
        sys.exit(1)
    }

    sys.addShutdownHook {
      manager.stop
      node.stop
    }

    if (autostartManager.selected) manager.start
    if (autostartNode.selected) node.start
    log.debug("GUI created")
  }

  // connect a process manager and check box menu item
  private def connect(name: String, pm: ProcessManager, cb: CheckMenuItem) {
    cb.action = Action(name) {
      if (cb.selected)
        pm.start
      else
        pm.stop
    }

    pm.addChangeListener(new ChangeListener {
      def stateChanged(e: ChangeEvent) {
        e.getSource match {
          case pm: ProcessManager =>
            val running = pm.isRunning
            val changed = if (running) "started" else "stopped"
            trayIcon.displayMessage("LabRAD", name + " has " + changed, TrayIcon.INFO)
            cb.selected = running
        }
      }
    })
  }

  // Obtain the image URL
  protected def createImage(path: String, description: String): Image = {
    val imageURL = TrayController.getClass.getResource(path)

    if (imageURL == null) {
      log.error("Resource not found: {}", path)
      null
    } else {
      new ImageIcon(imageURL, description).getImage
    }
  }
}
