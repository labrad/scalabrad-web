package org.labrad.browser.server

import java.util.HashMap
import javax.inject.Singleton
import javax.servlet.ServletContext
import scala.concurrent.Await
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration._

import org.labrad.browser.client.grapher.{DatasetInfo, DirectoryListing, VaultException, VaultService}
import org.labrad.data._

@Singleton
class VaultServiceImpl extends AsyncServlet with VaultService {

  private def sanitizePath(path: Array[String]) = {
    if (path.size == 0 || path(0) != "") {
      "" +: path
    } else {
      path
    }
  }

  private val catcher: PartialFunction[Throwable, Nothing] = {
    case e: Exception =>
      throw new VaultException(e.toString)
  }

  def getListing(path: Array[String]) = {
    val pkt = LabradConnection.to("Data Vault").packet()
    pkt.call("cd", Arr(sanitizePath(path)))
    val dir = pkt.call("dir")
    pkt.send
    try {
      val answer = Await.result(dir, 10.seconds)
      val dirs = answer(0).get[Array[String]]
      val datasets = answer(1).get[Array[String]]
      new DirectoryListing(dirs, datasets)
    } catch catcher
  }

  def getDatasetInfo(path: Array[String], dataset: String): DatasetInfo =
    getDatasetInfo(path, Str(dataset))

  def getDatasetInfo(path: Array[String], dataset: Int): DatasetInfo =
    getDatasetInfo(path, UInt(dataset.toLong))

  private def getDatasetInfo(path: Array[String], identifier: Data): DatasetInfo = {
    val req = LabradConnection.to("Data Vault").packet()
    req.call("cd", Arr(sanitizePath(path)))
    val fOpen = req.call("open", identifier)
    val fVars = req.call("variables")
    val fParams = req.call("get parameters")

    try {
      req.send
      val open = Await.result(fOpen, 10.seconds)
      val vars = Await.result(fVars, 10.seconds)
      val params = Await.result(fParams, 10.seconds)
      parseDatasetInfo(open, vars, params)
    } catch catcher
  }

  private def parseDatasetInfo(open: Data, vars: Data, params: Data) = {
    val path = open(0).get[Array[String]]
    val name = open(1).get[String]
    val num = name.substring(0, 5).toInt

    val indeps = Array.tabulate(vars(0).arraySize)(vars(0, _, 0).getString)
    val deps = Array.tabulate(vars(1).arraySize)(vars(1, _, 0).getString)

    val paramMap = new HashMap[String, String]
    if (params.isCluster) { // might be Empty if there are no params
      for (Cluster(Str(key), value) <- params.clusterIterator) yield {
        paramMap.put(key, value.toString)
      }
    }
    new DatasetInfo(path, name, num, indeps, deps, paramMap)
  }

  def getData(path: Array[String], dataset: String) =
    parseData(path, Str(dataset))

  def getData(path: Array[String], dataset: Int) =
    parseData(path, UInt(dataset.toLong))

  private def parseData(path: Array[String], identifier: Data) = {
    val req = LabradConnection.to("Data Vault").packet()
    req.call("cd", Arr(sanitizePath(path)))
    req.call("open", identifier)
    val idx = req.call("get")

    val answer = try {
      req.send
      Await.result(idx, 10.seconds)
    } catch catcher

    val Array(rows, cols) = answer.arrayShape
    Array.tabulate[Double](rows, cols) { answer(_, _).getValue }
  }
}
