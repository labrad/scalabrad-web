package org.labrad
package tray

import java.io.File
import java.io.IOException
import java.net.URL
import java.security.ProtectionDomain
import java.util.Random
import java.util.prefs.Preferences
import org.eclipse.jetty.security.ConstraintMapping
import org.eclipse.jetty.security.ConstraintSecurityHandler
import org.eclipse.jetty.security.HashLoginService
import org.eclipse.jetty.security.SecurityHandler
import org.eclipse.jetty.server.{Request, Server}
import org.eclipse.jetty.util.security.Constraint
import org.eclipse.jetty.util.security.Password
import org.eclipse.jetty.webapp.WebAppContext
import org.slf4j.Logger
import org.slf4j.LoggerFactory

object BrowserServer {
  val USER_ROLE = "user"
  val log = LoggerFactory.getLogger(getClass)

  object securityHandler extends ConstraintSecurityHandler {
    lazy val log = LoggerFactory.getLogger(getClass)

    private var _allowUncheckedLocalAccess = true
    private var _allowCheckedRemoteAccess = false

    def allowUncheckedLocalAccess = _allowUncheckedLocalAccess
    def allowCheckedRemoteAccess = _allowCheckedRemoteAccess

    def allowUncheckedLocalAccess_=(flag: Boolean) = synchronized { _allowUncheckedLocalAccess = flag }
    def allowCheckedRemoteAccess_=(flag: Boolean) = synchronized { _allowCheckedRemoteAccess = flag }

    override def checkSecurity(request: Request): Boolean = synchronized {
      request.getRemoteAddr match {
        case "127.0.0.1" => 
          request.setAttribute("fromLocalhost", java.lang.Boolean.TRUE)
          if (allowUncheckedLocalAccess) {
            log.debug("Local request.  Disabling security constraints.")
            true
          } else {
            log.debug("Local request.  Checking security constraints.")
            super.checkSecurity(request)
          }
        case _ =>
          if (allowCheckedRemoteAccess) {
            log.debug("Remote request.  Checking security constraints.")
            super.checkSecurity(request)
          } else {
            log.debug("Remote request.  Remote access disabled.")
            false
          }
      }
    }
  }

  def main(args: Array[String]) {
    // TODO support (require?) https connections when connecting remotely

    val warPath = if (new File("war").exists) {
      "war" // for development
    } else if (new File("LabradBrowser.war").exists) {
      "LabradBrowser.war" // for deployment
    } else {
      // assume we are running inside an executable war
      val protectionDomain = getClass.getProtectionDomain
      val location = protectionDomain.getCodeSource.getLocation
      location.toExternalForm
    }

    val port = Integer.getInteger("jetty.port", 7667).intValue
    val server = new Server(port)

    val constraint = new Constraint()
    constraint.setName(Constraint.__DIGEST_AUTH)
    constraint.setRoles(Array(USER_ROLE))
    constraint.setAuthenticate(true)

    val mapping = new ConstraintMapping
    mapping.setConstraint(constraint)
    mapping.setPathSpec("/*")

    val prefs = Preferences.userRoot.node("/org/labrad/tray")
    val defaultPass = String.valueOf(new Random().nextInt(1000000000))
    log.info("Default password: " + defaultPass)
    val password = prefs.get("browserPassword", defaultPass)
    val remoteAllowed = prefs.getBoolean("browserAllowRemote", false)

    setAllowRemoteAccess(remoteAllowed)
    setRemotePassword(password)
    securityHandler.setConstraintMappings(Array(mapping))

    val webapp = new WebAppContext(warPath, "/")
    webapp.setSecurityHandler(securityHandler)

    server.setHandler(webapp)

    server.start
    server.join
  }

  def setAllowRemoteAccess(allowed: Boolean) {
    securityHandler.allowCheckedRemoteAccess = allowed
  }

  def setRemotePassword(password: String) {
    securityHandler.setLoginService(loadUserInfo())
  }

  private def loadUserInfo() = {
    val prefs = Preferences.userRoot.node("/org/labrad/tray")
    val defaultPass = String.valueOf(new Random().nextInt(1000000000))
    log.info("Default password: " + defaultPass)
    val password = prefs.get("browserPassword", "")

    // create a user realm containing configured users and passwords
    val loginService = new HashLoginService("LabRAD Controller")
    loginService.putUser("webuser", new Password(password), Array(USER_ROLE))
    loginService
  }
}
