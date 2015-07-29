package org.labrad.browser

import io.netty.bootstrap.ServerBootstrap
import io.netty.channel.ChannelInitializer
import io.netty.channel.nio.NioEventLoopGroup
import io.netty.channel.socket.SocketChannel
import io.netty.channel.socket.nio.NioServerSocketChannel
import io.netty.handler.codec.http._
import io.netty.handler.codec.http.HttpMethod._
import io.netty.handler.logging.{LogLevel, LoggingHandler}
import org.clapper.argot._
import org.clapper.argot.ArgotConverters._
import org.labrad.util.Util
import scala.concurrent.ExecutionContext.Implicits.global
import scala.util.{Try, Success, Failure}

/**
 * Configuration for running the labrad web interface.
 */
case class WebServerConfig(
  port: Int
)

object WebServerConfig {

  /**
   * Create WebServerConfig from command line and map of environment variables.
   *
   * @param args command line parameters
   * @param env map of environment variables, which defaults to the actual
   *        environment variables in scala.sys.env
   * @return Try containing a WebServerConfig instance on success, or a Failure
   *         in the case something went wrong. The Failure will contain an
   *         ArgotUsageException if the command line parsing failed or the
   *         -h or --help options were supplied.
   */
  def fromCommandLine(
    args: Array[String],
    env: Map[String, String] = scala.sys.env
  ): Try[WebServerConfig] = {
    val parser = new ArgotParser("labrad-web",
      preUsage = Some("Web interface to labrad."),
      sortUsage = false
    )
    val portOpt = parser.option[Int](
      names = List("port"),
      valueName = "int",
      description = "Port on which to listen for incoming connections. " +
        "If not provided, fallback to the value given in the LABRADHTTPPORT " +
        "environment variable, with default value 7667."
    )
    val help = parser.flag[Boolean](List("h", "help"),
      "Print usage information and exit")

    Try {
      parser.parse(args)
      if (help.value.getOrElse(false)) parser.usage()

      WebServerConfig(
        port = portOpt.value.orElse(env.get("LABRADHTTPPORT").map(_.toInt)).getOrElse(7667)
      )
    }
  }
}


class WebServer(port: Int) {
  val bossGroup = new NioEventLoopGroup(1)
  val workerGroup = new NioEventLoopGroup()
  val staticHandler = new StaticResourceHandler()
  val b = new ServerBootstrap()
  b.group(bossGroup, workerGroup)
   .channel(classOf[NioServerSocketChannel])
   .handler(new LoggingHandler(LogLevel.INFO))
   .childHandler(new ChannelInitializer[SocketChannel] {
     override def initChannel(ch: SocketChannel): Unit = {
       val pipeline = ch.pipeline
       pipeline.addLast(new HttpServerCodec())
       pipeline.addLast(new HttpObjectAggregator(65536))
       pipeline.addLast(new RoutingHandler(
         WebSocketRoute(GET, "^/api/socket$".r, false, () => new ApiBackend),
         AppRoute(GET, "^/$".r, staticHandler, "/index.html"),
         AppRoute(GET, "^/dataset.*$".r, staticHandler, "/index.html"),
         AppRoute(GET, "^/grapher.*$".r, staticHandler, "/index.html"),
         AppRoute(GET, "^/nodes.*$".r, staticHandler, "/index.html"),
         AppRoute(GET, "^/registry.*$".r, staticHandler, "/index.html"),
         AppRoute(GET, "^/server.*$".r, staticHandler, "/index.html"),
         StaticRoute(GET, ".*".r, staticHandler)
       ))
     }
   })

  val channel = b.bind(port).sync().channel

  def stop(): Unit = {
    channel.close()
    channel.closeFuture.sync()
    bossGroup.shutdownGracefully()
    workerGroup.shutdownGracefully()
  }
}

object WebServer {
  def main(args: Array[String]): Unit = {
    val config = WebServerConfig.fromCommandLine(args) match {
      case Success(config) => config

      case Failure(e: ArgotUsageException) =>
        println(e.message)
        return

      case Failure(e: Throwable) =>
        println(s"unexpected error: $e")
        return
    }

    val server = new WebServer(config.port)

    println(s"now serving at http://localhost:${config.port}")

    // Optionally wait for EOF to stop the server.
    // This is a convenience feature when developing in sbt, allowing the
    // server to be stopped without killing sbt. However, this is generally
    // not desired when deployed; for example, start-stop-daemon detaches
    // from the process, so that stdin gets EOF, but we want the server
    // to continue to run.
    val stopOnEOF = sys.props.get("org.labrad.stopOnEOF") == Some("true")
    if (stopOnEOF) {
      Util.awaitEOF()
      server.stop()
    } else {
      sys.addShutdownHook {
        server.stop()
      }
    }
  }
}
