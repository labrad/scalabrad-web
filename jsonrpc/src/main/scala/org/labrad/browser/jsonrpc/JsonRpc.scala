package org.labrad.browser.jsonrpc

import java.lang.reflect.{InvocationHandler, Method, Proxy}
import net.maffoo.jsonquote.play._
import play.api.libs.json._
import scala.concurrent.{ExecutionContext, Future}
import scala.language.experimental.macros
import scala.reflect.ClassTag
import scala.reflect.macros.blackbox.Context

/**
 * An object that can handle jsonrpc calls.
 */
trait Handler {
  def call(params: Params)(implicit ec: ExecutionContext): Future[JsValue]

  val methodName: String
  val paramNames: Seq[String]

  def checkArgs(args: Params): Unit = {
    args match {
      case Left(args) =>
        if (args.size > paramNames.size) {
          throw JsonRpcError.invalidParams(JsString(s"expected ${paramNames.size} but got ${args.size}"))
        }

      case Right(kwArgs) =>
        val invalids = kwArgs.keys.toSet -- paramNames
        if (invalids.nonEmpty) {
          throw JsonRpcError.invalidParams(json"""{ unexpected: [..${invalids.toSeq.sorted}] }""")
        }
    }
  }
}

/**
 * Jsonrpc handler for methods that return synchronously.
 */
class SyncMethodHandler[B](
  val methodName: String,
  val paramNames: Seq[String],
  invoke: Params => B,
  writer: Writes[B]
) extends Handler {
  def call(args: Params)(implicit ec: ExecutionContext): Future[JsValue] = {
    Future {
      checkArgs(args)
      val result = invoke(args)
      writer.writes(result)
    }
  }
}

/**
 * Jsonrpc handler for methods that return a future.
 */
class AsyncMethodHandler[B](
  val methodName: String,
  val paramNames: Seq[String],
  invoke: Params => Future[B],
  writer: Writes[B]
) extends Handler {
  def call(args: Params)(implicit ec: ExecutionContext): Future[JsValue] = {
    Future {
      checkArgs(args)
    }.flatMap { _ =>
      invoke(args)
    }.map {
      writer.writes
    }
  }
}

/**
 * Invocation handler for use with a jsonrpc proxy to make calls and send
 * notifications to a remote endpoint.
 *
 * endpoint - remote object to which messages will be sent
 *
 * calls - a map from method name on the proxied class to information about
 *         the method to be called, namely the rpc method name, writers for
 *         the parameter to convert to json, and a reader to convert the result
 *         from json back to scala.
 *
 * notifys - a map from method name on the proxied class to information about
 *           the method to be called, including rpc method name and parameter
 *           writers. There is no result reader because notifications do not
 *           return a result.
 *
 * Note that we always send parameters by name as a dict, never by position
 * as a list, even though both are allowed by jsonrpc.
 */
class EndpointInvocationHandler(
  endpoint: Endpoint,
  calls: Map[String, (String, Seq[(String, Any => JsValue)], Reads[_])],
  notifys: Map[String, (String, Seq[(String, Any => JsValue)])]
)(implicit ec: ExecutionContext) extends InvocationHandler {
  def invoke(proxy: Object, method: Method, args: Array[Object]): Object = {
    for ((rpcMethod, paramDefs, reader) <- calls.get(method.getName)) {
      val params = buildParams(paramDefs, args.dropRight(1))
      val f = endpoint.call(src = null, method = rpcMethod, params = Some(Right(params)))
      return f.map { json => reader.reads(json).get }
    }

    for ((rpcMethod, paramDefs) <- notifys.get(method.getName)) {
      val params = buildParams(paramDefs, args)
      endpoint.notify(src = null, method = rpcMethod, params = Some(Right(params)))
    }

    null
  }

  private def buildParams(paramDefs: Seq[(String, Any => JsValue)], args: Array[Object]): Map[String, JsValue] = {
    // args array will be null rather than empty if there are no arguments
    val argsSeq = if (args == null) Seq() else args.toSeq
    val params = Map.newBuilder[String, JsValue]
    for (((paramName, writer), arg) <- paramDefs zip argsSeq) {
      params += paramName -> writer(arg)
    }
    params.result
  }
}


