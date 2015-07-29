package org.labrad.browser

import io.netty.buffer.{ByteBuf, Unpooled}
import io.netty.channel._
import io.netty.handler.codec.http._
import io.netty.handler.codec.http.HttpHeaderNames._
import io.netty.handler.codec.http.HttpMethod._
import io.netty.handler.codec.http.HttpResponseStatus._
import io.netty.handler.codec.http.HttpVersion._
import io.netty.handler.codec.http.websocketx._
import java.net.InetSocketAddress
import java.nio.charset.StandardCharsets.UTF_8
import org.labrad.browser.Futures._
import org.labrad.browser.jsonrpc.{Backend, JsonRpcTransport}
import org.labrad.util.Logging
import scala.concurrent.{ExecutionContext, Future}
import scala.util.matching.Regex

sealed trait Route {
  def method: HttpMethod
  def path: Regex
}
case class WebSocketRoute(method: HttpMethod, path: Regex, ssl: Boolean, backend: () => Backend) extends Route
case class AppRoute(method: HttpMethod, path: Regex, handler: StaticResourceHandler, appPath: String) extends Route
case class StaticRoute(method: HttpMethod, path: Regex, handler: StaticResourceHandler) extends Route

/**
 * Route requests to websocket backend or static files, based on requested path.
 */
class RoutingHandler(routes: Route*)(implicit ec: ExecutionContext)
extends SimpleChannelInboundHandler[FullHttpRequest] with Logging {

  override def channelRead0(ctx: ChannelHandlerContext, req: FullHttpRequest): Unit = {
    var matched = false
    var responseOpt: Option[FullHttpResponse] = None

    val it = routes.iterator
    while (it.hasNext && !matched) {
      val route = it.next
      if (route.method == req.method &&
          route.path.findFirstIn(req.uri).isDefined) {
        matched = true
        route match {
          case route: WebSocketRoute =>
            WebSocketHandler.upgrade(ctx, req, route.ssl, route.backend())

          case route: AppRoute =>
            responseOpt = route.handler.get(route.appPath).orElse {
              log.error(s"unable to find app resource ${route.appPath}")
              Some(errorResponse(INTERNAL_SERVER_ERROR))
            }

          case route: StaticRoute =>
            responseOpt = route.handler.get(req.uri).orElse {
              Some(errorResponse(NOT_FOUND))
            }
        }
      }
    }

    // send response and close connection if necessary
    for (response <- responseOpt) {
      val f = ctx.write(response)
      if (keepAlive(req, response)) {
        response.headers.set(CONNECTION, HttpHeaderValues.KEEP_ALIVE)
      } else {
        f.addListener(ChannelFutureListener.CLOSE)
      }
    }
  }

  override def channelReadComplete(ctx: ChannelHandlerContext): Unit = {
    ctx.flush()
  }

  override def exceptionCaught(ctx: ChannelHandlerContext, cause: Throwable): Unit = {
    cause.printStackTrace()
    ctx.close()
  }

  def keepAlive(req: FullHttpRequest, res: FullHttpResponse): Boolean = {
    return HttpHeaderUtil.isKeepAlive(req) && res.status.code == 200
  }

  def errorResponse(status: HttpResponseStatus): FullHttpResponse = {
    val response = new DefaultFullHttpResponse(HTTP_1_1, status)
    val buf = Unpooled.copiedBuffer(response.status.toString, UTF_8)
    response.content.writeBytes(buf)
    buf.release()
    HttpHeaderUtil.setContentLength(response, response.content.readableBytes)
    response
  }
}

object WebSocketHandler {
  /**
   * Upgrade a channel from HTTP to the websocket protocol, with subsequent
   * websocket messages handled by the given Backend instance. Also removes the
   * current handler (which got the HTTP upgrade request) and adds a new
   * WebSocketHandler to the pipeline which connects the netty pipeline to the
   * Backend.
   */
  def upgrade(
    ctx: ChannelHandlerContext,
    request: FullHttpRequest,
    ssl: Boolean,
    backend: Backend
  )(implicit ec: ExecutionContext): Future[Unit] = {
    val location = {
      val host = request.headers.get(HOST)
      val scheme = if (ssl) "wss" else "ws"
      s"$scheme://$host${request.uri}"
    }
    val wsFactory = new WebSocketServerHandshakerFactory(location, null, false)
    val handshaker = wsFactory.newHandshaker(request)
    val handler = new WebSocketHandler(ctx.channel, handshaker, backend)
    val future = handshaker.handshake(ctx.channel, request)
    future.addListener(ChannelFutureListener.CLOSE_ON_FAILURE)
    ctx.pipeline.addLast(handler)
    ctx.pipeline.remove(ctx.handler)
    future.toScala.map(_ => ())
  }
}

/**
 * Handler that connects a Netty channel pipeline to a websocket Backend.
 */
class WebSocketHandler(
  channel: Channel,
  handshaker: WebSocketServerHandshaker,
  backend: Backend
)(implicit ec: ExecutionContext) extends SimpleChannelInboundHandler[WebSocketFrame] {

  private val rpcTransport = new JsonRpcTransport(backend, { msg =>
    channel.writeAndFlush(new TextWebSocketFrame(msg))
  })

  override def channelRead0(ctx: ChannelHandlerContext, msg: WebSocketFrame): Unit = {
    msg match {
      case frame: CloseWebSocketFrame =>
        handshaker.close(ctx.channel, frame.retain())

      case frame: PingWebSocketFrame =>
        ctx.channel.writeAndFlush(new PongWebSocketFrame(frame.content.retain()))

      case frame: PongWebSocketFrame =>

      case frame: TextWebSocketFrame =>
        rpcTransport.receive(frame.text)

      case _ => // binary or continuation frames
        throw new UnsupportedOperationException(s"${msg.getClass.getName} frame type not supported")
    }
  }

  override def channelReadComplete(ctx: ChannelHandlerContext): Unit = {
    ctx.flush()
  }

  override def exceptionCaught(ctx: ChannelHandlerContext, cause: Throwable): Unit = {
    cause.printStackTrace()
    ctx.close()
  }

  override def channelInactive(ctx: ChannelHandlerContext): Unit = {
    for (transport <- Option(rpcTransport)) {
      transport.stop()
    }
  }
}
