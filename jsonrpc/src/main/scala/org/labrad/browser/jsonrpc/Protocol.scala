package org.labrad.browser.jsonrpc

import akka.actor.{Actor, ActorRef, PoisonPill, Props}
import play.api.libs.json._
import scala.collection.mutable
import scala.concurrent.{Await, Future, Promise}
import scala.concurrent.ExecutionContext.Implicits.global
import scala.util.{Try, Success, Failure}


sealed trait Message

case class Request(id: Id, method: String, params: Option[Params]) extends Message
object Request { implicit val format = Json.format[Request] }

case class Notification(method: String, params: Option[Params]) extends Message
object Notification { implicit val format = Json.format[Notification] }

case class SuccessResponse(id: Id, result: JsValue) extends Message
object SuccessResponse { implicit val format = Json.format[SuccessResponse] }

case class ErrorResponse(id: Id, error: JsonRpcError) extends Message
object ErrorResponse { implicit val format = Json.format[ErrorResponse] }


object Message {

  /**
   * Convert a JSON value into a JsonRpc 2.0 message.
   */
  def unapply(json: JsValue): Option[Message] = {
    (json \ "jsonrpc").asOpt[String].filter(_ == "2.0").flatMap { _ =>
      json.asOpt[JsObject].map(_ - "jsonrpc").flatMap { obj =>
        None.orElse {
          obj.asOpt[Request]
        }.orElse {
          obj.asOpt[SuccessResponse]
        }.orElse {
          obj.asOpt[ErrorResponse]
        }.orElse {
          obj.asOpt[Notification]
        }
      }
    }
  }

  /**
   * Convert a JsonRpc message into a JSON value, including the jsonrpc field.
   */
  def toJson(msg: Message): JsValue = {
    val obj = msg match {
      case r: Request => write(r)
      case n: Notification => write(n)
      case s: SuccessResponse => write(s)
      case e: ErrorResponse => write(e)
    }
    baseObject ++ obj
  }

  private def write[A](a: A)(implicit w: OWrites[A]): JsObject = w.writes(a)
  private val baseObject = JsObject(Seq("jsonrpc" -> JsString("2.0")))
}


trait Endpoint {
  def call(src: Endpoint, method: String, params: Option[Params]): Future[JsValue]
  def notify(src: Endpoint, method: String, params: Option[Params]): Unit
}

trait Backend extends Endpoint {
  def connect(src: Endpoint): Unit
  def disconnect(src: Endpoint): Unit
}


object JsonRpcTransport {
  def props(out: ActorRef, backend: Backend) = {
    Props(new JsonRpcTransport(out, backend))
  }

  // message types used internally to implement the Endpoint interface
  case class Call(p: Promise[JsValue], method: String, params: Option[Params])
  case class Notify(method: String, params: Option[Params])
}

class JsonRpcTransport(out: ActorRef, backend: Backend) extends Actor {

  import JsonRpcTransport._

  private val MaxCalls = 1L << 53
  private var callId: Long = 0
  private def nextCall: Long = {
    val result = callId
    callId = (callId + 1) % MaxCalls
    result
  }
  private val calls = mutable.Map.empty[Id, Promise[JsValue]]

  // typed facade to this actor that implements the Endpoint interface
  private val endpoint = new Endpoint {
    override def call(src: Endpoint, method: String, params: Option[Params]): Future[JsValue] = {
      val p = Promise[JsValue]
      self ! Call(p, method, params)
      p.future
    }

    override def notify(src: Endpoint, method: String, params: Option[Params]): Unit = {
      self ! Notify(method, params)
    }
  }

  backend.connect(endpoint)

  override def postStop(): Unit = {
    for (promise <- calls.values) {
      promise.failure(JsonRpcError(-1, "transport closed"))
    }
    calls.clear()
    backend.disconnect(endpoint)
  }

  def receive = {
    // from the client
    case msg: String =>
      println(s"got message: $msg")
      Message.unapply(Json.parse(msg)) match {
        case None =>
          self ! PoisonPill

        case Some(msg) =>
          handle(msg)
      }

    // from the backend
    case Call(p, method, params) =>
      val id = Left(nextCall)
      calls(id) = p
      send(Request(id, method, params))

    case Notify(method, params) =>
      send(Notification(method, params))
  }

  private def handle(msg: Message): Unit = msg match {
    case r: Request =>
      backend.call(endpoint, r.method, r.params).onComplete {
        case Success(result) =>
          send(SuccessResponse(r.id, result))

        case Failure(e: JsonRpcError) =>
          send(ErrorResponse(r.id, e))

        case Failure(e) =>
          send(ErrorResponse(r.id, JsonRpcError(-10, e.toString)))
      }

    case n: Notification =>
      backend.notify(endpoint, n.method, n.params)

    case s: SuccessResponse =>
      for (p <- calls.get(s.id)) {
        p.success(s.result)
      }

    case e: ErrorResponse =>
      for (p <- calls.get(e.id)) {
        p.failure(e.error)
      }
  }

  private def send(msg: Message): Unit = {
    println(s"sending: ${Message.toJson(msg).toString}")
    out ! Message.toJson(msg).toString
  }
}
