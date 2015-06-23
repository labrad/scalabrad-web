package org.labrad.browser

import play.api.libs.concurrent.Execution.Implicits.defaultContext
import play.api.libs.json._
import play.api.mvc._
import scala.concurrent.Future

trait JsonRpc { self: Controller =>

  def rpc[A: Reads, B: Writes](f: A => Future[B]) = Action.async(BodyParsers.parse.json) { request =>
    val originOpt = request.headers.get("Origin")
    val a = request.body.as[A]
    f(a).map { b =>
      val headers = Seq.newBuilder[(String, String)]
      for (origin <- originOpt) {
        headers += "Access-Control-Allow-Origin" -> origin
      }
      Ok(Json.toJson(b)).withHeaders(headers.result: _*)
    }
  }
}
