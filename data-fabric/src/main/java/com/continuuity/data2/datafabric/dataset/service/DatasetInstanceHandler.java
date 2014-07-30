/*
 * Copyright 2012-2014 Continuuity, Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */

package com.continuuity.data2.datafabric.dataset.service;

import com.continuuity.api.dataset.DatasetProperties;
import com.continuuity.api.dataset.DatasetSpecification;
import com.continuuity.common.conf.CConfiguration;
import com.continuuity.common.conf.Constants;
import com.continuuity.common.exception.HandlerException;
import com.continuuity.data2.datafabric.dataset.instance.DatasetInstanceManager;
import com.continuuity.data2.datafabric.dataset.service.executor.DatasetAdminOpResponse;
import com.continuuity.data2.datafabric.dataset.service.executor.DatasetOpExecutor;
import com.continuuity.data2.datafabric.dataset.type.DatasetTypeManager;
import com.continuuity.explore.client.DatasetExploreFacade;
import com.continuuity.explore.service.ExploreException;
import com.continuuity.http.AbstractHttpHandler;
import com.continuuity.http.HttpResponder;
import com.continuuity.proto.DatasetInstanceConfiguration;
import com.continuuity.proto.DatasetMeta;
import com.continuuity.proto.DatasetTypeMeta;

import com.google.common.collect.ImmutableCollection;
import com.google.common.collect.ImmutableList;
import com.google.gson.Gson;
import com.google.inject.Inject;
import org.jboss.netty.buffer.ChannelBufferInputStream;
import org.jboss.netty.handler.codec.http.HttpRequest;
import org.jboss.netty.handler.codec.http.HttpResponseStatus;
import org.jboss.netty.handler.codec.http.QueryStringDecoder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.InputStreamReader;
import java.io.Reader;
import java.sql.SQLException;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import javax.ws.rs.DELETE;
import javax.ws.rs.GET;
import javax.ws.rs.POST;
import javax.ws.rs.PUT;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;

/**
 * Handles dataset instance management calls.
 */
// todo: do we want to make it authenticated? or do we treat it always as "internal" piece?
@Path(Constants.Gateway.GATEWAY_VERSION)
public class DatasetInstanceHandler extends AbstractHttpHandler {
  private static final Logger LOG = LoggerFactory.getLogger(DatasetInstanceHandler.class);
  private static final Gson GSON = new Gson();

  private final DatasetTypeManager implManager;
  private final DatasetInstanceManager instanceManager;
  private final DatasetOpExecutor opExecutorClient;
  private final DatasetExploreFacade datasetExploreFacade;

  private final CConfiguration conf;

  @Inject
  public DatasetInstanceHandler(DatasetTypeManager implManager, DatasetInstanceManager instanceManager,
                                DatasetOpExecutor opExecutorClient, DatasetExploreFacade datasetExploreFacade,
                                CConfiguration conf) {
    this.opExecutorClient = opExecutorClient;
    this.implManager = implManager;
    this.instanceManager = instanceManager;
    this.datasetExploreFacade = datasetExploreFacade;
    this.conf = conf;
  }

  @GET
  @Path("/data/datasets/")
  public void list(HttpRequest request, final HttpResponder responder) {
    Map<String, List<String>> queryParams = new QueryStringDecoder(request.getUri()).getParameters();
    boolean isMeta = queryParams.containsKey("meta") && queryParams.get("meta").contains("true");
    boolean explorableDatasetsOption = queryParams.containsKey("exploreEnabled")
      && (queryParams.get("exploreEnabled").contains("true") || queryParams.get("exploreEnabled").contains("false"));
    boolean getExplorableDatasets = explorableDatasetsOption && queryParams.get("exploreEnabled").contains("true");

    Collection<DatasetSpecification> datasetSpecifications = instanceManager.getAll();

    if (explorableDatasetsOption) {
      // Do a join of the list of datasets, and the list of Hive tables
      try {
        List<String> hiveTables = datasetExploreFacade.getExplorableDatasetsTableNames();
        ImmutableList.Builder<?> joinBuilder = ImmutableList.builder();

        for (DatasetSpecification spec : datasetSpecifications) {
          boolean isExplorable = hiveTables.contains(spec.getName().replace('.', '_').toLowerCase());
          if (isExplorable && getExplorableDatasets || !isExplorable && !getExplorableDatasets) {
            if (isMeta) {
              DatasetMeta meta = new DatasetMeta(spec, implManager.getTypeInfo(spec.getType()));
              if (isExplorable) {
                meta.addProperty("hive_table", meta.getSpec().getName().replace('.', '_').toLowerCase());
              }
              joinBuilder.add(meta);
            } else {
              joinBuilder.add(spec);
            }
          }
        }
        responder.sendJson(HttpResponseStatus.OK, joinBuilder.build());
        return;
      } catch (Throwable t) {
        LOG.error("Caught exception while listing explorable datasets", t);
        responder.sendStatus(HttpResponseStatus.INTERNAL_SERVER_ERROR);
        return;
      }
    }
    if (isMeta) {
      ImmutableList.Builder<DatasetMeta> builder = ImmutableList.builder();
      for (DatasetSpecification spec : datasetSpecifications) {
        builder.add(new DatasetMeta(spec, implManager.getTypeInfo(spec.getType())));
      }
      responder.sendJson(HttpResponseStatus.OK, builder.build());
    } else {
      responder.sendJson(HttpResponseStatus.OK, datasetSpecifications);
    }
  }

