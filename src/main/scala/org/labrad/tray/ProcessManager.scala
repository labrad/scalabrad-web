package org.labrad
package tray

import scala.collection._

import java.io.{BufferedReader, IOException, InputStream, InputStreamReader}
import java.util.{Timer, TimerTask}

import javax.swing.SwingUtilities
import javax.swing.event.{ChangeEvent, ChangeListener}

import org.slf4j.{Logger, LoggerFactory}


class ProcessManager(name: String, builder: ProcessBuilder) {
  val POLL_INTERVAL = 1000

  def defer(body: => Unit): Unit = {
    SwingUtilities.invokeLater(new Runnable {
      def run { body }
    })
  }

  var process: Process = _
  val listeners = mutable.Buffer.empty[ChangeListener]
  val log = LoggerFactory.getLogger(name)  

  def start: Unit = synchronized {
    if (!isRunning) {
      try {
        process = builder.start
        notifyListeners
        log.info("subprocess started")
        startMonitoring(process.getInputStream, process.getErrorStream)
      } catch {
        case e: IOException =>
          log.error("Failed to start subprocess", e)
      }
    }
  }

  private def startMonitoring(stdoutStream: InputStream, stderrStream: InputStream): Unit = {
    val monitor = new Timer(name + ".ProcessMonitor")
    val stdoutReader = new Timer(name + ".StdOut")
    val stderrReader = new Timer(name + ".StdErr")

    monitor.schedule(new TimerTask {
      def run {
        if (!isRunning) {
          defer { notifyListeners }
          monitor.cancel
          stdoutReader.cancel
          stderrReader.cancel
          log.info("subprocess stopped")
        }
      }
    }, POLL_INTERVAL, POLL_INTERVAL)

    def schedule(name: String, timer: Timer, stream: InputStream)(handle: String => Unit) {
      val reader = new BufferedReader(new InputStreamReader(stream))
      val task = new TimerTask {
        def run {
          try {
            var done = false
            while (!done) {
              reader.readLine match {
                case null => done = true
                case line => handle(line)
              }
            }
          } catch {
            case e: IOException =>
              log.error("Error while reading " + name, e)
          }
        }
      }
      timer.schedule(task, 0)
    }

    schedule("stdout", stdoutReader, stdoutStream) { log.info(_) }
    schedule("stderr", stderrReader, stderrStream) { log.error(_) }
  }

  def stop: Unit = synchronized {
    if (isRunning) {
      process.destroy
      var done = false
      while (!done) {
        try {
          process.waitFor
          done = true
        } catch {
          case e: InterruptedException =>
            log.error("Interrupted while waiting for process shutdown", e)
        }
      }
    }
  }

  def isRunning: Boolean = synchronized {
    if (process == null)
      false
    else
      try {
        process.exitValue
        false
      } catch {
        case e: IllegalThreadStateException => true
      }
  }

  def addChangeListener(listener: ChangeListener): Unit = {
    listeners += listener
  }

  def removeChangeListener(listener: ChangeListener): Unit = {
    listeners -= listener
  }

  private def notifyListeners: Unit = {
    listeners foreach (_.stateChanged(new ChangeEvent(this)))
  }
}
