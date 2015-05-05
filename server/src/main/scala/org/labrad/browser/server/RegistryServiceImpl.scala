package org.labrad.browser.server

import com.fasterxml.jackson.databind.ObjectMapper
import java.util.{List => JList}
import java.util.concurrent.ExecutionException
import javax.ws.rs.GET
import javax.ws.rs.Path
import javax.ws.rs.PathParam
import javax.ws.rs.POST
import javax.ws.rs.QueryParam
import javax.ws.rs.core.Context
import org.labrad.PacketProxy
import org.labrad.browser.client.registry.RegistryListing
import org.labrad.data._
import scala.collection.JavaConverters._
import scala.concurrent.{Await, Future}
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration._

@Path("/registry")
class RegistryService extends Resource {

  private def getAbsPath(path: Seq[String]) = "" +: path

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
  private def startPacket(path: Seq[String], create: Boolean = false) = {
    val absPath = getAbsPath(path)
    val pkt = LabradConnection.getRegistry.packet()
    pkt.cd(absPath, create = create)
    pkt
  }

  @Path("/dir")
  @GET
  def listDir(
    @QueryParam("path") path: JList[String]
  ): String = {
    mapper.writeValueAsString(getListing(path.asScala))
  }

  private def getListing(path: Seq[String], create: Boolean = false): RegistryListing = {
    // get directory listing
    val pkt = startPacket(path)
    val idx = pkt.dir()
    try send(pkt) catch oops("getting listing")
    val (dirs, keys) = Await.result(idx, 10.seconds)

    val vals = if (keys.size == 0)
      Seq.empty[String]
    else {
      // get the values of all keys
      val pkt = startPacket(path)
      val fs = keys.map(key => pkt.get(key))
      try send(pkt) catch oops("getting key values")
      val data = Await.result(Future.sequence(fs.toSeq), 10.seconds)
      data.map(_.toString)
    }

    new RegistryListing(path.toSeq.asJava, dirs.asJava, keys.asJava, vals.asJava)
  }

  /**
   * Set a key in the registry at a particular path.
   */
  @Path("/set")
  @POST
  def set(
    @QueryParam("path") path: JList[String],
    @QueryParam("key") key: String,
    @QueryParam("value") value: String
  ): String = {
    val data = try Data.parse(value) catch oops("converting string value to data")
    mapper.writeValueAsString(set(path.asScala, key, data))
  }

  /**
   * Set a key in the registry at a particular path.
   */
  private def set(path: Seq[String], key: String, value: Data): RegistryListing = {
    val pkt = startPacket(path)
    pkt.set(key, value)

    try send(pkt) catch oops("setting key")

    getListing(path)
  }

  /**
   * Remove a key.
   */
  @Path("/del")
  @POST
  def del(
    @QueryParam("path") path: JList[String],
    @QueryParam("key") key: String
  ): String = {
    val pkt = startPacket(path.asScala)
    pkt.del(key)
    try send(pkt) catch oops("deleting key")
    listDir(path)
  }

  /**
   * Make a new directory.
   */
  @Path("/mkdir")
  @POST
  def mkdir(
    @QueryParam("path") path: JList[String],
    @QueryParam("dir") dir: String
  ): String = {
    val pkt = startPacket(path.asScala)
    pkt.mkDir(dir)
    try send(pkt) catch oops("creating directory")
    listDir(path)
  }

  /**
   * Remove a directory.
   */
  @Path("/rmdir")
  @POST
  def rmdir(
    @QueryParam("path") path: JList[String],
    @QueryParam("dir") dir: String
  ): String = {
    def doRmdir(path: Seq[String], dir: String) {
       // remove all subdirectories
      val subPath = path :+ dir
      val ls = getListing(subPath)
      for (subDir <- ls.dirs.asScala)
        doRmdir(subPath, subDir)

      // remove all keys
      if (ls.keys.size > 0) {
        val req = startPacket(subPath)
        for (key <- ls.keys.asScala)
          req.call("del", Str(key))
        send(req)
      }

      // remove the directory itself
      val pkt = startPacket(path)
      pkt.rmDir(dir)
      send(pkt)
    }

    try doRmdir(path.asScala, dir) catch oops("removing directory")
    listDir(path)
  }