object JsonRpc {
  /**
   * Make a map of json rpc Handlers based on the specified route definitions.
   * The routeDefs parameter must be a literal string with one route specified
   * per line in the form:
   *
   *     ROUTE_YPE  jsonrpc.method.name  instance.method
   *
   * Here ROUTE_TYPE is either CALL or NOTIFY corresponding to the jsonrpc
   * message type, 'jsonrpc.method.name' is a string corresponding to the
   * 'method' field of the incoming jsonrpc message, 'instance' is the name of
   * the object on which a method will be called to handle the jsonrpc call,
   * and 'method' is the method name to be called. Note that the object referred
   * to by 'instance' must be in scope at the point where this macro is called.
   *
   * If either the dotted prefix of the jsonrpc method name or the instance name
   * are the same between subsequent routes, they can be omitted. For example,
   * if we have:
   *
   *     CALL  foo.bar.baz  x.baz
   *     CALL  foo.bar.qux  x.qux
   *
   * then could instead write these route definitions as:
   *
   *     CALL  foo.bar.baz  x.baz
   *     CALL         .qux   .qux
   *
   * For each method that appears in a route definition, there must be implicit
   * instances of Reads in scope for its parameter types and Writes in scope
   * for its return value. These implicits are resolved at compile time, rather
   * than runtime, so that we can be sure at compile time that we know how to
   * convert all involved types to and from json.
   */
  def routes(routeDefs: String): Map[String, Handler] = macro Impl.routes

  /**
   * Make a proxy of the given type which will use the given route definitions
   * to convert scala method calls to jsonrpc calls and notifications sent to a
   * remote endpoint. The route definition syntax is the same as for the routes
   * method, but this is for outgoing calls/notifications instead of incoming.
   *
   * In addition, the meaning of 'instance.method' is slightly different.
   * 'instance' must refer to an object of type Endpoint which is in scope at
   * the point where the macro is invoked. This is the remote endpoint to which
   * messages will be sent. 'method' must name a method on the interface type
   * T, which is the method call that will be proxied into a json message.
   */
  def proxy[T](routeDefs: String): T = macro Impl.proxy[T]


  // support code for the runtime implementation of jsonrpc routing and proxies

  def extractArg[A](params: Params, i: Int, name: String, reader: Reads[A], default: Option[() => A]): A = {
    val paramOpt = params match {
      case Left(positional) => positional.lift(i)
      case Right(named) => named.get(name)
    }
    paramOpt match {
      case Some(a) =>
        reader.reads(a) match {
          case JsSuccess(a, path) => a
          case JsError(errors) => throw JsonRpcError.invalidParams(json"""{ param: $name, index: $i }""")
        }

      case None =>
        default match {
          case Some(f) => f()
          case None => throw JsonRpcError(10, s"missing required param $name ($i)")
        }
    }
  }

  val unitWriter = new Writes[Unit] {
    def writes(u: Unit): JsValue = JsNull
  }

  /**
   * Create a function to convert scala values to json using a Writes.
   *
   * This is needed in our implementation of invocation on a remote endpoint,
   * since we use a proxy and so have lost type information by the time we go
   * to convert all the method parameters to json. We check that the given
   * value is of the expected type before calling the writes method, which
   * keeps the compiler happy even though we know that the type check will
   * always pass.
   */
  def anyWriter[B](implicit tag: ClassTag[B], writer: Writes[B]): Any => JsValue = {
    (x: Any) => {
      x match {
        case b: B => writer.writes(b)
        case _ => sys.error(s"expected $tag but got ${x.getClass}")
      }
    }
  }


  // code for parsing jsonrpc route definitions

  sealed trait RouteType
  case object CALL extends RouteType
  case object NOTIFY extends RouteType

  case class Route(raw: String, typ: RouteType, rpcPrefix: String, rpcMethod: String, callee: String, method: String)

  def parseRoutes(s: String): Seq[Route] = {
    val lines = s.split('\n').map(_.trim()).filter(_.nonEmpty).toSeq

    var currentPrefix: Option[String] = None
    var currentCallee: Option[String] = None

    for (line <- lines) yield {
      val route = parseRoute(line, currentPrefix, currentCallee)
      currentPrefix = Some(route.rpcPrefix)
      currentCallee = Some(route.callee)
      route
    }
  }