  @DELETE
  @Path("/data/unrecoverable/datasets/")
  public void deleteAll(HttpRequest request, final HttpResponder responder) throws Exception {
    if (!conf.getBoolean(Constants.Dangerous.UNRECOVERABLE_RESET,
                                  Constants.Dangerous.DEFAULT_UNRECOVERABLE_RESET)) {
      responder.sendStatus(HttpResponseStatus.FORBIDDEN);
      return;
    }

    boolean succeeded = true;
    for (DatasetSpecification spec : instanceManager.getAll()) {
      try {
        // It is okay if dataset not exists: someone may be deleting it at same time
        dropDataset(spec);
      } catch (Exception e) {
        String msg = String.format("Cannot delete dataset %s: executing delete() failed, reason: %s",
                                   spec.getName(), e.getMessage());
        LOG.warn(msg, e);
        succeeded = false;
        // we continue deleting if something wring happens.
        // todo: Will later be improved by doing all in async: see REACTOR-200
      }
    }

    responder.sendStatus(succeeded ? HttpResponseStatus.OK : HttpResponseStatus.INTERNAL_SERVER_ERROR);
  }

  @GET
  @Path("/data/datasets/{name}")
  public void getInfo(HttpRequest request, final HttpResponder responder,
                      @PathParam("name") String name) {
    DatasetSpecification spec = instanceManager.get(name);
    if (spec == null) {
      responder.sendStatus(HttpResponseStatus.NOT_FOUND);
    } else {
      DatasetMeta info = new DatasetMeta(spec, implManager.getTypeInfo(spec.getType()));
      responder.sendJson(HttpResponseStatus.OK, info);
    }
  }

  @PUT
  @Path("/data/datasets/{name}")
  public void add(HttpRequest request, final HttpResponder responder,
                  @PathParam("name") String name) {
    Reader reader = new InputStreamReader(new ChannelBufferInputStream(request.getContent()));

    DatasetInstanceConfiguration creationProperties = GSON.fromJson(reader, DatasetInstanceConfiguration.class);

    LOG.info("Creating dataset {}, type name: {}, creationProperties: {}", name, creationProperties.getTypeName(),
             creationProperties.getProperties());

    DatasetSpecification existing = instanceManager.get(name);
    if (existing != null) {
      String message = String.format("Cannot create dataset %s: instance with same name already exists %s",
                                     name, existing);
      LOG.warn(message);
      responder.sendError(HttpResponseStatus.CONFLICT, message);
      return;
    }

    DatasetTypeMeta typeMeta = implManager.getTypeInfo(creationProperties.getTypeName());
    if (typeMeta == null) {
      String message = String.format("Cannot create dataset %s: unknown type %s",
                                     name, creationProperties.getTypeName());
      LOG.warn(message);
      responder.sendError(HttpResponseStatus.NOT_FOUND, message);
      return;
    }

    // Note how we execute configure() via opExecutorClient (outside of ds service) to isolate running user code
    DatasetSpecification spec;
    try {
      spec = opExecutorClient.create(name, typeMeta, DatasetProperties.builder()
        .addAll(creationProperties.getProperties()).build());
    } catch (Exception e) {
      String msg = String.format("Cannot create dataset %s of type %s: executing create() failed, reason: %s",
                                 name, creationProperties.getTypeName(), e.getMessage());
      LOG.error(msg, e);
      throw new RuntimeException(msg, e);
    }
    instanceManager.add(spec);

    // Enable ad-hoc exploration of dataset
    // Note: today explore enable is not transactional with dataset create - REACTOR-314
    try {
      datasetExploreFacade.enableExplore(name);
    } catch (Exception e) {
      String msg = String.format("Cannot enable exploration of dataset instance %s of type %s: %s",
                                 name, creationProperties.getProperties(), e.getMessage());
      LOG.error(msg, e);
      // TODO: at this time we want to still allow using dataset even if it cannot be used for exploration
//      responder.sendError(HttpResponseStatus.INTERNAL_SERVER_ERROR, msg);
//      return;
    }

    responder.sendStatus(HttpResponseStatus.OK);
  }

