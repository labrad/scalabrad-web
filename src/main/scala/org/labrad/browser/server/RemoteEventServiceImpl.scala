package org.labrad.browser.server

import java.util.{List, ArrayList}

import javax.inject.Singleton

import org.labrad.browser.client.event.RemoteEventService
import org.labrad.util.Logging
import org.eclipse.jetty.continuation.{Continuation, ContinuationSupport}

import com.google.gwt.event.shared.GwtEvent

@Singleton
class RemoteEventServiceImpl extends AsyncServlet with RemoteEventService with Logging {

  val DELAY_MILLIS = 10000

  /**
   * Connect a new client that will be notified of messages
   */
  def connect(id: String): Unit = {
    val request = getThreadLocalRequest
    val session = request.getSession
    ClientEventQueue.connectClient(session, id)
  }

  /**
   * Disconnect a client and stop holding messages for them
   */
  def disconnect(id: String) {
    val request = getThreadLocalRequest
    val session = request.getSession
    ClientEventQueue.disconnectClient(session, id)
  }

  /**
   * Get the events that have been queued since the last time we checked
   */
  def getEvents(id: String): Array[GwtEvent[_]] = {
    val request = getThreadLocalRequest
    val session = request.getSession
    ClientEventQueue.get(session, id) match {
      case None =>
        log.info(s"getEvents: no ClientEventQueue. session=${session.getId} id=$id")
        sys.error("invalid event queue id")

      case Some(queue) =>
        queue synchronized {
          val events = queue.getEvents

          val continuation = ContinuationSupport.getContinuation(request)
          if (events.isEmpty && continuation.isInitial) {
            queue.setContinuation(continuation)
            continuation.setTimeout(DELAY_MILLIS)
            continuation.suspend()
            continuation.undispatch()
          }
          queue.clearContinuation()

          events
        }
    }
  }
}
