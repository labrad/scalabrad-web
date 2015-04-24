package org.labrad.browser.server

import org.labrad.browser.client.connections.ManagerService
import org.labrad.browser.client.grapher.VaultService
import org.labrad.browser.client.nodes.NodeService
import org.labrad.browser.client.registry.RegistryService
import org.labrad.browser.client.server.InfoService

import com.google.inject.{Guice, Injector}
import com.google.inject.servlet.{GuiceServletContextListener, ServletModule}

import org.slf4j.LoggerFactory

class BrowserServletConfig extends GuiceServletContextListener {
  private val log = LoggerFactory.getLogger(classOf[BrowserServletConfig])

  override protected def getInjector = {
    log.info("Getting guice injector")

    Guice.createInjector(new ServletModule {
      override protected def configureServlets {
        log.info("configuring servlets")
        val moduleName = "/labradbrowser/"
        serve(moduleName + InfoService.PATH) `with` classOf[InfoServiceImpl]
        serve(moduleName + ManagerService.PATH) `with` classOf[ManagerServiceImpl]
        serve(moduleName + NodeService.PATH) `with` classOf[NodeServiceImpl]
        serve(moduleName + RegistryService.PATH) `with` classOf[RegistryServiceImpl]
        serve(moduleName + VaultService.PATH) `with` classOf[VaultServiceImpl]

        serve("/ws/echo") `with` classOf[MyEchoServlet]
      }
    })
  }
}
