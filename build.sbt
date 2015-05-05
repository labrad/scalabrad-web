lazy val gwtModules = taskKey[Seq[String]]("the list of gwt modules to compile")
lazy val gwtCompile = taskKey[Unit]("invoke the gwt compiler")
lazy val gwtCodeServer = taskKey[Unit]("invoke gwt code server")

lazy val gwtVersion = "2.7.0"
lazy val jettyVersion = "9.2.9.v20150224"

lazy val commonSettings = Seq(
  version := "1.0-SNAPSHOT",
  scalaVersion := "2.11.6",
  resolvers += "bintray" at "http://jcenter.bintray.com",
  resolvers += "bintray-maffoo" at "http://dl.bintray.com/maffoo/maven"
)

lazy val client = project.in(file("client"))
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

    compile := {
      // run standard compile task
      val result = compile.in(Compile).value

      // now run gwt compilation
      val srcs = (sourceDirectories in Compile).value
      val classes = (fullClasspath in Compile).value.map(_.data)
      val cp = srcs ++ classes

      val warDir = target.value / "war"
      val args: Array[String] = Array(
        "-XjsInteropMode", "JS",
        "-war", warDir.getAbsolutePath,
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
      scalaRun.run("com.google.gwt.dev.Compiler", cp, args, streams.value.log)

      result
    },

    gwtCodeServer := {
      val srcs = (sourceDirectories in Compile).value
      val classes = (fullClasspath in Compile).value.map(_.data)
      val cp = srcs ++ classes

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
      scalaRun.run("com.google.gwt.dev.codeserver.CodeServer", cp, args, streams.value.log)
    }
  )

lazy val server = project.in(file("server"))
  .dependsOn(client)
  .settings(commonSettings)
  .settings(
    name := "scalabrad-web-server",

    libraryDependencies ++= Seq(
      "org.eclipse.jetty" % "jetty-continuation" % jettyVersion,
      "org.eclipse.jetty" % "jetty-server" % jettyVersion,
      "org.eclipse.jetty" % "jetty-util" % jettyVersion,
      "org.eclipse.jetty.websocket" % "websocket-servlet" % jettyVersion,
      "com.fasterxml.jackson.core" % "jackson-databind" % "2.5.0",
      "org.glassfish.jersey.core" % "jersey-server" % "2.17",
      "org.glassfish.jersey.containers" % "jersey-container-servlet-core" % "2.17",
      "org.glassfish.jersey.containers" % "jersey-container-jetty-http" % "2.17",
      "org.glassfish.jersey.media" % "jersey-media-json-jackson" % "2.17",
      "net.maffoo" %% "jsonquote-core" % "0.2.1",
      "org.labrad" %% "scalabrad" % "0.2.0-M6"
    ),

    jetty(port = 8080), // add jetty settings for xsbt-web-plugin

    postProcess := { webAppDir =>
      val gwtDir = (target in client).value / "war"
      val gwtFiles = gwtDir ** "*"

      for {
        src <- gwtFiles.get if src.isFile
        rel <- IO.relativizeFile(gwtDir, src)
        dst = IO.resolve(webAppDir, rel)
      } {
        IO.copyFile(src, dst, preserveLastModified = true)
      }
    }
  )
