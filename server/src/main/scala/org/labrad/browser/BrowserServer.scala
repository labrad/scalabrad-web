package org.labrad.browser

import java.io.File
import java.util.concurrent.ExecutionException
import scala.collection.JavaConversions._
import scala.concurrent.Await
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration._
import scala.util.Random
import org.labrad.Connection
import org.labrad.browser.server.LabradConnection
import org.labrad.data._
import org.eclipse.jetty.security.{ConstraintMapping, HashLoginService, ConstraintSecurityHandler}
import org.eclipse.jetty.server.Server
import org.eclipse.jetty.util.security.Constraint
import org.eclipse.jetty.util.security.Password
import org.eclipse.jetty.webapp.WebAppContext
import org.eclipse.jetty.security.authentication.DigestAuthenticator

object BrowserServer {
  val REGISTRY_PATH = Array("", "Nodes", "__controller__")

  def main(args: Array[String]): Unit = {
    val warName = "./LabradBrowser.war"
    val jettyDefault = if (new File(warName).exists) warName else "./war"
    val jettyHome = sys.props.get("jetty.home").getOrElse(jettyDefault)

    val port = java.lang.Integer.getInteger("jetty.port", 7667).intValue
    val server = new Server(port)

//    val connector = new SelectChannelConnector()
//    connector.setPort(sys.props.get("jetty.port").map(_.toInt).getOrElse(7667))
//    server.setConnectors(Array(connector))

    val constraint = new Constraint()
    constraint.setName(Constraint.__DIGEST_AUTH)
    constraint.setRoles(Array("user"))
    constraint.setAuthenticate(true)

    val cm = new ConstraintMapping()
    cm.setConstraint(constraint)
    cm.setPathSpec("/*")

    @scala.annotation.tailrec
    def tryLoad(): HashLoginService = {
      val realmOpt = try {
        Some(loadUserInfo())
      } catch {
        case e: Throwable =>
          e.printStackTrace()
          println("Unable to load user information from registry.")
          println("Will retry in 10 seconds...")
          None
      }
      realmOpt match {
        case Some(realm) => realm
        case None =>
          Thread.sleep(10.seconds.toMillis)
          tryLoad()
      }
    }
    val loginService = tryLoad()

    val security = new ConstraintSecurityHandler()
    security.setAuthenticator(new DigestAuthenticator())
    security.setLoginService(loginService)
    security.setConstraintMappings(Array(cm))

    val webapp = new WebAppContext()
    webapp.setContextPath("/")
    webapp.setWar(jettyHome)
    webapp.setSecurityHandler(security)

    server.setHandler(webapp)

    server.start()
    server.join()
  }

  private def loadUserInfo(): HashLoginService = {
    //val reg = LabradConnection.getRegistry
    //val pkt = reg.packet
    // change into the correct directory
    //pkt.cd(REGISTRY_PATH)
    //val defaultUsers = Arr(Cluster(Str("webuser"), Str(Random.nextInt(1000000000).toString)))
    // load the user info, setting a default value if it doesn't exist
    //val f = pkt.get("users", tag = "*(ss)", default = Some((defaultUsers, true)))
    //pkt.send()
    //val ans = Await.result(f, 10.seconds).get[Array[(String, String)]]
    val ans = Array(("webuser", "webpassword"))
    val loginService = new HashLoginService("LabRAD Controller")
    for ((user, pw) <- ans) {
      loginService.putUser(user, new Password(pw), Array("user"))
    }
    loginService
  }
}
