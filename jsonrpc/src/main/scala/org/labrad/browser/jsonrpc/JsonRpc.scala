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
 *
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


class EndpointInvocationHandler(
  endpoint: Endpoint,
  calls: Map[String, (String, Seq[(String, Any => JsValue)], Reads[_])],
  notifys: Map[String, (String, Seq[(String, Any => JsValue)])]
) extends InvocationHandler {
  def invoke(proxy: Object, method: Method, args: Array[Object]): Object = {
    for ((rpcMethod, paramDefs, reader) <- calls.get(method.getName)) {
      val params = Map.newBuilder[String, JsValue]
      for (((paramName, writer), arg) <- paramDefs zip args) {
        params += paramName -> writer(arg)
      }
      implicit val ec = args.last.asInstanceOf[ExecutionContext]
      val f = endpoint.call(src = null, method = rpcMethod, params = Some(Right(params.result)))
      return f.map { json => reader.reads(json).get }
    }

    for ((rpcMethod, paramDefs) <- notifys.get(method.getName)) {
      val params = Map.newBuilder[String, JsValue]
      for (((paramName, writer), arg) <- paramDefs zip args) {
        params += paramName -> writer(arg)
      }
      endpoint.notify(src = null, method = rpcMethod, params = Some(Right(params.result)))
    }

    null
  }
}


object JsonRpc {
  /**
   * Make a map of json rpc Handlers for all methods annotated with @Call on the
   * given instance. There must be instances of Reads and Writes in scope for
   * parameter types and return values, respectively. Note that this uses a
   * macro implementation so that the type analysis and implicit resolution
   * actually happens at compile time, rather than runtime.
   */
  def makeHandlers[T](inst: T): Map[String, Handler] = macro makeHandlersImpl[T]

  /**
   * Make a map of json rpc Handlers for all methods annotated with @Call on the
   * given instance. There must be instances of Reads and Writes in scope for
   * parameter types and return values, respectively. Note that this uses a
   * macro implementation so that the type analysis and implicit resolution
   * actually happens at compile time, rather than runtime.
   */
  def makeProxy[T](cls: Class[T], endpoint: Endpoint): T = macro makeProxyImpl[T]

