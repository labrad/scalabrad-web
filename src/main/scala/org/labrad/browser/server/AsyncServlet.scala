/*
 * Copyright 2006 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
package org.labrad.browser.server

import java.io.IOException

import javax.servlet.{ServletContext, ServletException, ServletRequest}
import javax.servlet.http.HttpServletRequest

import scala.concurrent.{Await, ExecutionContext, Future}
import scala.concurrent.duration._

import com.google.gwt.user.server.rpc.{RemoteServiceServlet, UnexpectedException}
import org.eclipse.jetty.continuation.{Continuation, ContinuationSupport}

object AsyncServlet {
  val CONTINUATION_THROWABLE = "org.eclipse.jetty.continuation.ContinuationThrowable"
  val PAYLOAD = "com.google.gwt.payload"
  val FUTURE = "org.labrad.browser.AsyncServlet.FUTURE"
}

/**
 * Jetty Continuation support for GWT RPC.
 *
 * @author Craig Day (craig@alderaan.com.au)
 */
class AsyncServlet extends RemoteServiceServlet {
  import AsyncServlet._

  implicit def servletContext: ServletContext = getServletConfig.getServletContext
  implicit def servletRequest: ServletRequest = getThreadLocalRequest

  protected def future[A](f: => Future[A])(implicit executor: ExecutionContext): A = {
    val request = getThreadLocalRequest
    val future = request.getAttribute(FUTURE) match {
      case null =>
        val future = f
        request.setAttribute(FUTURE, future)
        if (!future.isCompleted) {
          // set up a continuation
          val continuation = ContinuationSupport.getContinuation(request)
          future.onComplete {
            case _ => continuation.resume()
          }
          continuation.suspend()
          continuation.undispatch()
        }
        future

      case future: Future[_] =>
        future.asInstanceOf[Future[A]]
    }
    Await.result(future, 10.millis)
  }

  /* ------------------------------------------------------------ */
  /* (non-Javadoc)
   * @see com.google.gwt.user.server.rpc.RemoteServiceServlet#readContent(javax.servlet.http.HttpServletRequest)
   */
  override protected def readContent(request: HttpServletRequest) = request.getAttribute(PAYLOAD) match {
    case payload: String =>
      payload
    case _ =>
      val payload = super.readContent(request)
      request.setAttribute(PAYLOAD, payload)
      payload
  }


  /**
   * Overridden to really throw Jetty RetryRequest Exception (as opposed to sending failure to client).
   *
   * @param caught the exception
   */
  override protected def doUnexpectedFailure(caught: Throwable) {
    throwIfRetryRequest(caught)
    super.doUnexpectedFailure(caught)
  }

  /**
   * Throws the Jetty RetryRequest if found.
   *
   * @param caught the exception
   */
  protected def throwIfRetryRequest(caught: Throwable) {
    val ex = caught match {
      case caught: UnexpectedException => caught.getCause
      case caught => caught
    }
    if (CONTINUATION_THROWABLE == ex.getClass.getName)
      throw ex
  }
}
