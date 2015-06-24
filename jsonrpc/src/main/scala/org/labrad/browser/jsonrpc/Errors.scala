package org.labrad.browser.jsonrpc

import play.api.libs.json._
import scala.concurrent.{ExecutionContext, Future}
import scala.language.experimental.macros
import scala.reflect.macros.blackbox.Context

/**
 * Error type that can be serialized cleanly to jsonrpc error messages.
 * Instances of this error raised while handling an rpc call will form the
 * response body. Other raised exceptions will result in a generic internal
 * error message.
 */
case class JsonRpcError(code: Long, message: String, data: Option[JsValue] = None) extends Exception

object JsonRpcError {
  implicit val format = Json.format[JsonRpcError]

  // Predefined error types from the JSON-RPC specification
  // see: http://www.jsonrpc.org/specification

  def invalidRequest(data: JsValue = null) = {
    JsonRpcError(-32600, "Invalid Request", Option(data))
  }

  def methodNotFound(data: JsValue = null) = {
    JsonRpcError(-32601, "Method not found", Option(data))
  }

  def invalidParams(data: JsValue = null) = {
    JsonRpcError(-32602, "Invalid params", Option(data))
  }

  def internalError(data: JsValue = null) = {
    JsonRpcError(-32603, "Internal error", Option(data))
  }
}
