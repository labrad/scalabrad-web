lazy val gwtModules = taskKey[Seq[String]]("the list of gwt modules to compile")
lazy val gwtCompile = taskKey[Unit]("invoke the gwt compiler")
lazy val gwtDevMode = taskKey[Unit]("invoke gwt dev mode")
lazy val gwtCodeServer = taskKey[Unit]("invoke gwt code server")

lazy val gwtVersion = "2.7.0"
lazy val jettyVersion = "8.1.12.v20130726" // this version is embedded in gwt 2.7
//lazy val jettyVersion = "9.2.6.v20141205"

lazy val root = (project in file(".")).settings(
  name := "scalabrad-web",
  version := "1.0-SNAPSHOT",
  scalaVersion := "2.11.6",
  resolvers ++= Seq(
    "bintray" at "http://jcenter.bintray.com",
    "bintray-maffoo" at "http://dl.bintray.com/maffoo/maven",
    "Local Maven Repository" at "file://"+Path.userHome.absolutePath+"/.m2/repository"
  ),
  libraryDependencies ++= Seq(
    "org.eclipse.jetty" % "jetty-continuation" % jettyVersion withSources(),
    "org.eclipse.jetty" % "jetty-server" % jettyVersion withSources(),
    "org.eclipse.jetty" % "jetty-util" % jettyVersion withSources(),
    "com.google.inject" % "guice" % "3.0" withSources() exclude("asm", "asm"),
    "com.google.inject.extensions" % "guice-servlet" % "3.0" withSources(),
    "com.google.gwt" % "gwt-codeserver" % gwtVersion withSources(),
    "com.google.gwt" % "gwt-dev" % gwtVersion withSources(),
    "com.google.gwt" % "gwt-elemental" % gwtVersion withSources(),
    "com.google.gwt" % "gwt-servlet" % gwtVersion withSources(),
    "com.google.gwt" % "gwt-user" % gwtVersion withSources(),
    "com.google.gwt.inject" % "gin" % "2.1.2" withSources(),
    "com.googlecode.gflot" % "gflot" % "3.3.0" withSources(),
    "org.eclipse.xtend" % "org.eclipse.xtend.lib.gwt" % "2.8.0" withSources(),
    "de.itemis.xtend" % "auto-gwt" % "1.0-SNAPSHOT",
    "org.labrad" %% "scalabrad" % "0.2.0-M3" withSources()
  ),

  unmanagedSourceDirectories in Compile += baseDirectory.value / "src" / "main" / "xtend-gen",
  // TODO: invoke xtend compiler before running compile...

  jetty(port = 8080), // add jetty settings for xsbt-web-plugin
  postProcess := { _ => gwtCompile.value }, // compile gwt before starting webapp

  gwtModules := Seq("org.labrad.browser.LabradBrowser"),
  gwtCompile := {
    val srcs = (sourceDirectories in Compile).value
    val classes = (fullClasspath in Compile).value.map(_.data)
    val cp = srcs ++ classes

    val warDir = (webappDest in webapp).value
    val args: Array[String] = Array(
      "-war", warDir.getAbsolutePath
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
  },
  gwtDevMode := {
    val srcs = (sourceDirectories in Compile).value
    val classes = (fullClasspath in Compile).value.map(_.data)
    val cp = srcs ++ classes

    val warDir = (webappDest in webapp).value
    val args: Array[String] = Array(
      "-war", warDir.getAbsolutePath,
      "-port", "7667"
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
    scalaRun.run("com.google.gwt.dev.DevMode", cp, args, streams.value.log)
  },
  gwtCodeServer := {
    val srcs = (sourceDirectories in Compile).value
    val classes = (fullClasspath in Compile).value.map(_.data)
    val cp = srcs ++ classes

    val args: Array[String] = Array(
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

