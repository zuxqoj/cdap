/*
 * Copyright © 2018 Cask Data, Inc.
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

package co.cask.cdap.report;

import co.cask.cdap.api.common.Bytes;
import co.cask.cdap.common.conf.Constants;
import co.cask.cdap.common.lang.ClassLoaders;
import co.cask.cdap.common.utils.Tasks;
import co.cask.cdap.report.proto.Filter;
import co.cask.cdap.report.proto.FilterDeserializer;
import co.cask.cdap.report.proto.RangeFilter;
import co.cask.cdap.report.proto.ReportContent;
import co.cask.cdap.report.proto.ReportGenerationInfo;
import co.cask.cdap.report.proto.ReportGenerationRequest;
import co.cask.cdap.report.proto.ReportSaveRequest;
import co.cask.cdap.report.proto.ReportStatus;
import co.cask.cdap.report.proto.Sort;
import co.cask.cdap.report.proto.ValueFilter;
import co.cask.cdap.test.ApplicationManager;
import co.cask.cdap.test.SparkManager;
import co.cask.cdap.test.TestBaseWithSpark2;
import co.cask.cdap.test.TestConfiguration;
import com.google.common.base.Charsets;
import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableSet;
import com.google.common.io.ByteStreams;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.reflect.TypeToken;
import org.junit.Assert;
import org.junit.Before;
import org.junit.ClassRule;
import org.junit.Ignore;
import org.junit.Test;
import org.junit.rules.TemporaryFolder;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.File;
import java.io.IOException;
import java.lang.reflect.Type;
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLConnection;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;
import java.util.concurrent.TimeUnit;

/**
 * Tests {@link ReportGenerationApp}.
 */
public class ReportGenerationAppTest extends TestBaseWithSpark2 {
  @ClassRule
  public static final TemporaryFolder TEMP_FOLDER = new TemporaryFolder();
  @ClassRule
  public static final TestConfiguration CONF = new TestConfiguration(Constants.Explore.EXPLORE_ENABLED, "false");

  private static final Logger LOG = LoggerFactory.getLogger(ReportGenerationAppTest.class);
  private static final Gson DES_GSON = new GsonBuilder()
    .registerTypeAdapter(Filter.class, new FilterDeserializer())
    .create();
  private static final Gson GSON = new Gson();
  private static final Type STRING_STRING_MAP = new TypeToken<Map<String, String>>() { }.getType();
  private static final Type REPORT_GEN_INFO_TYPE = new TypeToken<ReportGenerationInfo>() { }.getType();
  private static final Type REPORT_CONTENT_TYPE = new TypeToken<ReportContent>() { }.getType();
  private URL reportGenerationSparkUrl;

  @Before
  public void setupTest() throws Exception {
    URL avroUrl =
      ClassLoaders.getClassPathURL("com.databricks.spark.avro.DefaultSource",
                                   getClass().getClassLoader().getResource(
                                     "com/databricks/spark/avro/DefaultSource.class"));
    File jarFile = new File(avroUrl.toURI());
    ApplicationManager app =
      deployApplication(ReportGenerationApp.class, jarFile);
    SparkManager sparkManager = app.getSparkManager(ReportGenerationSpark.class.getSimpleName()).start();
    reportGenerationSparkUrl = sparkManager.getServiceURL(1, TimeUnit.MINUTES);
    Assert.assertNotNull(reportGenerationSparkUrl);
  }