  @DELETE
  @Path("/data/datasets/{name}")
  public void drop(HttpRequest request, final HttpResponder responder,
                       @PathParam("name") String name) {
    LOG.info("Deleting dataset {}", name);

    DatasetSpecification spec = instanceManager.get(name);
    if (spec == null) {
      responder.sendStatus(HttpResponseStatus.NOT_FOUND);
      return;
    }

    try {
      if (!dropDataset(spec)) {
        responder.sendStatus(HttpResponseStatus.NOT_FOUND);
        return;
      }
    } catch (Exception e) {
      String msg = String.format("Cannot delete dataset %s: executing delete() failed, reason: %s",
                                 name, e.getMessage());
      LOG.error(msg, e);
      throw new RuntimeException(msg, e);
    }

    responder.sendStatus(HttpResponseStatus.OK);
  }

  @POST
  @Path("/data/datasets/{name}/admin/{method}")
  public void executeAdmin(HttpRequest request, final HttpResponder responder,
                           @PathParam("name") String instanceName,
                           @PathParam("method") String method) {

    try {
      Object result = null;
      String message = null;

      // NOTE: one cannot directly call create and drop, instead this should be called thru
      //       POST/DELETE @ /data/datasets/{instance-id}. Because we must create/drop metadata for these at same time
      if (method.equals("exists")) {
        result = opExecutorClient.exists(instanceName);
      } else if (method.equals("truncate")) {
        opExecutorClient.truncate(instanceName);
      } else if (method.equals("upgrade")) {
        opExecutorClient.upgrade(instanceName);
      } else {
        throw new HandlerException(HttpResponseStatus.NOT_FOUND, "Invalid admin operation: " + method);
      }

      DatasetAdminOpResponse response = new DatasetAdminOpResponse(result, message);
      responder.sendJson(HttpResponseStatus.OK, response);
    } catch (HandlerException e) {
      LOG.debug("Handler error", e);
      responder.sendStatus(e.getFailureStatus());
    } catch (Exception e) {
      LOG.error("Error executing admin operation {} for dataset instance {}", method, instanceName, e);
      responder.sendStatus(HttpResponseStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @POST
  @Path("/data/datasets/{name}/data/{method}")
  public void executeDataOp(HttpRequest request, final HttpResponder responder,
                           @PathParam("name") String instanceName,
                           @PathParam("method") String method) {
    // todo: execute data operation
    responder.sendStatus(HttpResponseStatus.NOT_IMPLEMENTED);
  }

  /**
   * Drops a dataset.
   * @param spec specification of dataset to be dropped.
   * @return true if dropped successfully, false if dataset is not found.
   * @throws Exception on error.
   */
  private boolean dropDataset(DatasetSpecification spec) throws Exception {
    String name = spec.getName();

    // First disable ad-hoc exploration of dataset
    // Note: today explore disable is not transactional with dataset delete - REACTOR-314
    try {
      datasetExploreFacade.disableExplore(name);
    } catch (ExploreException e) {
      String msg = String.format("Cannot disable exploration of dataset instance %s: %s",
                                 name, e.getMessage());
      LOG.error(msg, e);
      // TODO: at this time we want to still drop dataset even if it cannot be disabled for exploration
//      throw e;
    }

    if (!instanceManager.delete(name)) {
      return false;
    }

    opExecutorClient.drop(spec, implManager.getTypeInfo(spec.getType()));
    return true;
  }
}
