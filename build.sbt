lazy val commonSettings = Seq(
  version := "1.0.1",
  scalaVersion := "2.11.7",
  resolvers += "bintray" at "http://jcenter.bintray.com"
)

lazy val jsonrpc = project.in(file("jsonrpc"))
  .settings(commonSettings)
  .settings(
    name := "scalabrad-web-jsonrpc",

    resolvers += "Typesafe repository" at "http://repo.typesafe.com/typesafe/releases/",

    libraryDependencies ++= Seq(
      "org.scala-lang" % "scala-reflect" % scalaVersion.value,
      "com.typesafe.play" %% "play-json" % "2.4.0",
      "net.maffoo" %% "jsonquote-play" % "0.3.0",
      "org.scalatest" %% "scalatest" % "2.2.4" % "test"
    )
  )

lazy val server = project.in(file("server"))
  .dependsOn(jsonrpc)
  .settings(commonSettings)
  .settings(
    name := "scalabrad-web-server",

    libraryDependencies ++= Seq(
      "org.scala-lang.modules" %% "scala-async" % "0.9.2",
      "org.jsoup" % "jsoup" % "1.9.2",
      "org.labrad" %% "scalabrad" % "0.6.2"
    ),

    // When running, connect std in and tell server to stop on EOF (ctrl+D).
    // This allows us to stop the server without using ctrl+C, which kills sbt.
    fork in run := true,
    connectInput in run := true,
    javaOptions += "-Dorg.labrad.stopOnEOF=true",

    // add a resource generator that copies compiled files from the client project
    resourceGenerators in Compile += Def.task {
      val srcDir = baseDirectory.value / ".." / "client-js" / "dist"
      val dstDir = (resourceManaged in Compile).value / "public"
      val s = streams.value
      s.log.info(s"copying assets from $srcDir to $dstDir")
      for {
        src <- (srcDir ** "*").get if src.isFile
        rel <- IO.relativizeFile(srcDir, src)
        dst = IO.resolve(dstDir, rel)
      } yield {
        IO.copyFile(src, dst, preserveLastModified = true)
        dst
      }
    }.taskValue,

    // use sbt-pack to create distributable package
    packSettings,

    packMain := Map(
      "labrad-web" -> "org.labrad.browser.WebServer"
    ),

    packGenerateWindowsBatFile := true
  )
