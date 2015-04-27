package org.labrad.browser.server

import scala.collection.JavaConversions._

import java.util.concurrent.ExecutionException

import javax.inject.Singleton
import javax.servlet.ServletContext
import scala.concurrent.{Await, Future}
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration._

import org.labrad.PacketProxy
import org.labrad.browser.client.registry.{RegistryError, RegistryListing, RegistryService}
import org.labrad.data._

@Singleton
class RegistryServiceImpl extends AsyncServlet with RegistryService {

  private def getAbsPath(path: Array[String]) = "" +: path

  private def send(pkt: PacketProxy) = Await.result(pkt.send(), 10.seconds)

  private def oops(message: => String): PartialFunction[Throwable, Nothing] = {
    case e: InterruptedException =>
      throw new RuntimeException("Interrupted while " + message)
    case e: ExecutionException =>
      throw new RuntimeException("Error while " + message + ": " + e.getCause.getMessage)
  }

  /**
   * Create a new packet for the registry server.  The first thing
   * we do in all cases is to cd into the appropriate directory.
   * @param path
   * @param create
   * @return
   */
  private def startPacket(path: Array[String], create: Boolean = false) = {
    val absPath = getAbsPath(path)
    val pkt = LabradConnection.getRegistry.packet()
    pkt.cd(absPath, create = create)
    pkt
  }

  def getListing(path: Array[String]): RegistryListing = getListing(path, false)

  private def getListing(path: Array[String], create: Boolean): RegistryListing = {
    // get directory listing
    val pkt = startPacket(path)
    val idx = pkt.dir()
    try send(pkt) catch oops("getting listing")
    val (dirs, keys) = Await.result(idx, 10.seconds)

    val vals = if (keys.size == 0)
      Array.empty[String]
    else {
      // get the values of all keys
      val pkt = startPacket(path)
      val fs = keys.map(key => pkt.get(key))
      try send(pkt) catch oops("getting key values")
      val data = Await.result(Future.sequence(fs.toSeq), 10.seconds)
      data.map(_.toString).toArray
    }

    new RegistryListing(path, dirs.toArray, keys.toArray, vals)
  }

  /**
   * Set a key in the registry at a particular path.
   */
  def set(path: Array[String], key: String, value: String): RegistryListing = {
    val data = try Data.parse(value) catch oops("converting string value to data")
    set(path, key, data)
  }

  /**
   * Set a key in the registry at a particular path.
   */
  def set(path: Array[String], key: String, value: Data): RegistryListing = {
    val pkt = startPacket(path)
    pkt.set(key, value)

    try send(pkt) catch oops("setting key")

    getListing(path)
  }

  /**
   * Remove a key.
   */
  def del(path: Array[String], key: String) = {
    val pkt = startPacket(path)
    pkt.del(key)
    try send(pkt) catch oops("deleting key")
    getListing(path)
  }

  /**
   * Make a new directory.
   */
  def mkdir(path: Array[String], dir: String) = {
    val pkt = startPacket(path)
    pkt.mkDir(dir)
    try send(pkt) catch oops("creating directory")
    getListing(path)
  }

  /**
   * Remove a directory.
   */
  def rmdir(path: Array[String], dir: String) = {
    def doRmdir(path: Array[String], dir: String) {
       // remove all subdirectories
      val subPath = path :+ dir
      val ls = getListing(subPath)
      for (subDir <- ls.getDirs)
        doRmdir(subPath, subDir)

      // remove all keys
      if (ls.getKeys.size > 0) {
        val req = startPacket(subPath)
        for (key <- ls.getKeys)
          req.call("del", Str(key))
        send(req)
      }

      // remove the directory itself
      val pkt = startPacket(path)
      pkt.rmDir(dir)
      send(pkt)
    }

    try doRmdir(path, dir) catch oops("removing directory")
    getListing(path)
  }

  def copy(path: Array[String], key: String, newPath: Array[String], newKey: String) = {
    try {
      var pkt = startPacket(path)
      val dataF = pkt.get(key)
      send(pkt)
      val value = Await.result(dataF, 10.seconds)

      pkt = startPacket(newPath)
      pkt.set(newKey, value)
      send(pkt)
    } catch oops("copying key")
    getListing(newPath)
  }

  def copyDir(path: Array[String], dir: String, newPath: Array[String], newDir: String) = {
    def doCopyDir(path: Array[String], dir: String, newPath: Array[String], newDir: String) {

      // if newDir does not exist, create it
      val listing = getListing(newPath)
      if (!listing.getDirs.contains(newDir)) {
        mkdir(newPath, newDir)
      }

      val subpath = path :+ dir
      val newSubpath = newPath :+ newDir
      val subListing = getListing(subpath)

      // recursively copy all subdirectories
      for (subdir <- subListing.getDirs)
        doCopyDir(subpath, subdir, newSubpath, subdir)

      // copy all keys
      for (key <- subListing.getKeys)
        copy(subpath, key, newSubpath, key)
    }

    doCopyDir(path, dir, newPath, newDir)
    getListing(newPath)
  }

  def rename(path: Array[String], key: String, newKey: String) = move(path, key, path, newKey)

  def renameDir(path: Array[String], dir: String, newDir: String) = moveDir(path, dir, path, newDir)

  def move(path: Array[String], key: String, newPath: Array[String], newKey: String) = {
    if (!samePath(path, newPath) || newKey != key) {
      copy(path, key, newPath, newKey)
      del(path, key)
    }
    getListing(newPath)
  }

  def moveDir(path: Array[String], dir: String, newPath: Array[String], newDir: String) = {
    if (!samePath(path, newPath) || newDir != dir) {
      copyDir(path, dir, newPath, newDir)
      rmdir(path, dir)
    }
    getListing(newPath)
  }

  def watchRegistryPath(id: String, watchId: String, path: String): Unit = {
    val request = getThreadLocalRequest
    val session = request.getSession
    log(s"watchRegistryPath: session=${session.getId}, id=$id, path=$path")
//    val queue = ClientEventQueue.get(session, id).getOrElse {
//      sys.error(s"no ClientEventQueue found. session=${session.getId}, id=$id")
//    }
//    queue.watchRegistryPath(watchId, path)
  }

  def unwatchRegistryPath(id: String, watchId: String): Unit = {
    val request = getThreadLocalRequest
    val session = request.getSession
    log(s"unwatchRegistryPath: session=${session.getId}, id=$id, watchId=$watchId")
//    val queue = ClientEventQueue.get(session, id).getOrElse {
//      sys.error(s"no ClientEventQueue found. session=${session.getId}, id=$id")
//    }
//    queue.unwatchRegistryPath(watchId)
  }

  private def samePath(a: Array[String], b: Array[String]) = getAbsPath(a).toSeq == getAbsPath(b).toSeq
}
