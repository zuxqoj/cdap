/*
 * com.continuuity - Copyright (c) 2012 Continuuity Inc. All rights reserved.
 */
package com.continuuity;

import ch.qos.logback.classic.Logger;
import com.continuuity.app.guice.BigMamaModule;
import com.continuuity.common.conf.CConfiguration;
import com.continuuity.common.conf.Constants;
import com.continuuity.common.service.ServerException;
import com.continuuity.common.utils.Copyright;
import com.continuuity.common.utils.PortDetector;
import com.continuuity.common.zookeeper.InMemoryZookeeper;
import com.continuuity.data.runtime.DataFabricModules;
import com.continuuity.gateway.Gateway;
import com.continuuity.gateway.runtime.GatewayModules;
import com.continuuity.internal.app.services.AppFabricServer;
import com.continuuity.metadata.MetadataServerInterface;
import com.continuuity.metrics2.collector.MetricsCollectionServerInterface;
import com.continuuity.metrics2.frontend.MetricsFrontendServerInterface;
import com.continuuity.runtime.MetadataModules;
import com.continuuity.runtime.MetricsModules;
import com.google.common.collect.ImmutableList;
import com.google.common.util.concurrent.Service;
import com.google.inject.Guice;
import com.google.inject.Injector;
import com.google.inject.Module;
import org.apache.commons.lang.StringUtils;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.PrintStream;
import java.net.InetAddress;

/**
 * Singlenode Main
 * NOTE: Use AbstractIdleService
 */
public class SingleNodeMain {
  private InMemoryZookeeper zookeeper;
  private final WebCloudAppService webCloudAppService;
  private Gateway gateway;
  private MetricsCollectionServerInterface overlordCollection;
  private MetricsFrontendServerInterface overloadFrontend;
  private MetadataServerInterface metaDataServer;
  private AppFabricServer appFabricServer;
  private static final String ZOOKEEPER_DATA_DIR = "data/zookeeper";
  private final CConfiguration configuration;
  private final ImmutableList<Module> modules;

  public SingleNodeMain(ImmutableList<Module> modules, CConfiguration configuration) {
    this.modules = modules;
    this.configuration = configuration;
    this.webCloudAppService = new WebCloudAppService();
    Runtime.getRuntime().addShutdownHook(new Thread() {
      @Override
      public void run() {
        try {
          webCloudAppService.stop(true);
        } catch (ServerException e) {
          System.err.println("Failed to shutdown node web cloud app");
        }
      }
    });
  }

  /**
   * Start the service.
   */
  protected void startUp(String[] args) throws Exception {
    Copyright.print();

    // Create temporary directory where zookeeper data files will be stored.
    File temporaryDir = new File(ZOOKEEPER_DATA_DIR);
    temporaryDir.mkdir();
    int port = PortDetector.findFreePort();
    zookeeper = new InMemoryZookeeper(port, temporaryDir);
    configuration.set(Constants.CFG_ZOOKEEPER_ENSEMBLE, zookeeper.getConnectionString());

    Injector injector = Guice.createInjector(modules);

    gateway = injector.getInstance(Gateway.class);
    overlordCollection = injector.getInstance(MetricsCollectionServerInterface.class);
    overloadFrontend = injector.getInstance(MetricsFrontendServerInterface.class);
    metaDataServer = injector.getInstance(MetadataServerInterface.class);
    appFabricServer = injector.getInstance(AppFabricServer.class);

    // Start all the services.
    Service.State state = appFabricServer.startAndWait();
    if(state != Service.State.RUNNING) {
      throw new Exception("Unable to start Application Fabric.");
    }

    metaDataServer.start(args, configuration);
    overlordCollection.start(args, configuration);
    overloadFrontend.start(args, configuration);
    gateway.start(args, configuration);
    //webCloudAppService.start(args, configuration);

    String hostname = InetAddress.getLocalHost().getHostName();
    System.out.println("Continuuity Devsuite AppFabric started successfully. Connect to dashboard at "
                       + "http://" + hostname + ":9999");
  }

  /**
   * Shutdown the service.
   */
  public void shutDown() {
    try {
      //webCloudAppService.stop(true);
      gateway.stop(true);
      metaDataServer.stop(true);
      overloadFrontend.stop(true);
      overlordCollection.stop(true);
      metaDataServer.stop(true);
      appFabricServer.startAndWait();
    } catch (ServerException e) {
      // There is nothing we can do.
    }
  }

  /**
   * Print the usage statement and return null.
   *
   * @param error indicates whether this was invoked as the result of an error
   * @throws IllegalArgumentException in case of error
   */
  static void usage(boolean error) {

    // Which output stream should we use?
    PrintStream out = (error ? System.err : System.out);

    // Print our generic Copyright
    Copyright.print(out);

    // And our requirements and usage
    out.println("Requirements: ");
    out.println("  Java:    JDK 1.6+ must be installed and JAVA_HOME environment variable set to the java executable");
    out.println("  Node.js: Node.js must be installed (obtain from http://nodejs.org/#download).  ");
    out.println("           The \"node\" executable must be in the system $PATH environment variable");
    out.println("");
    out.println("Usage: ");
    out.println("  ./continuuity-app-fabric [options]");
    out.println("");
    out.println("Additional options:");
    out.println("  --help      To print this message");
    out.println("  --in-memory To run everything in memory");
    out.println("");

    if (error) {
      throw new IllegalArgumentException();
    }
  }

  /**
   * The root of all goodness!
   *
   * @param args Our cmdline arguments
   */
  public static void main(String[] args) {
    boolean inMemory = true;

    // We only support 'help' command line options currently
    if (args.length > 0) {
      if ("--help".equals(args[0]) || "-h".equals(args[0])) {
        usage(false);
        return;
      } else if ("--in-memory".equals(args[0])) {
        inMemory = true;
      } else {
        usage(true);
      }
    }

    CConfiguration configuration = CConfiguration.create();

    ImmutableList<Module> inMemoryModules = ImmutableList.of(
      new BigMamaModule(configuration),
      new MetricsModules().getInMemoryModules(),
      new GatewayModules().getInMemoryModules(),
      new DataFabricModules().getInMemoryModules(),
      new MetadataModules().getInMemoryModules()
    );

    ImmutableList<Module> singleNodeModules = ImmutableList.of(
      new BigMamaModule(configuration),
      new MetricsModules().getSingleNodeModules(),
      new GatewayModules().getSingleNodeModules(),
      new DataFabricModules().getSingleNodeModules(),
      new MetadataModules().getSingleNodeModules()
    );

    SingleNodeMain main = inMemory ? new SingleNodeMain(inMemoryModules, configuration)
      : new SingleNodeMain(singleNodeModules, configuration);
    try {
      main.startUp(args);
    } catch (Exception e) {
      main.shutDown();
      System.err.println("Failed to start server. " + e.getMessage());
    }
  }

} // end of SingleNodeMain class