  def parseRoute(s: String, currentPrefix: Option[String], currentCallee: Option[String]): Route = {
    def badRoute(msg: String) = {
      sys.error(s"$msg. Invalid route: $s")
    }

    s.trim.split("""\s+""") match {
      case Array(typ, rpcDef, handlerDef) =>
        val routeType = typ match {
          case "CALL" => CALL
          case "NOTIFY" => NOTIFY
          case _ => badRoute(s"Invalid route type: $typ")
        }

        val (rpcPrefix, rpcMethod) = {
          val m = rpcDef.trim()
          if (m.startsWith(".")) {
            val prefix = currentPrefix.getOrElse { badRoute("No prefix defined from previous route") }
            (prefix, prefix + m)
          } else if (m.contains('.')) {
            val i = m.lastIndexOf('.')
            val prefix = m.take(m.lastIndexOf('.'))
            (prefix, m)
          } else {
            ("", m)
          }
        }

        val (callee, method) = {
          val h = handlerDef.trim()
          if (h.startsWith(".")) {
            val callee = currentCallee.getOrElse { badRoute("No callee defined from previous route") }
            (callee, h.tail)
          } else {
            h.split('.') match {
              case Array(callee, method) =>
                (callee, method)
              case _ => badRoute("Route handler must be of the form 'instance.method' or '.method'")
            }
          }
        }

        Route(s, routeType, rpcPrefix, rpcMethod, callee, method)

      case x =>
        badRoute(s"Route must be of the form 'TYPE  rpc.method  callee.method' instead of ${x.mkString(",")}")
    }
  }

  /**
   * Class containing macro implementations. This is implemented as a
   * 'macro bundle' (http://docs.scala-lang.org/overviews/macros/bundles.html),
   * a class that takes the macro context as a parameter. This allows all
   * methods in the class to share the context, and use path-dependent types
   * from that context.
   */
  class Impl(val c: Context) {
    import c.universe._

    def routes(routeDefs: c.Expr[String]): c.Expr[Map[String, Handler]] = {
      val routes = parseRouteDefs(routeDefs)

      // build tuple of (jsonrpc method name, handler) for each defined route
      val handlers = for (route <- routes) yield {
        def badRoute(msg: String) = {
          c.abort(routeDefs.tree.pos, s"$msg. Invalid route: ${route.raw}")
        }

        val callee = c.typecheck(c.parse(route.callee))
        val t = callee.tpe
        val methods = t.members.toSeq.collect { case m: MethodSymbol => m }
        val defaults = methods.filter(m => symbolName(m) contains "$default$")

        val method = methods.find(m => symbolName(m) == route.method).getOrElse {
          badRoute(s"Value ${route.callee} of type $t has no method ${route.method}")
        }
        val handler = methodHandler(callee, method, defaults)

        q"""(${route.rpcMethod}, $handler)"""
      }

      // final result is a map from rpc names to handlers
      c.Expr[Map[String, Handler]](q"""$map(..$handlers)""")
    }

    def proxy[T: c.WeakTypeTag](routeDefs: c.Expr[String]): c.Expr[T] = {
      val routes = parseRouteDefs(routeDefs)

      // enforce that all proxy routes use the same callee of type Endpoint
      val callees = routes.map(_.callee).toSet.toSeq
      if (callees.length != 1) {
        c.abort(routeDefs.tree.pos, "proxy routes must all use the same endpoint callee")
      }
      val endpoint = c.typecheck(c.parse(callees.head))
      if (!(endpoint.tpe <:< typeOf[Endpoint])) {
        c.abort(routeDefs.tree.pos, "proxy callee must be of type Endpoint")
      }

      val t = weakTypeOf[T]
      val methods = t.members.toSeq.collect { case m: MethodSymbol => m }

      // build handler for each CALL route
      val calls = for {
        route <- routes
        if route.typ == CALL
      } yield {
        val method = methods.find(m => symbolName(m) == route.method).getOrElse {
          c.abort(routeDefs.tree.pos, s"Type $t has no method ${route.method}")
        }
        q"(${route.method}, (${route.rpcMethod}, ${paramDefs(method)}, ${resultReader(method)}))"
      }

      // build handler for each NOTIFY route
      val notifys = for {
        route <- routes
        if route.typ == NOTIFY
      } yield {
        val method = methods.find(m => symbolName(m) == route.method).getOrElse {
          c.abort(routeDefs.tree.pos, s"Type $t has no method ${route.method}")
        }
        checkUnitReturn(method)
        q"(${route.method}, (${route.rpcMethod}, ${paramDefs(method)}))"
      }

      c.Expr[T](q"""
        _root_.java.lang.reflect.Proxy.newProxyInstance(
          classOf[$t].getClassLoader(),
          Array(classOf[$t]),
          new $endpointInvocationHandlerT($endpoint, $map(..$calls), $map(..$notifys))
        ).asInstanceOf[$t]
      """)
    }

