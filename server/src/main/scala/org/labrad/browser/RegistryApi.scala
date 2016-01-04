package org.labrad.browser

import org.labrad.data._
import org.labrad.util.Logging
import play.api.libs.json._
import scala.async.Async.{async, await}
import scala.collection.mutable
import scala.concurrent.{Await, ExecutionContext, Future}
import scala.concurrent.duration._


object RegistryApi {
  /**
   * Convert a path to an absolute path, by prepending an empty segment, if needed
   */
  def absPath(path: Seq[String]) = {
    path match {
      case Seq() => Seq("")
      case Seq("", rest @ _*) => path
      case path => "" +: path
    }
  }
}

/**
 * The contents of a registry directory, potentially including recursive subdirectory contents
 */
case class RegistryContents(dirs: Seq[(String, RegistryContents)], keys: Seq[(String, Data)])
object RegistryContents {
  val Empty = RegistryContents(dirs = Nil, keys = Nil)
}

/**
 * Contents of a single registry directory, not including any subdirectory contents.
 *
 * This is in a form suitable for encoding in JSON.
 */
case class RegistryListing(path: Seq[String], dirs: Seq[String], keys: Seq[String], vals: Seq[String])
object RegistryListing { implicit val format = Json.format[RegistryListing] }

class RegistryApi(cxn: LabradConnection, client: RegistryClientApi)(implicit ec: ExecutionContext) extends Logging {

  import RegistryApi._


  // registry utility functions

  private def startPacket(path: Seq[String], create: Boolean = false) = {
    val pkt = cxn.registry.packet()
    pkt.cd(absPath(path), create = create)
    pkt
  }

  private def regGetContents(path: Seq[String], recursive: Boolean = false): Future[RegistryContents] = async {
    // get directory listing
    val pkt = startPacket(path)
    val dirF = pkt.dir()
    pkt.send()

    val (dirsRaw, keysRaw) = await { dirF }
    val dirs = dirsRaw.sorted
    val keys = keysRaw.sorted

    val dirContents = if (recursive) {
      // recursively get contents of subdirectories
      val fs = dirs.map { dir =>
        regGetContents(path :+ dir, recursive = true)
      }
      await { Future.sequence(fs) }
    } else {
      // just use empty contents for each subdirectory
      Seq.fill(dirs.length) { RegistryContents.Empty }
    }

    val vals = if (keys.size == 0) {
      Seq()
    } else {
      // get the values of all keys
      val pkt = startPacket(path)
      val fs = keys.map(key => pkt.get(key))
      pkt.send()
      await { Future.sequence(fs) }
    }

    RegistryContents(dirs zip dirContents, keys zip vals)
  }

  private def regDir(path: Seq[String]): Future[RegistryListing] = async {
    val ans = await { regGetContents(path) }
    RegistryListing(path, ans.dirs.map(_._1), ans.keys.map(_._1), ans.keys.map(_._2.toString))
  }

  private def regDel(path: Seq[String], key: String): Future[Unit] = async {
    val pkt = startPacket(path)
    pkt.del(key)
    await { pkt.send() }
  }

  private def regRmdir(path: Seq[String], dir: String): Future[Unit] = async {
     // remove all subdirectories
    val subPath = path :+ dir
    val ls = await { regDir(subPath) }
    val subDirs = ls.dirs.map { subDir => regRmdir(subPath, subDir) }
    await { Future.sequence(subDirs) }

    // remove all keys
    if (ls.keys.size > 0) {
      val pkt = startPacket(subPath)
      for (key <- ls.keys)
        pkt.call("del", Str(key))
      await { pkt.send() }
    }

    // remove the directory itself
    val pkt = startPacket(path)
    pkt.rmDir(dir)
    await { pkt.send() }
  }

  private def regCopy(path: Seq[String], key: String, newPath: Seq[String], newKey: String): Future[Unit] = async {
    val p1 = startPacket(path)
    val dataF = p1.get(key)
    p1.send()
    val value = await { dataF }

    val p2 = startPacket(newPath)
    p2.set(newKey, value)
    await { p2.send() }
  }

  private def regPutContents(path: Seq[String], contents: RegistryContents): Future[Unit] = async {
    // recursively put subdirectory contents
    val dirPuts = contents.dirs.map { case (subdir, subContents) =>
      regMkDirIfNeeded(path, subdir).flatMap { _ =>
        regPutContents(path :+ subdir, subContents)
      }
    }
    await { Future.sequence(dirPuts) }

    // put keys in this directory
    val pkt = startPacket(path)
    for ((key, value) <- contents.keys) {
      pkt.set(key, value)
    }
    await { pkt.send() }
  }

  private def regMkDirIfNeeded(path: Seq[String], dir: String): Future[Unit] = async {
    val pkt = startPacket(path)
    val f = pkt.dir()
    pkt.send()
    val (dirs, keys) = await { f }
    if (!dirs.contains(dir)) {
      val pkt = startPacket(path)
      pkt.mkDir(dir)
      await { pkt.send() }
    }
  }

