package org.labrad.browser

import io.netty.util.concurrent.{Future => NettyFuture, GenericFutureListener}
import scala.concurrent.{ExecutionContext, Future, Promise}

object Futures {

  /**
   * Implicit wrapper that adds a method to Netty futures which will convert
   * them to scala futures.
   */
  implicit class RichNettyFuture[A](nf: NettyFuture[A]) {
    def toScala(implicit ec: ExecutionContext): Future[A] = {
      val promise = Promise[A]
      nf.addListener(new GenericFutureListener[NettyFuture[A]] {
        def operationComplete(nf: NettyFuture[A]) {
          if (nf.isSuccess) {
            promise.success(nf.getNow)
          } else {
            promise.failure(nf.cause)
          }
        }
      })
      promise.future
    }
  }
}