  @Path("/copy")
  @POST
  def copy(
    @QueryParam("path") path: JList[String],
    @QueryParam("key") key: String,
    @QueryParam("newPath") newPath: JList[String],
    @QueryParam("newKey") newKey: String
  ): String = {
    try {
      var pkt = startPacket(path.asScala)
      val dataF = pkt.get(key)
      send(pkt)
      val value = Await.result(dataF, 10.seconds)

      pkt = startPacket(newPath.asScala)
      pkt.set(newKey, value)
      send(pkt)
    } catch oops("copying key")
    listDir(newPath)
  }

  @Path("/copyDir")
  @POST
  def copyDir(
    @QueryParam("path") path: JList[String],
    @QueryParam("dir") dir: String,
    @QueryParam("newPath") newPath: JList[String],
    @QueryParam("newDir") newDir: String
  ): String = {
    def doCopyDir(path: Seq[String], dir: String, newPath: Seq[String], newDir: String) {

      // if newDir does not exist, create it
      val listing = getListing(newPath)
      if (!listing.dirs.contains(newDir)) {
        mkdir(newPath.asJava, newDir)
      }

      val subpath = path :+ dir
      val newSubpath = newPath :+ newDir
      val subListing = getListing(subpath)

      // recursively copy all subdirectories
      for (subdir <- subListing.dirs.asScala)
        doCopyDir(subpath, subdir, newSubpath, subdir)

      // copy all keys
      for (key <- subListing.keys.asScala)
        copy(subpath.asJava, key, newSubpath.asJava, key)
    }

    doCopyDir(path.asScala, dir, newPath.asScala, newDir)
    listDir(newPath)
  }

  @Path("/rename")
  @POST
  def rename(
    @QueryParam("path") path: JList[String],
    @QueryParam("key") key: String,
    @QueryParam("newKey") newKey: String
  ): String = move(path, key, path, newKey)

  @Path("/renameDir")
  @POST
  def renameDir(
    @QueryParam("path") path: JList[String],
    @QueryParam("dir") dir: String,
    @QueryParam("newDir") newDir: String
  ): String = moveDir(path, dir, path, newDir)

  @Path("/move")
  @POST
  def move(
    @QueryParam("path") path: JList[String],
    @QueryParam("key") key: String,
    @QueryParam("newPath") newPath: JList[String],
    @QueryParam("newKey") newKey: String
  ): String = {
    if (!samePath(path.asScala, newPath.asScala) || newKey != key) {
      copy(path, key, newPath, newKey)
      del(path, key)
    }
    listDir(newPath)
  }

  @Path("/moveDir")
  @POST
  def moveDir(
    @QueryParam("path") path: JList[String],
    @QueryParam("dir") dir: String,
    @QueryParam("newPath") newPath: JList[String],
    @QueryParam("newDir") newDir: String
  ): String = {
    if (!samePath(path.asScala, newPath.asScala) || newDir != dir) {
      copyDir(path, dir, newPath, newDir)
      rmdir(path, dir)
    }
    listDir(newPath)
  }

  @Path("/watch")
  @POST
  def watchRegistryPath(
    @QueryParam("id") id: String,
    @QueryParam("watchId") watchId: String,
    @QueryParam("path") path: String
  ): Unit = {
//    val request = getThreadLocalRequest
//    val session = request.getSession
//    log(s"watchRegistryPath: session=${session.getId}, id=$id, path=$path")
//    val queue = ClientEventQueue.get(session, id).getOrElse {
//      sys.error(s"no ClientEventQueue found. session=${session.getId}, id=$id")
//    }
//    queue.watchRegistryPath(watchId, path)
  }

  @Path("/unwatch")
  @POST
  def unwatchRegistryPath(
    @QueryParam("id") id: String,
    @QueryParam("watchId") watchId: String
  ): Unit = {
//    val request = getThreadLocalRequest
//    val session = request.getSession
//    log(s"unwatchRegistryPath: session=${session.getId}, id=$id, watchId=$watchId")
//    val queue = ClientEventQueue.get(session, id).getOrElse {
//      sys.error(s"no ClientEventQueue found. session=${session.getId}, id=$id")
//    }
//    queue.unwatchRegistryPath(watchId)
  }

  private def samePath(a: Seq[String], b: Seq[String]) = getAbsPath(a) == getAbsPath(b)
}