  /**
   * Copy the contents of a directory to a new path.
   *
   * The destination directory will be created if it does not yet exist.
   * To avoid problems with copying a directory to a path inside of itself,
   * we first recursively fetch the contents of the directory tree, and then
   * put those contents to the new location.
   */
  private def regCopyDir(path: Seq[String], dir: String, newPath: Seq[String], newDir: String): Future[Unit] = async {
    if (absPath(path) != absPath(newPath) || dir != newDir) {
      val contents = await { regGetContents(path :+ dir, recursive = true) }
      await { regMkDirIfNeeded(newPath, newDir) }
      await { regPutContents(newPath :+ newDir, contents) }
    }
  }

  private def regMove(path: Seq[String], key: String, newPath: Seq[String], newKey: String): Future[Unit] = async {
    if (absPath(path) != absPath(newPath) || newKey != key) {
      await { regCopy(path, key, newPath, newKey) }
      await { regDel(path, key) }
    }
  }

  private def regMoveDir(path: Seq[String], dir: String, newPath: Seq[String], newDir: String): Future[Unit] = async {
    if (absPath(path) != absPath(newPath) || newDir != dir) {
      await { regCopyDir(path, dir, newPath, newDir) }
      await { regRmdir(path, dir) }
    }
  }


  // callable RPCs

  def dumbEcho(inp: String): Future[String] = {
    cxn.get.send("manager", ("echo", Str(inp))).map { results => results(0).get[String] }
  }

  def dir(path: Seq[String]): Future[RegistryListing] = {
    regDir(path)
  }

  def set(path: Seq[String], key: String, value: String): Future[Unit] = {
    val data = Data.parse(value)
    val pkt = startPacket(path)
    pkt.set(key, data)
    pkt.send()
  }

  def del(path: Seq[String], key: String): Future[Unit] = {
    regDel(path, key)
  }

  def mkDir(path: Seq[String], dir: String): Future[Unit] = {
    val pkt = startPacket(path)
    pkt.mkDir(dir)
    pkt.send()
  }

  def rmDir(path: Seq[String], dir: String): Future[Unit] = {
    regRmdir(path, dir)
  }

  def copy(path: Seq[String], key: String, newPath: Seq[String], newKey: String): Future[Unit] = {
    regCopy(path, key, newPath, newKey)
  }

  def copyDir(path: Seq[String], dir: String, newPath: Seq[String], newDir: String): Future[Unit] = {
    regCopyDir(path, dir, newPath, newDir)
  }

  def rename(path: Seq[String], key: String, newKey: String): Future[Unit] = {
    regMove(path, key, path, newKey)
  }

  def renameDir(path: Seq[String], dir: String, newDir: String): Future[Unit] = {
    regMoveDir(path, dir, path, newDir)
  }

  def move(path: Seq[String], key: String, newPath: Seq[String], newKey: String): Future[Unit] = {
    regMove(path, key, newPath, newKey)
  }

  def moveDir(path: Seq[String], dir: String, newPath: Seq[String], newDir: String): Future[Unit] = {
    regMoveDir(path, dir, newPath, newDir)
  }


  def watch(path: Seq[String]): Unit = synchronized {
    try {
      val ctx = cxn.get.newContext
      val msgId = ctx.low
      nextMessageId += 1
      val listener: Listener = {
        case msg @ Message(src, `ctx`, `msgId`, Cluster(Str(name), Bool(isDir), Bool(addOrChange))) =>
          if (isDir) {
            if (addOrChange) client.dirChanged(path, name) else client.dirRemoved(path, name)
          } else {
            if (addOrChange) client.keyChanged(path, name) else client.keyRemoved(path, name)
          }
      }
      cxn.get.addMessageListener(listener)

      val reg = cxn.registry
      val pkt = reg.packet(ctx)
      pkt.cd(absPath(path))
      pkt.notifyOnChange(msgId, true)
      Await.result(pkt.send(), 10.seconds)

      watches += path -> Watch(ctx, msgId, listener)

    } catch {
      case e: Exception =>
        log.error(s"unable to watch path $path", e)
        throw e
    }

    Future(???)
  }

  def unwatch(path: Seq[String]): Unit = synchronized {
    for (watch <- watches.get(path)) {
      try {
        watches -= path

        val reg = cxn.registry
        val pkt = reg.packet(watch.context)
        pkt.notifyOnChange(watch.msgId, false)
        Await.result(pkt.send(), 10.seconds)

        cxn.get.removeMessageListener(watch.listener)
      } catch {
        case e: Exception =>
          log.error(s"unable to unwatch path $path", e)
          throw e
      }
    }
  }

  @volatile private var nextMessageId: Int = 1

  type Listener = PartialFunction[Message, Unit]
  case class Watch(context: Context, msgId: Long, listener: Listener)
  private val watches = mutable.Map.empty[Seq[String], Watch]
}

trait RegistryClientApi {
  def keyChanged(path: Seq[String], key: String): Unit
  def keyRemoved(path: Seq[String], key: String): Unit
  def dirChanged(path: Seq[String], dir: String): Unit
  def dirRemoved(path: Seq[String], dir: String): Unit
}