  @Test
  public void testGenerateReportWithRealData() throws Exception {
    Assert.assertNotNull(reportGenerationSparkUrl);
    TimeUnit.SECONDS.sleep(10);
    URL reportURL = reportGenerationSparkUrl.toURI().resolve("reports/").toURL();
    List<Filter> filters =
      ImmutableList.of(
        new ValueFilter<>("namespace", ImmutableSet.of("default"), null));
    long now = TimeUnit.MILLISECONDS.toSeconds(System.currentTimeMillis());
    ReportGenerationRequest request =
      new ReportGenerationRequest("report1", now - 3600, now, ImmutableList.of("namespace", "applicationName",
                                                                               "programType", "program", "run",
                                                                               "status", "start"),
                                  ImmutableList.of(
                                    new Sort("duration", Sort.Order.DESCENDING)),
                                  filters);
    // generate a new report with the request
    HttpURLConnection urlConn = (HttpURLConnection) reportURL.openConnection();
    urlConn.setDoOutput(true);
    urlConn.setRequestMethod("POST");
    urlConn.getOutputStream().write(GSON.toJson(request).getBytes(StandardCharsets.UTF_8));
    if (urlConn.getErrorStream() != null) {
      Assert.fail(Bytes.toString(ByteStreams.toByteArray(urlConn.getErrorStream())));
    }
    Assert.assertEquals(200, urlConn.getResponseCode());
    Map<String, String> reportIdMap = getResponseObject(urlConn, STRING_STRING_MAP);
    String reportId = reportIdMap.get("id");
    Assert.assertNotNull(reportId);
    URL reportStatusURL = reportURL.toURI().resolve(reportId + "/").toURL();
    Tasks.waitFor(ReportStatus.COMPLETED, () -> {
      ReportGenerationInfo reportGenerationInfo = getResponseObject(reportStatusURL.openConnection(),
                                                                    REPORT_GEN_INFO_TYPE);
      if (ReportStatus.FAILED.equals(reportGenerationInfo.getStatus())) {
        Assert.fail("Report generation failed");
      }
      return reportGenerationInfo.getStatus();
    }, 5, TimeUnit.MINUTES, 2, TimeUnit.SECONDS);
    // assert that the expiry time is not null when the report is generated without saving
    ReportGenerationInfo reportGenerationInfo = getResponseObject(reportStatusURL.openConnection(),
                                                                  REPORT_GEN_INFO_TYPE);
    Assert.assertNotNull(reportGenerationInfo.getExpiry());
    // read the report's details
    URL reportRunsURL = reportStatusURL.toURI().resolve("details").toURL();
    ReportContent reportContent = getResponseObject(reportRunsURL.openConnection(), REPORT_CONTENT_TYPE);
    LOG.info(reportContent.toString());
  }

  @Ignore
  @Test
  public void testGenerateReport() throws Exception {
    Assert.assertNotNull(reportGenerationSparkUrl);
    URL reportURL = reportGenerationSparkUrl.toURI().resolve("reports/").toURL();
    List<Filter> filters =
      ImmutableList.of(
        new ValueFilter<>("namespace", ImmutableSet.of("ns1", "ns2"), null),
        new RangeFilter<>("duration", new RangeFilter.Range<>(500L, null)));
    ReportGenerationRequest request =
      new ReportGenerationRequest("report1", 1520808000L, 1520808301L, ImmutableList.of("namespace", "duration"),
                                  ImmutableList.of(
                                    new Sort("duration",
                                             Sort.Order.DESCENDING)),
                                  filters);
    // generate a new report with the request
    HttpURLConnection urlConn = (HttpURLConnection) reportURL.openConnection();
    urlConn.setDoOutput(true);
    urlConn.setRequestMethod("POST");
    urlConn.getOutputStream().write(GSON.toJson(request).getBytes(StandardCharsets.UTF_8));
    if (urlConn.getErrorStream() != null) {
      Assert.fail(Bytes.toString(ByteStreams.toByteArray(urlConn.getErrorStream())));
    }
    Assert.assertEquals(200, urlConn.getResponseCode());
    Map<String, String> reportIdMap = getResponseObject(urlConn, STRING_STRING_MAP);
    String reportId = reportIdMap.get("id");
    Assert.assertNotNull(reportId);
    URL reportStatusURL = reportURL.toURI().resolve(reportId + "/").toURL();
    Tasks.waitFor(ReportStatus.COMPLETED, () -> {
      ReportGenerationInfo reportGenerationInfo = getResponseObject(reportStatusURL.openConnection(),
                                                                    REPORT_GEN_INFO_TYPE);
      if (ReportStatus.FAILED.equals(reportGenerationInfo.getStatus())) {
        Assert.fail("Report generation failed");
      }
      return reportGenerationInfo.getStatus();
    }, 5, TimeUnit.MINUTES, 2, TimeUnit.SECONDS);
    // assert that the expiry time is not null when the report is generated without saving
    ReportGenerationInfo reportGenerationInfo = getResponseObject(reportStatusURL.openConnection(),
                                                                  REPORT_GEN_INFO_TYPE);
    Assert.assertNotNull(reportGenerationInfo.getExpiry());
    // read the report's details
    URL reportRunsURL = reportStatusURL.toURI().resolve("details").toURL();
    ReportContent reportContent = getResponseObject(reportRunsURL.openConnection(), REPORT_CONTENT_TYPE);
    Assert.assertEquals(2, reportContent.getTotal());
    // save the report with a new name and description
    URL reportSaveURL = reportURL.toURI().resolve(reportId + "/" + "save").toURL();
    urlConn = (HttpURLConnection) reportSaveURL.openConnection();
    urlConn.setDoOutput(true);
    urlConn.setRequestMethod("POST");
    urlConn.getOutputStream().write(GSON.toJson(new ReportSaveRequest("newName", "newDescription"))
                                      .getBytes(StandardCharsets.UTF_8));
    if (urlConn.getErrorStream() != null) {
      Assert.fail(Bytes.toString(ByteStreams.toByteArray(urlConn.getErrorStream())));
    }
    Assert.assertEquals(200, urlConn.getResponseCode());
    // verify that the name and description of the report have been updated, and the expiry time is null
    reportGenerationInfo = getResponseObject(reportStatusURL.openConnection(), REPORT_GEN_INFO_TYPE);
    Assert.assertEquals("newName", reportGenerationInfo.getName());
    Assert.assertEquals("newDescription", reportGenerationInfo.getDescription());
    Assert.assertNull(reportGenerationInfo.getExpiry());
  }