    /**
     * Parse the given route definitions, which must be specified as a string literal.
     */
    private def parseRouteDefs(routeDefs: c.Expr[String]): Seq[Route] = {
      routeDefs.tree match {
        case Literal(Constant(s: String)) =>
          try {
            parseRoutes(s)
          } catch {
            case e: Exception =>
              c.abort(routeDefs.tree.pos, e.toString)
          }
        case _ => c.abort(routeDefs.tree.pos, "route definitions must be specified as a string literal")
      }
    }

    /**
     * Create a handler to dispatch rpc requests to a specific method
     */
    private def methodHandler(inst: Tree, m: MethodSymbol, defaultMethods: Seq[MethodSymbol]): c.Tree = {
      val methodName = symbolName(m)

      val (paramTypes, returnType) = paramAndReturnTypes(m)
      val paramNames = paramTypes.map(symbolName)

      // Selector for the method given by methodName on the instance inst.
      val f = Select(inst, TermName(methodName))

      // Create code to extract each parameter of the required type for the
      // underlying method. Note that the trees created here refer to a term
      // "params", which is defined in the invoke function below.
      val args = paramTypes.zipWithIndex.map { case (t, i) =>
        val reader = inferReader(t.pos, t.typeSignature.dealias)
        val defaultName = methodName + "$default$" + (i+1)
        val default = defaultMethods.find(m => symbolName(m) == defaultName) match {
          case Some(m) =>
            // Default methods are defined without parens,
            // so we can invoke them just by selecting.
            val invokeDefault = Select(inst, TermName(defaultName))
            q"_root_.scala.Some(() => $invokeDefault)"

          case None => q"_root_.scala.None"
        }

        q"$extractArg(params, $i, ${symbolName(t)}, $reader, $default)"
      }

      // Create a function that takes one argument "params" of type Params
      // and then calls the method given by f.
      val invoke = q"(params: $paramsT) => $f(..$args)"

      // get return value writer, and determine whether the method is async
      val (resultWriter, async) = returnType.dealias match {
        case t if t <:< c.typeOf[Future[Unit]] =>
          (unitWriter, true)

        case t if t <:< c.typeOf[Future[Any]] =>
          val resultTpe = typeParams(lub(t :: c.typeOf[Future[Nothing]] :: Nil))(0)
          (inferWriter(m.pos, resultTpe), true)

        case t if t <:< c.typeOf[Unit] => (unitWriter, false)
        case t => (inferWriter(m.pos, t), false)
      }

      if (async) {
        q"""new $asyncMethodHandlerT($methodName, $seq(..$paramNames), $invoke, $resultWriter)"""
      } else {
        q"""new $syncMethodHandlerT($methodName, $seq(..$paramNames), $invoke, $resultWriter)"""
      }
    }

    /**
     * Check that a method to be used with a NOTIFY route has return type Unit
     */
    private def checkUnitReturn(m: MethodSymbol): Unit = {
      val (_, returnType) = paramAndReturnTypes(m)
      returnType.dealias match {
        case t if t <:< c.typeOf[Unit] =>
        case t =>
          // TODO: use position of route instead of method symbol
          c.abort(m.pos, s"NOTIFY method ${symbolName(m)} must return Unit")
      }
    }

    /**
     * Create a sequence of parameter writers for the given method.
     *
     * For each parameter, we produce a tuple of the parameter name and an
     * anyWriter function that will convert from type Any to the expected type.
     * We have to accept Any here because we're using JDK proxies to implement
     * the jsonrpc proxy, and the JDK proxy interface passes all parameters
     * as Object.
     */
    private def paramDefs(m: MethodSymbol): c.Tree = {
      val (paramTypes, _) = paramAndReturnTypes(m)

      val params = paramTypes.map { t =>
        val writer = inferWriter(t.pos, t.typeSignature.dealias)
        q"(${symbolName(t)}, $anyWriter[$t]($classTag[$t], $writer))"
      }

      q"$seq(..$params)"
    }

