package org.labrad.browser

import play.api.libs.json._

package object jsonrpc {

  type Id = Either[Long, String]
  type Params = Either[Seq[JsValue], Map[String, JsValue]]

  /**
   * Allow reading and writing Either values to json, provided we have formats
   * for the left and right types of the Either themselves. This allows us to
   * handle json rpc message parts which can be different types, such as Id
   * which can be an integer or string, and Params which can be positional (Seq)
   * or named (Map).
   */
  implicit def eitherFormat[A, B](implicit aFmt: Format[A], bFmt: Format[B]): Format[Either[A, B]] = {
    new Format[Either[A, B]] {
      def reads(json: JsValue): JsResult[Either[A, B]] = {
        aFmt.reads(json) match {
          case JsSuccess(a, path) =>
            JsSuccess(Left(a), path)

          case JsError(aErrors) =>
            bFmt.reads(json) match {
              case JsSuccess(b, path) =>
                JsSuccess(Right(b), path)

              case JsError(bErrors) =>
                JsError(aErrors ++ bErrors)
            }
        }
      }

      def writes(o: Either[A, B]): JsValue = {
        o match {
          case Left(a) => Json.toJson(a)
          case Right(b) => Json.toJson(b)
        }
      }
    }
  }
}
