lazy val commonSettings = Seq(
  version := "1.0.0-M3",
  scalaVersion := "2.11.7",
  resolvers += "bintray" at "http://jcenter.bintray.com",
  resolvers += "bintray-maffoo" at "http://dl.bintray.com/maffoo/maven"
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
      "net.maffoo" %% "jsonquote-play" % "0.3.0",
      "org.labrad" %% "scalabrad" % "0.3.1"
    ),

    routesGenerator := InjectedRoutesGenerator,

    // make sure the eclipse project includes generated source files
    EclipseKeys.createSrc := EclipseCreateSrc.Default + EclipseCreateSrc.Managed,

    // add a resource generator that copies compiled files from the client project
    managedResourceDirectories in Assets += (resourceManaged in Assets).value,
    resourceGenerators in Assets <+= Def.task {
      val srcDir = baseDirectory.value / ".." / "client-js" / "dist"
      val dstDir = (resourceManaged in Assets).value
      for {
        src <- (srcDir ** "*").get if src.isFile
        rel <- IO.relativizeFile(srcDir, src)
        dst = IO.resolve(dstDir, rel)
      } yield {
        IO.copyFile(src, dst, preserveLastModified = true)
        dst
      }
    }

  ).enablePlugins(PlayScala)
   .disablePlugins(PlayLayoutPlugin)
