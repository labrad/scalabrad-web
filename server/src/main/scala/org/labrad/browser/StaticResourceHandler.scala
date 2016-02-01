package org.labrad.browser

import io.netty.buffer.{ByteBuf, Unpooled}
import io.netty.channel.{ChannelFutureListener, ChannelHandlerContext}
import io.netty.handler.codec.http._
import io.netty.handler.codec.http.HttpHeaderNames._
import io.netty.handler.codec.http.HttpResponseStatus._
import io.netty.handler.codec.http.HttpVersion._
import java.net.URLDecoder
import java.nio.charset.StandardCharsets.UTF_8
import org.joda.time.{DateTime, DateTimeZone}
import org.joda.time.format.{DateTimeFormat, DateTimeFormatter}
import scala.concurrent.duration._

/**
 * A simple handler that serves resource files in /public as static files.
 * This allows us to package static files as resources in a bundled jar.
 *
 * Loosely based on the netty example at:
 * http://netty.io/4.0/xref/io/netty/example/http/file/HttpStaticFileServerHandler.html
 */
class StaticResourceHandler(
  resourceRoot: String = "/public/",
  cacheTime: Option[Duration] = Some(60.seconds)
) {

  import StaticResourceHandler._

  /**
   * Attempt to handle the given HTTP request by serving a static resource.
   *
   * Returns an optional http response, which will be defined if a suitable
   * resource is available and the request can be handled. Otherwise returns
   * None, for example if the uri path is ill-formed or does not point to an
   * available resource under the resourceRoot path.
   */
  def get(uri: String): Option[FullHttpResponse] = {
    getBytes(uri).map { case (path, bytes) => makeResponse(path, bytes) }
  }

  /**
   * Get bytes for the given resource.
   *
   * Returns an optional http response, which will be defined if a suitable
   * resource is available and the request can be handled. Otherwise returns
   * None, for example if the uri path is ill-formed or does not point to an
   * available resource under the resourceRoot path.
   */
  def getBytes(uri: String): Option[(String, Array[Byte])] = {
    val path = resourcePath(uri).getOrElse { return None }
    val stream = Option(getClass.getResourceAsStream(path)).getOrElse { return None }

    // read the entire resource so we can get the length
    val bytes = {
      val buf = Array.ofDim[Byte](1024)
      val b = Array.newBuilder[Byte]
      var done = false
      while (!done) {
        val read = stream.read(buf)
        if (read == -1) {
          done = true
        } else {
          b ++= buf.take(read)
        }
      }
      b.result
    }
    Some((path, bytes))
  }

  def makeResponse(path: String, bytes: Array[Byte]): FullHttpResponse = {
    val now = DateTime.now()

    // create http response and set headers
    val response = new DefaultFullHttpResponse(HTTP_1_1, OK, Unpooled.wrappedBuffer(bytes))
    HttpHeaderUtil.setContentLength(response, bytes.length)
    response.headers.set(CONTENT_TYPE, mediaType(fileType(path)))
    response.headers.set(DATE, DateFormat.print(now))
    cacheTime match {
      case Some(time) =>
        response.headers.set(EXPIRES, DateFormat.print(now.plus(time.toMillis)))
        response.headers.set(CACHE_CONTROL, s"private, max-age=${time.toSeconds}")

      case None =>
        response.headers.set(CACHE_CONTROL, "no-cache")
    }
    response
  }

  def resourcePath(uri: String): Option[String] = {
    val decoded = URLDecoder.decode(uri, UTF_8.name)
    decoded match {
      case AllowedPath(path) if !path.contains("..") =>
        Some(resourceRoot + path)
      case _ =>
        None
    }
  }

  def fileType(path: String): String = path.drop(path.lastIndexOf('.') + 1)
  def mediaType(ext: String): String = MediaTypes.getOrElse(ext, "application/octet-stream")
}

object StaticResourceHandler {
  // Regex for allowed resource paths.
  // We are conservative here and only allow basic alphanumeric chars.
  // We also require that requests use absolute paths starting with '/'.
  val AllowedPath = """^/([a-zA-Z0-9_\-./]+)$""".r

  // Format for HTTP dates, as described in rfc 2616:
  // http://www.w3.org/Protocols/rfc2616/rfc2616-sec3.html#sec3.3.1
  val DateFormat = DateTimeFormat.forPattern("EEE, dd MMM yyyy HH:mm:ss zzz")
                                 .withZone(DateTimeZone.forID("GMT"))

  // Media types for various file extensions
  val MediaTypes = Map(
    "css" -> "text/css",
    "htm" -> "text/html",
    "html" -> "text/html",
    "js" -> "application/javascript",
    "ts" -> "application/x-typescript"
  )
}