  def makeHandlersImpl[T: c.WeakTypeTag](c: Context)(inst: c.Expr[T]): c.Expr[Map[String, Handler]] = {
    import c.universe._

    // fully-qualified symbols and types (for hygiene)
    val map = q"_root_.scala.collection.immutable.Map"
    val seq = q"_root_.scala.Seq"
    val paramsT = tq"_root_.org.labrad.browser.jsonrpc.Params"
    val ex = q"_root_.org.labrad.browser.jsonrpc.JsonRpc.extractArg"
    val unitWriter = q"_root_.org.labrad.browser.jsonrpc.JsonRpc.unitWriter"

    // extract information from an optional @Call annotation on a symbol
    implicit class RichAnnotation(a: Annotation) {
      // extract a single parameter by name
      def param(name: String): Option[Constant] = {
        a.tree.children.tail.collectFirst {
          case AssignOrNamedArg(Ident(TermName(`name`)), Literal(c)) => c
        }
      }
    }

    def rpcAnnotation(s: Symbol): Option[String] =
      for {
        a <- s.annotations.find(_.tree.tpe =:= typeOf[Call])
        value <- a.param("value").map { case Constant(value: String) => value }
      } yield value

    // create a handler to dispatch rpc requests to a specific method
    def methodHandler(m: MethodSymbol, defaultMethods: Seq[MethodSymbol]): c.Tree = {
      val methodName = m.name.decodedName.toString

      val (paramTypes, returnType) = m.typeSignature match {
        case PolyType(args, ret) => (args.map(_.asType), ret)
        case MethodType(args, ret) => (args.map(_.asTerm), ret)
        case NullaryMethodType(ret) => (Nil, ret)
      }
      val paramNames = paramTypes.map(_.name.decodedName.toString)

      // selector for this method
      val f = Select(inst.tree, TermName(methodName))

      // create arguments for extractArg for a particular parameter
      def p(t: Symbol, i: Int): Seq[Tree] = {
        val name = t.name.decodedName.toString
        val reader = inferReader(t.pos, t.typeSignature.dealias)
        val defaultName = methodName + "$default$" + (i+1)
        val default = defaultMethods.find(_.name.decodedName.toString == defaultName) match {
          case Some(m) =>
            val invokeDefault = Apply(
              Select(
                inst.tree,
                TermName(defaultName)
              ),
              List()
            )
            q"_root_.scala.Some(() => $invokeDefault)"

          case None => q"_root_.scala.None"
        }

        Seq(q"$i", q"$name", reader, default)
      }

      val invoke = paramTypes match {
        case Seq()                                       => q"""(in: $paramsT) => $f()"""
        case Seq(t0)                                     => q"""(in: $paramsT) => $f($ex(in, ..${p(t0,0)}))"""
        case Seq(t0, t1)                                 => q"""(in: $paramsT) => $f($ex(in, ..${p(t0,0)}), $ex(in, ..${p(t1,1)}))"""
        case Seq(t0, t1, t2)                             => q"""(in: $paramsT) => $f($ex(in, ..${p(t0,0)}), $ex(in, ..${p(t1,1)}), $ex(in, ..${p(t2,2)}))"""
        case Seq(t0, t1, t2, t3)                         => q"""(in: $paramsT) => $f($ex(in, ..${p(t0,0)}), $ex(in, ..${p(t1,1)}), $ex(in, ..${p(t2,2)}), $ex(in, ..${p(t3,3)}))"""
        case Seq(t0, t1, t2, t3, t4)                     => q"""(in: $paramsT) => $f($ex(in, ..${p(t0,0)}), $ex(in, ..${p(t1,1)}), $ex(in, ..${p(t2,2)}), $ex(in, ..${p(t3,3)}), $ex(in, ..${p(t4,4)}))"""
        case Seq(t0, t1, t2, t3, t4, t5)                 => q"""(in: $paramsT) => $f($ex(in, ..${p(t0,0)}), $ex(in, ..${p(t1,1)}), $ex(in, ..${p(t2,2)}), $ex(in, ..${p(t3,3)}), $ex(in, ..${p(t4,4)}), $ex(in, ..${p(t5,5)}))"""
        case Seq(t0, t1, t2, t3, t4, t5, t6)             => q"""(in: $paramsT) => $f($ex(in, ..${p(t0,0)}), $ex(in, ..${p(t1,1)}), $ex(in, ..${p(t2,2)}), $ex(in, ..${p(t3,3)}), $ex(in, ..${p(t4,4)}), $ex(in, ..${p(t5,5)}), $ex(in, ..${p(t6,6)}))"""
        case Seq(t0, t1, t2, t3, t4, t5, t6, t7)         => q"""(in: $paramsT) => $f($ex(in, ..${p(t0,0)}), $ex(in, ..${p(t1,1)}), $ex(in, ..${p(t2,2)}), $ex(in, ..${p(t3,3)}), $ex(in, ..${p(t4,4)}), $ex(in, ..${p(t5,5)}), $ex(in, ..${p(t6,6)}), $ex(in, ..${p(t7,7)}))"""
        case Seq(t0, t1, t2, t3, t4, t5, t6, t7, t8)     => q"""(in: $paramsT) => $f($ex(in, ..${p(t0,0)}), $ex(in, ..${p(t1,1)}), $ex(in, ..${p(t2,2)}), $ex(in, ..${p(t3,3)}), $ex(in, ..${p(t4,4)}), $ex(in, ..${p(t5,5)}), $ex(in, ..${p(t6,6)}), $ex(in, ..${p(t7,7)}), $ex(in, ..${p(t8,8)}))"""
        case Seq(t0, t1, t2, t3, t4, t5, t6, t7, t8, t9) => q"""(in: $paramsT) => $f($ex(in, ..${p(t0,0)}), $ex(in, ..${p(t1,1)}), $ex(in, ..${p(t2,2)}), $ex(in, ..${p(t3,3)}), $ex(in, ..${p(t4,4)}), $ex(in, ..${p(t5,5)}), $ex(in, ..${p(t6,6)}), $ex(in, ..${p(t7,7)}), $ex(in, ..${p(t8,8)}), $ex(in, ..${p(t9,9)}))"""
      }

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
        q"""new _root_.org.labrad.browser.jsonrpc.AsyncMethodHandler($methodName, $seq(..$paramNames), $invoke, $resultWriter)"""
      } else {
        q"""new _root_.org.labrad.browser.jsonrpc.SyncMethodHandler($methodName, $seq(..$paramNames), $invoke, $resultWriter)"""
      }
    }

