package org.labrad.browser

import javax.inject._
import org.labrad.data._
import play.api.libs.concurrent.Execution.Implicits.defaultContext
import play.api.libs.json._
import play.api.mvc._
import scala.async.Async.{async, await}
import scala.concurrent.Future


object RegistryController {
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


class RegistryController @Inject() (cxnHolder: LabradConnectionHolder) extends Controller with JsonRpc {

  import RegistryController._

  // json request/response types
  case class RegistryListing(path: Seq[String], dirs: Seq[String], keys: Seq[String], vals: Seq[String])
  object RegistryListing { implicit val format = Json.format[RegistryListing] }

  case class Set(path: Seq[String], key: String, value: String)
  object Set { implicit val format = Json.format[Set] }

  case class Del(path: Seq[String], key: String)
  object Del { implicit val format = Json.format[Del] }

  case class MkDir(path: Seq[String], dir: String)
  object MkDir { implicit val format = Json.format[MkDir] }

  case class RmDir(path: Seq[String], dir: String)
  object RmDir { implicit val format = Json.format[RmDir] }

  case class Copy(path: Seq[String], key: String, newPath: Seq[String], newKey: String)
  object Copy { implicit val format = Json.format[Copy] }

  case class CopyDir(path: Seq[String], dir: String, newPath: Seq[String], newDir: String)
  object CopyDir { implicit val format = Json.format[CopyDir] }

  case class Rename(path: Seq[String], key: String, newKey: String)
  object Rename { implicit val format = Json.format[Rename] }

  case class RenameDir(path: Seq[String], dir: String, newDir: String)
  object RenameDir { implicit val format = Json.format[RenameDir] }

  case class Move(path: Seq[String], key: String, newPath: Seq[String], newKey: String)
  object Move { implicit val format = Json.format[Move] }

  case class MoveDir(path: Seq[String], dir: String, newPath: Seq[String], newDir: String)
  object MoveDir { implicit val format = Json.format[MoveDir] }

  case class Watch(id: String, watchId: String, path: String)
  object Watch { implicit val format = Json.format[Watch] }

  case class Unwatch(id: String, watchId: String)
  object Unwatch { implicit val format = Json.format[Unwatch] }


  // registry utility functions

  private def startPacket(path: Seq[String], create: Boolean = false) = {
    val pkt = cxnHolder.cxn.registry.packet()
    pkt.cd(absPath(path), create = create)
    pkt
  }

  private def regDir(path: Seq[String]): Future[RegistryListing] = {
    // get directory listing
    val pkt = startPacket(path)
    val dirF = pkt.dir()
    pkt.send()
    dirF.flatMap { case (dirsRaw, keysRaw) =>

      val dirs = dirsRaw.sorted
      val keys = keysRaw.sorted

      val valsF = if (keys.size == 0) {
        Future.successful(Seq.empty[String])
      } else {
        // get the values of all keys
        val pkt = startPacket(path)
        val fs = keys.map(key => pkt.get(key))
        pkt.send()
        Future.sequence(fs)
      }

      valsF.map { vals =>
        RegistryListing(path, dirs, keys, vals.map(_.toString))
      }
    }
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

  private def regCopyDir(path: Seq[String], dir: String, newPath: Seq[String], newDir: String): Future[Unit] = async {
    // if newDir does not exist, create it
    val listing = await { regDir(newPath) }
    if (!listing.dirs.contains(newDir)) {
      val pkt = startPacket(path)
      pkt.mkDir(newDir)
      await { pkt.send() }
    }

    val subpath = path :+ dir
    val newSubpath = newPath :+ newDir
    val subListing = await { regDir(subpath) }

    // recursively copy all subdirectories
    val dirCopies = subListing.dirs.map { subdir =>
      regCopyDir(subpath, subdir, newSubpath, subdir)
    }
    await { Future.sequence(dirCopies) }

    // copy all keys
    val keyCopies = subListing.keys.map { key =>
      regCopy(subpath, key, newSubpath, key)
    }
    await { Future.sequence(keyCopies) }
  }

  private def regMove(path: Seq[String], key: String, newPath: Seq[String], newKey: String): Future[RegistryListing] = async {
    if (absPath(path) != absPath(newPath) || newKey != key) {
      await { regCopy(path, key, newPath, newKey) }
      await { regDel(path, key) }
    }
    await { regDir(newPath) }
  }

  private def regMoveDir(path: Seq[String], dir: String, newPath: Seq[String], newDir: String): Future[RegistryListing] = async {
    if (absPath(path) != absPath(newPath) || newDir != dir) {
      await { regCopyDir(path, dir, newPath, newDir) }
      await { regRmdir(path, dir) }
    }
    await { regDir(newPath) }
  }



  // callable RPCs

  def dir = rpc[Seq[String], RegistryListing] { path =>
    regDir(path)
  }

  def set = rpc[Set, RegistryListing] { case Set(path, key, value) =>
    val data = Data.parse(value)
    val pkt = startPacket(path)
    pkt.set(key, data)
    async {
      await { pkt.send() }
      await { regDir(path) }
    }
  }

  def del = rpc[Del, RegistryListing] { case Del(path, key) =>
    async {
      await { regDel(path, key) }
      await { regDir(path) }
    }
  }

  def mkdir = rpc[MkDir, RegistryListing] { case MkDir(path, dir) =>
    val pkt = startPacket(path)
    pkt.mkDir(dir)
    async {
      await { pkt.send() }
      await { regDir(path) }
    }
  }

  def rmdir = rpc[RmDir, RegistryListing] { case RmDir(path, dir) =>
    async {
      await { regRmdir(path, dir) }
      await { regDir(path) }
    }
  }

  def copy = rpc[Copy, RegistryListing] { case Copy(path, key, newPath, newKey) =>
    async {
      await { regCopy(path, key, newPath, newKey) }
      await { regDir(newPath) }
    }
  }

  def copyDir = rpc[CopyDir, RegistryListing] { case CopyDir(path, dir, newPath, newDir) =>
    async {
      await { regCopyDir(path, dir, newPath, newDir) }
      await { regDir(newPath) }
    }
  }

  def rename = rpc[Rename, RegistryListing] { case Rename(path, key, newKey) =>
    regMove(path, key, path, newKey)
  }

  def renameDir = rpc[RenameDir, RegistryListing] { case RenameDir(path, dir, newDir) =>
    regMoveDir(path, dir, path, newDir)
  }

  def move = rpc[Move, RegistryListing] { case Move(path, key, newPath, newKey) =>
    regMove(path, key, newPath, newKey)
  }

  def moveDir = rpc[MoveDir, RegistryListing] { case MoveDir(path, dir, newPath, newDir) =>
    regMoveDir(path, dir, newPath, newDir)
  }

  def watch = rpc[Watch, String] { case Watch(id, watchId, path) =>
    ???
  }

  def unwatch = rpc[Unwatch, String] { case Unwatch(id, watchId) =>
    ???
  }
}
