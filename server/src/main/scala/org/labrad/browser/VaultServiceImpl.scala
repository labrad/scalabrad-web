package org.labrad.browser

import javax.inject.Inject
import org.labrad._
import org.labrad.data._
import play.api.libs.json._
import play.api.mvc._
import scala.async.Async.{async, await}
import scala.concurrent.{Await, Future}
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration._


trait VaultServer extends Requester {
  def dir(): Future[(Seq[String], Seq[String])] =
    call("dir").map { _.get[(Seq[String], Seq[String])] }

  def cd(dir: String): Future[Seq[String]] = call("cd", Str(dir)).map { _.get[Seq[String]] }
  def cd(dir: Seq[String]): Future[Seq[String]] = call("cd", Arr(dir.map(Str(_)))).map { _.get[Seq[String]] }
}

class VaultServerProxy(cxn: Connection, name: String = "Data Vault", context: Context = Context(0, 0))
extends ServerProxy(cxn, name, context) with VaultServer {
  def packet(ctx: Context = context) = new VaultServerPacket(this, ctx)
}

class VaultServerPacket(server: ServerProxy, ctx: Context)
extends PacketProxy(server, ctx) with VaultServer


object VaultController {
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


class VaultController @Inject() (cxnHolder: LabradConnectionHolder) extends Controller {

  import VaultController._

  // json request/response types
  case class VaultListing(path: Seq[String], dirs: Seq[String], datasets: Seq[String])
  object VaultListing { implicit val format = Json.format[VaultListing] }


  // vault utility functions

  private def startPacket(path: Seq[String]) = {
    val dv = new VaultServerProxy(cxnHolder.cxn.get)
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


  // json rpc

  private def rpc[A: Reads, B: Writes](f: A => Future[B]) = Action.async(BodyParsers.parse.json) { request =>
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

  def dir = rpc[Seq[String], VaultListing] { path =>
    println(path)
    dvDir(path).map { result =>
      println(result)
      result
    }
  }

//  def getDatasetInfo(path: Array[String], dataset: String): DatasetInfo =
//    getDatasetInfo(path, Str(dataset))
//
//  def getDatasetInfo(path: Array[String], dataset: Int): DatasetInfo =
//    getDatasetInfo(path, UInt(dataset.toLong))
//
//  private def getDatasetInfo(path: Array[String], identifier: Data): DatasetInfo = {
//    val req = LabradConnection.to("Data Vault").packet()
//    req.call("cd", Arr(sanitizePath(path)))
//    val fOpen = req.call("open", identifier)
//    val fVars = req.call("variables")
//    val fParams = req.call("get parameters")
//
//    try {
//      req.send
//      val open = Await.result(fOpen, 10.seconds)
//      val vars = Await.result(fVars, 10.seconds)
//      val params = Await.result(fParams, 10.seconds)
//      parseDatasetInfo(open, vars, params)
//    } catch catcher
//  }
//
//  private def parseDatasetInfo(open: Data, vars: Data, params: Data) = {
//    val path = open(0).get[Array[String]]
//    val name = open(1).get[String]
//    val num = name.substring(0, 5).toInt
//
//    val indeps = Array.tabulate(vars(0).arraySize)(vars(0, _, 0).getString)
//    val deps = Array.tabulate(vars(1).arraySize)(vars(1, _, 0).getString)
//
//    val paramMap = new HashMap[String, String]
//    if (params.isCluster) { // might be Empty if there are no params
//      for (Cluster(Str(key), value) <- params.clusterIterator) yield {
//        paramMap.put(key, value.toString)
//      }
//    }
//    new DatasetInfo(path, name, num, indeps, deps, paramMap)
//  }
//
//  def getData(path: Array[String], dataset: String) =
//    parseData(path, Str(dataset))
//
//  def getData(path: Array[String], dataset: Int) =
//    parseData(path, UInt(dataset.toLong))
//
//  private def parseData(path: Array[String], identifier: Data) = {
//    val req = LabradConnection.to("Data Vault").packet()
//    req.call("cd", Arr(sanitizePath(path)))
//    req.call("open", identifier)
//    val idx = req.call("get")
//
//    val answer = try {
//      req.send
//      Await.result(idx, 10.seconds)
//    } catch catcher
//
//    val Array(rows, cols) = answer.arrayShape
//    Array.tabulate[Double](rows, cols) { answer(_, _).getValue }
//  }
}