    // return a list of type parameters in the given type
    // example: List[(String, Int)] => Seq(Tuple2, String, Int)
    def typeParams(tpe: Type): Seq[Type] = {
      val b = Iterable.newBuilder[Type]
      tpe.foreach(b += _)
      b.result.drop(2).grouped(2).map(_.head).toIndexedSeq
    }

    // locate an implicit Reads[T] for the given type
    def inferReader(pos: Position, t: Type): Tree = {
      val readerTpe = appliedType(c.typeOf[Reads[_]], List(t))
      c.inferImplicitValue(readerTpe) match {
        case EmptyTree => c.abort(pos, s"could not find implicit value of type Reads[$t]")
        case tree => tree
      }
    }

    // locate an implicit Writes[T] for the given type
    def inferWriter(pos: Position, t: Type): Tree = {
      val writerTpe = appliedType(c.typeOf[Writes[_]], List(t))
      c.inferImplicitValue(writerTpe) match {
        case EmptyTree => c.abort(pos, s"could not find implicit value of type Writes[$t]")
        case tree => tree
      }
    }


    val t = weakTypeOf[T]
    val methods = t.members.toSeq.collect { case m: MethodSymbol => m }
    val defaults = methods.filter(_.name.decodedName.toString.contains("$default$"))

    // build handler for each annotated method
    val handlers = for {
      method <- methods
      rpcName <- rpcAnnotation(method)
    } yield {
      val handler = methodHandler(method, defaults)
      q"""$rpcName -> $handler"""
    }

