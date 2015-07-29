package org.labrad.browser

import akka.actor.{Actor, ActorRef, Props}
import javax.inject._
import org.labrad.browser.jsonrpc.JsonRpcTransport
import play.api.Application
import play.api.mvc.{Action, Controller, WebSocket}

class BrowserController @Inject() ()(implicit app: Application) extends Controller {

  // bring execution context into scope for scheduling asynchronous operations
  implicit val executionContext = app.actorSystem.dispatcher

  /**
   * Render the index.html page which launches the client app.
   *
   * This is called for any url which is a valid app url, and the
   * client-side code then renders the correct UI based on the url.
   * We accept a parameter 'path' because the play routes compiler
   * wants to pass a parameter when it matches routes, but in fact
   * we just ignore that here since we always send the same html.
   */
  def app(path: String) = {
    controllers.Assets.at(path="/public", file="index.html")
  }

  /**
   * Accept a websocket connection that uses jsonrpc to make api calls.
   *
   * We create a new ApiBackend for each websocket connection, which manages
   * its own connection to labrad and lasts until the websocket is closed.
   */
  def socket = WebSocket.acceptWithActor[String, String] { request => out =>
    Props(new SocketActor(out))
  }

  class SocketActor(out: ActorRef) extends Actor {
    // create an rpc backend and a jsonrpc transport that talks to the backend
    // and send outgoing messages to the 'out' actor
    val backend = new ApiBackend()
    val transport = new JsonRpcTransport(backend, msg => out ! msg)

    def receive = {
      case msg: String => transport.receive(msg)
      case msg => println(s"unexpected message: $msg")
    }

    override def postStop(): Unit = {
      transport.stop()
    }
  }
}
