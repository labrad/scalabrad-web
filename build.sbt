lazy val gwtModules = taskKey[Seq[String]]("the list of gwt modules to compile")
lazy val gwtClasspath = taskKey[Seq[File]]("the classpath for gwt compilation, including source")
lazy val gwtCodeServer = taskKey[Unit]("invoke gwt code server")

lazy val gwtVersion = "2.7.0"
lazy val jettyVersion = "9.2.9.v20150224"

lazy val commonSettings = Seq(
  version := "1.0-SNAPSHOT",
  scalaVersion := "2.11.6",
  resolvers += "bintray" at "http://jcenter.bintray.com",
  resolvers += "bintray-maffoo" at "http://dl.bintray.com/maffoo/maven"
)

lazy val shared = project.in(file("shared"))
  .settings(commonSettings)
  .settings(
    name := "scalabrad-web-common"
  )

lazy val client = project.in(file("client"))
  .dependsOn(shared)
  .settings(commonSettings)
  .settings(
    name := "scalabrad-web-client",

    libraryDependencies ++= Seq(
      "com.google.gwt" % "gwt-codeserver" % gwtVersion,
      "com.google.gwt" % "gwt-dev" % gwtVersion,
      "com.google.gwt" % "gwt-elemental" % gwtVersion,
      "com.google.gwt" % "gwt-servlet" % gwtVersion,
      "com.google.gwt" % "gwt-user" % gwtVersion,
      "com.google.gwt.inject" % "gin" % "2.1.2",
      "com.google.inject" % "guice" % "3.0" exclude("asm", "asm"),
      "com.googlecode.gflot" % "gflot" % "3.3.0",
      "com.sksamuel.gwt" % "gwt-websockets" % "1.0.4",
      "javax.ws.rs" % "javax.ws.rs-api" % "2.0.1",
      "org.fusesource.restygwt" % "restygwt" % "2.0.2"
    ),

    gwtModules := Seq("org.labrad.browser.LabradBrowser"),

    gwtClasspath := {
      val srcs = (sourceDirectories in Compile).value ++
                 (sourceDirectories in shared in Compile).value
      val classes = (fullClasspath in Compile).value.map(_.data)
      srcs ++ classes
    },

    compile := {
      // run standard compile task
      val result = compile.in(Compile).value

      // now run gwt compilation
      val args: Array[String] = Array(
        "-XjsInteropMode", "JS",
        "-war", (target.value / "gwt").getAbsolutePath,
        "-gen", (target.value / "gwt-gen").getAbsolutePath
      ) ++ gwtModules.value

      val forkOptions = ForkOptions(
        bootJars = Nil,
        javaHome = javaHome.value,
        connectInput = connectInput.value,
        outputStrategy = outputStrategy.value,
        runJVMOptions = javaOptions.value,
        workingDirectory = Some(target.value),
        envVars = envVars.value
      )
      val scalaRun = new ForkRun(forkOptions)
      scalaRun.run("com.google.gwt.dev.Compiler", gwtClasspath.value, args, streams.value.log)

      result
    },

    gwtCodeServer := {
      val args: Array[String] = Array(
        "-XjsInteropMode", "JS",
        "-port", "9876"
      ) ++ gwtModules.value

      val forkOptions = ForkOptions(
        bootJars = Nil,
        javaHome = javaHome.value,
        connectInput = connectInput.value,
        outputStrategy = outputStrategy.value,
        runJVMOptions = javaOptions.value,
        workingDirectory = Some(target.value),
        envVars = envVars.value
      )
      val scalaRun = new ForkRun(forkOptions)
      scalaRun.run("com.google.gwt.dev.codeserver.CodeServer", gwtClasspath.value, args, streams.value.log)
    }
  )

lazy val server = project.in(file("server"))
  .dependsOn(shared)
  .settings(commonSettings)
  .settings(
    name := "scalabrad-web-server",

    libraryDependencies ++= Seq(
      "com.fasterxml.jackson.core" % "jackson-databind" % "2.5.0",
      "org.scala-lang.modules" %% "scala-async" % "0.9.2",
      "net.maffoo" %% "jsonquote-core" % "0.2.1",
      "org.labrad" %% "scalabrad" % "0.2.0-M6"
    ),

    routesGenerator := InjectedRoutesGenerator,

    // make sure the eclipse project includes generated source files
    EclipseKeys.createSrc := EclipseCreateSrc.Default + EclipseCreateSrc.Managed,

    // add a source generator that copies compiled files from the client project
    sourceGenerators in Assets <+= Def.task {
      val srcDir = (target in client).value / "gwt" / "labradbrowser"
      val dstDir = (resourceManaged in Assets).value / "gwt" / "labradbrowser"
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