    // final result is a map from rpc names to handlers
    c.Expr[Map[String, Handler]](q"""$map(..$handlers)""")
  }

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

  def makeProxyImpl[T: c.WeakTypeTag](c: Context)(cls: c.Expr[Class[T]], endpoint: c.Expr[Endpoint]): c.Expr[T] = {
    import c.universe._

    // fully-qualified symbols and types (for hygiene)
    val map = q"_root_.scala.collection.immutable.Map"
    val seq = q"_root_.scala.Seq"

    // extract information from an optional @Setting annotation on a symbol
    implicit class RichAnnotation(a: Annotation) {
      // extract a single parameter by name
      def param(name: String): Option[Constant] = {
        a.tree.children.tail.collectFirst {
          case AssignOrNamedArg(Ident(TermName(`name`)), Literal(c)) => c
        }
      }
    }

    def rpcAnnotation(s: Symbol): Option[String] =
      for {
        a <- s.annotations.find(_.tree.tpe =:= typeOf[Call])
        value <- a.param("value").map { case Constant(value: String) => value }
      } yield value

    def notifyAnnotation(s: Symbol): Option[String] =
      for {
        a <- s.annotations.find(_.tree.tpe =:= typeOf[Notify])
        value <- a.param("value").map { case Constant(value: String) => value }
      } yield value

    // create a handler to dispatch rpc requests to a specific method
    def paramDefs(m: MethodSymbol): c.Tree = {
      val methodName = m.name.decodedName.toString

      val (paramTypes, returnType) = m.typeSignature match {
        case PolyType(args, ret) => (args.map(_.asType), ret)
        case MethodType(args, ret) => (args.map(_.asTerm), ret)
        case NullaryMethodType(ret) => (Nil, ret)
      }
      val paramNames = paramTypes.map(_.name.decodedName.toString)
      val writers = paramTypes.map(t => inferWriter(t.pos, t.typeSignature.dealias))

      val params = paramTypes.map { t =>
        val paramName = t.name.decodedName.toString
        val writer = inferWriter(t.pos, t.typeSignature.dealias)
        q"($paramName, $writer)"
      }

      // get return value writer, and determine whether the method is async
      val resultWriterOpt = returnType.dealias match {
        case t if t <:< c.typeOf[Future[Any]] =>
          val resultTpe = typeParams(lub(t :: c.typeOf[Future[Nothing]] :: Nil))(0)
          Some(inferWriter(m.pos, resultTpe))

        case t =>
          None
      }

      q"$seq(..$params)"
    }

    // create a handler to dispatch rpc requests to a specific method
    def resultReader(m: MethodSymbol): c.Tree = {
      val methodName = m.name.decodedName.toString

      val returnType = m.typeSignature match {
        case PolyType(args, ret) => ret
        case MethodType(args, ret) => ret
        case NullaryMethodType(ret) => ret
      }

      // get return value writer
      returnType.dealias match {
        case t if t <:< c.typeOf[Future[Any]] =>
          val resultTpe = typeParams(lub(t :: c.typeOf[Future[Nothing]] :: Nil))(0)
          inferReader(m.pos, resultTpe)

        case t =>
          sys.error(s"@Call method $methodName must return a Future")
      }
    }

    def checkUnitReturn(m: MethodSymbol): Unit = {
      val methodName = m.name.decodedName.toString

      val returnType = m.typeSignature match {
        case PolyType(args, ret) => ret
        case MethodType(args, ret) => ret
        case NullaryMethodType(ret) => ret
      }

      // get return value writer, and determine whether the method is async
      returnType.dealias match {
        case t if t <:< c.typeOf[Unit] =>
        case t =>
          sys.error(s"@Notify method $methodName must return Unit")
      }
    }

    // return a list of type parameters in the given type
    // example: List[(String, Int)] => Seq(Tuple2, String, Int)
    def typeParams(tpe: Type): Seq[Type] = {
      val b = Iterable.newBuilder[Type]
      tpe.foreach(b += _)
      b.result.drop(2).grouped(2).map(_.head).toIndexedSeq
    }

    // locate an implicit Reads[T] for the given type
    def inferReader(pos: Position, t: Type): Tree = {
      val readerTpe = appliedType(c.typeOf[Reads[_]], List(t))
      c.inferImplicitValue(readerTpe) match {
        case EmptyTree => c.abort(pos, s"could not find implicit value of type Reads[$t]")
        case tree => tree
      }
    }

    // locate an implicit Writes[T] for the given type
    def inferWriter(pos: Position, t: Type): Tree = {
      val writerTpe = appliedType(c.typeOf[Writes[_]], List(t))
      val writer = c.inferImplicitValue(writerTpe) match {
        case EmptyTree => c.abort(pos, s"could not find implicit value of type Writes[$t]")
        case tree => tree
      }
      q"""_root_.org.labrad.browser.jsonrpc.JsonRpc.anyWriter[$t](_root_.scala.reflect.classTag[$t], $writer)"""
    }

    val t = weakTypeOf[T]
    val methods = t.members.toSeq.collect { case m: MethodSymbol => m }

    // build handler for each annotated method
    val calls = for {
      method <- methods
      methodName = method.name.decodedName.toString
      rpcName <- rpcAnnotation(method)
    } yield {
      q"($methodName, ($rpcName, ${paramDefs(method)}, ${resultReader(method)}))"
    }

    val notifys = for {
      method <- methods
      methodName = method.name.decodedName.toString
      notifyName <- notifyAnnotation(method)
    } yield {
      checkUnitReturn(method)
      q"($methodName, ($notifyName, ${paramDefs(method)}))"
    }

    c.Expr[T](q"""
      _root_.java.lang.reflect.Proxy.newProxyInstance(
        $cls.getClassLoader(),
        Array($cls),
        new EndpointInvocationHandler($endpoint, $map(..$calls), $map(..$notifys))
      ).asInstanceOf[$t]
    """)
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
}