  @Ignore
  @Test
  public void testGenerateReportFailed() throws Exception {
    Assert.assertNotNull(reportGenerationSparkUrl);
    URL reportURL = reportGenerationSparkUrl.toURI().resolve("reports/").toURL();
    List<Filter> filters =
      ImmutableList.of(
        new ValueFilter<>("namespace", ImmutableSet.of("ns1", "ns2"), null),
        new RangeFilter<>("duration", new RangeFilter.Range<>(500L, null)));
    ReportGenerationRequest request =
      new ReportGenerationRequest("report1", 1520808000L, 1520808301L,
                                  ImmutableList.of("namespace", "duration", "artifact.name"),
                                  ImmutableList.of(
                                    new Sort("duration",
                                             Sort.Order.DESCENDING)),
                                  filters);
    HttpURLConnection urlConn = (HttpURLConnection) reportURL.openConnection();
    urlConn.setDoOutput(true);
    urlConn.setRequestMethod("POST");
    urlConn.getOutputStream().write(GSON.toJson(request).getBytes(StandardCharsets.UTF_8));
    if (urlConn.getErrorStream() != null) {
      Assert.fail(Bytes.toString(ByteStreams.toByteArray(urlConn.getErrorStream())));
    }
    Assert.assertEquals(200, urlConn.getResponseCode());
    Map<String, String> reportIdMap = getResponseObject(urlConn, STRING_STRING_MAP);
    String reportId = reportIdMap.get("id");
    Assert.assertNotNull(reportId);
    URL reportStatusURL = reportURL.toURI().resolve(reportId + "/").toURL();
    Tasks.waitFor(ReportStatus.FAILED, () -> {
      ReportGenerationInfo reportGenerationInfo = getResponseObject(reportStatusURL.openConnection(),
                                                                    REPORT_GEN_INFO_TYPE);
      if (ReportStatus.COMPLETED.equals(reportGenerationInfo.getStatus())) {
        Assert.fail("Report generation did not fail as expected");
      }
      return reportGenerationInfo.getStatus();
    }, 5, TimeUnit.MINUTES, 2, TimeUnit.SECONDS);
    ReportGenerationInfo reportGenerationInfo = getResponseObject(reportStatusURL.openConnection(),
                                                                  REPORT_GEN_INFO_TYPE);
    LOG.info("Failure reason: {}", reportGenerationInfo.getError());
    Assert.assertNotNull(reportGenerationInfo.getError());
  }

  private static <T> T getResponseObject(URLConnection urlConnection, Type typeOfT) throws IOException {
    String response;
    try {
      response = new String(ByteStreams.toByteArray(urlConnection.getInputStream()), Charsets.UTF_8);
    } finally {
      ((HttpURLConnection) urlConnection).disconnect();
    }
    LOG.info(response);
    return DES_GSON.fromJson(response, typeOfT);
  }
}
