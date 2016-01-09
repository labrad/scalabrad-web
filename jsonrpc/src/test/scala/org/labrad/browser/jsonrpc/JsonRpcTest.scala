package org.labrad.browser.jsonrpc

import org.labrad.browser.jsonrpc._
import org.scalatest.FunSuite
import play.api.libs.json._
import scala.concurrent.Future

class TestApi {
  def foo(a: Int, b: Boolean = true): Unit = {
    ()
  }
}

class JsonRpcTest extends FunSuite {
  test("can route to methods with default values") {
    val testApi = new TestApi
    val routes = JsonRpc.routes("""
      CALL  test.foo  testApi.foo
    """)
  }
}
