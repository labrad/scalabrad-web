package org.labrad.browser

import org.joda.time.DateTime
import org.labrad._
import org.labrad.data._
import play.api.libs.json._
import scala.concurrent.{ExecutionContext, Future}


trait VaultServer extends Requester {
  private def strSeq(strs: Seq[String]): Data = Arr(strs.map(Str(_)))

  def dir(tagFilters: Seq[String] = Seq("-trash")): Future[(Seq[String], Seq[String])] =
    call[(Seq[String], Seq[String])]("dir", strSeq(tagFilters))
  def dirWithTags(tagFilters: Seq[String] = Seq("-trash")): Future[(Seq[(String, Seq[String])], Seq[(String, Seq[String])])] =
    call[(Seq[(String, Seq[String])], Seq[(String, Seq[String])])]("dir", strSeq(tagFilters), Bool(false))

  def cd(dir: String): Future[Seq[String]] = call[Seq[String]]("cd", Str(dir))
  def cd(dir: Seq[String]): Future[Seq[String]] = call[Seq[String]]("cd", strSeq(dir))

  def open(name: String): Future[(Seq[String], String)] = call[(Seq[String], String)]("open", Str(name))
  def open(num: Int): Future[(Seq[String], String)] = call[(Seq[String], String)]("open", UInt(num))

  def get(): Future[Array[Array[Double]]] = call[Array[Array[Double]]]("get")
  def get(limit: Int, startOver: Boolean = false): Future[Array[Array[Double]]] =
    call[Array[Array[Double]]]("get", UInt(limit), Bool(startOver))

  def variables(): Future[(Seq[(String, String)], Seq[(String, String, String)])] =
    call[(Seq[(String, String)], Seq[(String, String, String)])]("variables")

  def getName(): Future[String] = call[String]("get name")

  def parameters(): Future[Seq[String]] = call[Seq[String]]("parameters")

  def getParameter(name: String, caseSensitive: Boolean = true): Future[Data] = call("get parameter", Str(name), Bool(caseSensitive))
  def getParameters(): Future[Map[String, Data]] = call("get parameters").map { result =>
    if (result.isNone) {
      Map.empty
    } else {
      result.clusterIterator.map { _.get[(String, Data)] }.toMap
    }
  }

  implicit val dateTimeGetter = new Getter[DateTime] {
    def get(data: Data): DateTime = data.getTime.toDateTime
  }

  def getComments(limit: Int, startOver: Boolean = false): Future[Seq[(DateTime, String, String)]] =
    call[Seq[(DateTime, String, String)]]("get comments")

  def getTags(dirs: Seq[String] = Nil, datasets: Seq[String] = Nil): Future[(Seq[(String, Seq[String])], Seq[(String, Seq[String])])] =
    call[(Seq[(String, Seq[String])], Seq[(String, Seq[String])])]("get tags", strSeq(dirs), strSeq(datasets))

  def updateTags(tags: Seq[String], dirs: Seq[String] = Nil, datasets: Seq[String] = Nil): Future[Unit] =
    callUnit("update tags", strSeq(tags), strSeq(dirs), strSeq(datasets))
}

class VaultServerProxy(cxn: Connection, name: String = "Data Vault", context: Context = Context(0, 0))
extends ServerProxy(cxn, name, context) with VaultServer {
  def packet(ctx: Context = context) = new VaultServerPacket(this, ctx)
}

class VaultServerPacket(server: ServerProxy, ctx: Context)
extends PacketProxy(server, ctx) with VaultServer


// json request/response types
case class VaultListing(path: Seq[String], dirs: Seq[String], datasets: Seq[String])
object VaultListing { implicit val format = Json.format[VaultListing] }

case class DatasetInfo(path: Seq[String], name: String, num: Int, independents: Seq[String], dependents: Seq[String], params: Map[String, String])
object DatasetInfo { implicit val format = Json.format[DatasetInfo] }


object VaultApi {
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

class VaultApi(cxn: LabradConnection)(implicit ec: ExecutionContext) {

  import VaultApi._

  // vault utility functions

  private def startPacket(path: Seq[String]) = {
    val dv = new VaultServerProxy(cxn.get)
    val pkt = dv.packet()
    pkt.cd(absPath(path))
    pkt
  }

  private def dvDir(path: Seq[String]): Future[VaultListing] = {
    // get directory listing
    val pkt = startPacket(path)
    val dirF = pkt.dir()
    pkt.send()
    dirF.map { case (dirsRaw, datasetsRaw) =>

      val dirs = dirsRaw.sorted
      val datasets = datasetsRaw.sorted

      VaultListing(path, dirs, datasets)
    }
  }


  // callable RPCs

  def dir(path: Seq[String]): Future[VaultListing] = {
    dvDir(path).map { result =>
      result
    }
  }

  def datasetInfo(path: Seq[String], dataset: Either[String, Int]): Future[DatasetInfo] = {
    val p = startPacket(path)
    val openF = dataset match {
      case Left(name) => p.open(name)
      case Right(num) => p.open(num)
    }
    val varsF = p.variables()
    val paramsF = p.getParameters()

    p.send()

    for {
      (path, name) <- openF
      (indeps, deps) <- varsF
      params <- paramsF
    } yield {
      val num = name.split(" - ")(0).toInt
      val paramStrs = params.mapValues(_.toString)
      DatasetInfo(path, name, num, indeps.map(_._1), deps.map(_._1), paramStrs)
    }
  }

  def data(path: Seq[String], dataset: Either[String, Int]): Future[Array[Array[Double]]] = {
    val p = startPacket(path)
    dataset match {
      case Left(name) => p.open(name)
      case Right(num) => p.open(num)
    }
    val dataF = p.get()

    p.send()

    dataF
  }
}
