package org.labrad.browser.jsonrpc

import play.api.libs.json._
import scala.collection.mutable
import scala.concurrent.{Await, ExecutionContext, Future, Promise}
import scala.util.{Success, Failure}


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
   *
   * We first check that the given value is an object with a field named
   * jsonrpc that has the value "2.0", as required by the jsonrpc spec.
   * We then strip that field and attempt to parse the object into one
   * of the possible jsonrpc message types (the message classes do not
   * include a "jsonrpc" field since it is constant, which is why we strip
   * it out first).
   */
  def unapply(json: JsValue): Option[Message] = {
    val obj = json.asOpt[JsObject].getOrElse(JsObject(Nil))

    val version = (obj \ "jsonrpc").asOpt[String].getOrElse("")
    if (version != "2.0") return None

    val msg = obj - "jsonrpc"

    None.orElse {
      msg.asOpt[Request]
    }.orElse {
      msg.asOpt[SuccessResponse]
    }.orElse {
      msg.asOpt[ErrorResponse]
    }.orElse {
      msg.asOpt[Notification]
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


class JsonRpcTransport(backend: Backend, send: String => Unit)(implicit ec: ExecutionContext) {

  // Limit call ids to 2^53 since this is the largest int
  // that js can represent (its only numeric type is double)
  private val MaxCalls = 1L << 53

  private val lock = new Object
  private var callId: Long = 0
  private val calls = mutable.Map.empty[Id, Promise[JsValue]]

  private def makeCall(): (Id, Promise[JsValue]) = lock.synchronized {
    val nextCall = callId
    callId = (callId + 1) % MaxCalls
    val p = Promise[JsValue]
    val id = Left(nextCall)
    calls(id) = p
    id -> p
  }
  private def getCall(id: Id): Option[Promise[JsValue]] = lock.synchronized {
    calls.remove(id)
  }
  private def getCalls(): Seq[Promise[JsValue]] = lock.synchronized {
    val ps = calls.values.toVector
    calls.clear()
    ps
  }

  // typed facade to this actor that implements the Endpoint interface
  private val endpoint = new Endpoint {
    override def call(src: Endpoint, method: String, params: Option[Params]): Future[JsValue] = {
      val (id, p) = makeCall()
      sendMsg(Request(id, method, params))
      p.future
    }

    override def notify(src: Endpoint, method: String, params: Option[Params]): Unit = {
      sendMsg(Notification(method, params))
    }
  }

  backend.connect(endpoint)

  def receive(msg: String): Unit = {
    println(s"got message: $msg")
    Message.unapply(Json.parse(msg)) match {
      case None =>
        sys.error(s"invalid jsonrpc message: $msg")

      case Some(msg) =>
        handle(msg)
    }
  }

  def stop(): Unit = {
    backend.disconnect(endpoint)
    val promises = getCalls()
    for (promise <- promises) {
      promise.failure(JsonRpcError(-1, "transport closed"))
    }
  }

  private def handle(msg: Message): Unit = msg match {
    case r: Request =>
      backend.call(endpoint, r.method, r.params).onComplete {
        case Success(result) =>
          sendMsg(SuccessResponse(r.id, result))

        case Failure(e: JsonRpcError) =>
          sendMsg(ErrorResponse(r.id, e))

        case Failure(e) =>
          sendMsg(ErrorResponse(r.id, JsonRpcError(-10, e.toString)))
      }

    case n: Notification =>
      backend.notify(endpoint, n.method, n.params)

    case s: SuccessResponse =>
      for (p <- getCall(s.id)) {
        p.success(s.result)
      }

    case e: ErrorResponse =>
      for (p <- getCall(e.id)) {
        p.failure(e.error)
      }
  }

  private def sendMsg(msg: Message): Unit = {
    println(s"sending: ${Message.toJson(msg).toString}")
    send(Message.toJson(msg).toString)
  }
}