    /**
     * Create a reader for the return type of a method.
     *
     * Since this is used for proxying calls to remote endpoints, we require
     * that the return type is a Future so that the method call will be
     * explicitly asynchronous.
     */
    private def resultReader(m: MethodSymbol): c.Tree = {
      val (_, returnType) = paramAndReturnTypes(m)

      returnType.dealias match {
        case t if t <:< c.typeOf[Future[Any]] =>
          val resultTpe = typeParams(lub(t :: c.typeOf[Future[Nothing]] :: Nil))(0)
          inferReader(m.pos, resultTpe)

        case t =>
          sys.error(s"CALL method ${symbolName(m)} must return a Future")
      }
    }

    /**
     * Get the parameter types and return type of the given method.
     * The parameter types are returned as symbols, which contain both
     * the parameter name and its declared type.
     */
    private def paramAndReturnTypes(m: MethodSymbol): (List[Symbol], Type) = {
      m.typeSignature match {
        case PolyType(args, ret) => (args.map(_.asType), ret)
        case MethodType(args, ret) => (args.map(_.asTerm), ret)
        case NullaryMethodType(ret) => (Nil, ret)
      }
    }

    /**
     * Get the name of a symbol as a plain old String.
     */
    private def symbolName(s: Symbol): String = s.name.decodedName.toString

    /**
     * Return a list of type parameters in the given type.
     * Example: List[(String, Int)] => Seq(Tuple2, String, Int)
     */
    private def typeParams(tpe: Type): Seq[Type] = {
      val b = Iterable.newBuilder[Type]
      tpe.foreach(b += _)
      b.result.drop(2).grouped(2).map(_.head).toIndexedSeq
    }

    /**
     * Locate an implicit Reads[T] for the given type T.
     */
    private def inferReader(pos: Position, t: Type): Tree = {
      val readerTpe = appliedType(c.typeOf[Reads[_]], List(t))
      c.inferImplicitValue(readerTpe) match {
        case EmptyTree => c.abort(pos, s"could not find implicit value of type Reads[$t]")
        case tree => tree
      }
    }

    /**
     * Locate an implicit Writes[T] for the given type T.
     */
    def inferWriter(pos: Position, t: Type): Tree = {
      val writerTpe = appliedType(c.typeOf[Writes[_]], List(t))
      c.inferImplicitValue(writerTpe) match {
        case EmptyTree => c.abort(pos, s"could not find implicit value of type Writes[$t]")
        case tree => tree
      }
    }

    // Fully-qualified symbols and types (for hygiene). Hygiene means that our
    // macro should work regardless of the environment in which it is invoked,
    // in particular the user should not have to import extra names to use it.
    // In a hygienic macro system, names we refer to here in the generated code
    // would be fully-qualified, so they would work for the person invoking the
    // macro without their needing to import those names. However, scala's
    // quasiquotes are not hygienic, so we need to make sure to use fully-
    // qualified names ourselves.

    val seq = q"_root_.scala.Seq"
    val map = q"_root_.scala.collection.immutable.Map"
    val classTag = q"_root_.scala.reflect.classTag"

    val extractArg = q"_root_.org.labrad.browser.jsonrpc.JsonRpc.extractArg"
    val unitWriter = q"_root_.org.labrad.browser.jsonrpc.JsonRpc.unitWriter"
    val anyWriter = q"_root_.org.labrad.browser.jsonrpc.JsonRpc.anyWriter"

    val paramsT = tq"_root_.org.labrad.browser.jsonrpc.Params"
    val asyncMethodHandlerT = tq"_root_.org.labrad.browser.jsonrpc.AsyncMethodHandler"
    val syncMethodHandlerT = tq"_root_.org.labrad.browser.jsonrpc.SyncMethodHandler"
    val endpointInvocationHandlerT = tq"_root_.org.labrad.browser.jsonrpc.EndpointInvocationHandler"
  }
}
