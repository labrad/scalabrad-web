addSbtPlugin("com.earldouglas" % "xsbt-web-plugin" % "1.0.0")

addSbtPlugin("com.typesafe.sbteclipse" % "sbteclipse-plugin" % "3.0.0")

// dependencies needed to compile xtend
libraryDependencies ++= Seq(
  "org.eclipse.xtend" % "org.eclipse.xtend.lib" % "2.8.1",
  "org.eclipse.xtext" % "org.eclipse.xtext.xbase.lib" % "2.8.1",
  "org.eclipse.xtext" % "org.eclipse.xtext.builder.standalone" % "2.8.1",
  "org.eclipse.emf" % "codegen" % "2.2.3"
)