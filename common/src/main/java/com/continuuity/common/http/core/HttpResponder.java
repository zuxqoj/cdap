/*
 * Copyright 2012-2013 Continuuity,Inc. All Rights Reserved.
 */
package com.continuuity.common.http.core;

import com.google.common.base.Charsets;
import com.google.common.base.Preconditions;
import com.google.common.base.Throwables;
import com.google.common.collect.ImmutableMultimap;
import com.google.common.collect.Multimap;
import com.google.gson.Gson;
import com.google.gson.stream.JsonWriter;
import org.jboss.netty.buffer.ChannelBuffer;
import org.jboss.netty.buffer.ChannelBufferOutputStream;
import org.jboss.netty.buffer.ChannelBuffers;
import org.jboss.netty.channel.Channel;
import org.jboss.netty.channel.ChannelFuture;
import org.jboss.netty.channel.ChannelFutureListener;
import org.jboss.netty.handler.codec.http.DefaultHttpChunk;
import org.jboss.netty.handler.codec.http.DefaultHttpChunkTrailer;
import org.jboss.netty.handler.codec.http.DefaultHttpResponse;
import org.jboss.netty.handler.codec.http.HttpHeaders;
import org.jboss.netty.handler.codec.http.HttpResponse;
import org.jboss.netty.handler.codec.http.HttpResponseStatus;
import org.jboss.netty.handler.codec.http.HttpVersion;

import java.io.IOException;
import java.io.OutputStreamWriter;
import java.util.Collection;
import java.util.Map;

/**
 * HttpResponder responds back to the client that initiated the request. Caller can use sendJson method to respond
 * back to the client in json format.
 */
public class HttpResponder {
  private final Channel channel;
  private final boolean keepalive;

  public HttpResponder(Channel channel, boolean keepalive) {
    this.channel = channel;
    this.keepalive = keepalive;
  }

  /**
   * Sends json response back to the client.
   * @param status Status of the response.
   * @param object Object that will be serialized into Json and sent back as content.
   */
  public void sendJson(HttpResponseStatus status, Object object){
    try {
      ChannelBuffer channelBuffer = ChannelBuffers.dynamicBuffer();
      JsonWriter jsonWriter = new JsonWriter(new OutputStreamWriter(new ChannelBufferOutputStream(channelBuffer),
                                                                    Charsets.UTF_8));
      new Gson().toJson(object, object.getClass(), jsonWriter);
      jsonWriter.close();

      sendContent(status, channelBuffer, "application/json", ImmutableMultimap.<String, String>of());
    } catch (IOException e) {
      throw Throwables.propagate(e);
    }
  }

  /**
   * Send a string response back to the http client.
   * @param status status of the Http response.
   * @param data string data to be sent back.
   */
  public void sendString(HttpResponseStatus status, String data){
    try {
      ChannelBuffer channelBuffer = ChannelBuffers.wrappedBuffer(Charsets.UTF_8.encode(data));
      sendContent(status, channelBuffer, "text/plain; charset=utf-8", ImmutableMultimap.<String, String>of());
    } catch (Exception e) {
      throw Throwables.propagate(e);
    }
  }

  /**
   * Send only a status code back to client without any content.
   * @param status status of the Http response.
   */
  public void sendStatus(HttpResponseStatus status) {
    sendContent(status, null, null, ImmutableMultimap.<String, String>of());
  }

  /**
   * Send a response containing raw bytes. Sets "application/octet-stream" as content type header.
   * @param status status of the Http response.
   * @param bytes bytes to be sent back.
   * @param headers headers to be sent back. This will overwrite any headers set by the framework.
   */
  public void sendByteArray(HttpResponseStatus status, byte [] bytes, Multimap<String, String> headers) {
    ChannelBuffer channelBuffer = ChannelBuffers.wrappedBuffer(bytes);
    sendContent(status, channelBuffer, "application/octet-stream", headers);
  }

  /**
   * Sends error message back to the client.
   *
   * @param status Status of the response.
   * @param errorMessage Error message sent back to the client.
   */
  public void sendError(HttpResponseStatus status, String errorMessage){
    Preconditions.checkArgument(!status.equals(HttpResponseStatus.OK), "Response status cannot be OK for errors");

    ChannelBuffer errorContent = ChannelBuffers.wrappedBuffer(Charsets.UTF_8.encode(errorMessage));
    sendContent(status, errorContent, "text/plain; charset=utf-8", ImmutableMultimap.<String, String>of());
  }

  /**
   * Respond to the client saying the response will be in chunks. Add chunks to response using @{link sendChunk}
   * and @{link sendChunkEnd}.
   * @param status  the status code to respond with. Defaults to 200-OK if null.
   * @param headers additional headers to send with the response. May be null.
   */
  public void sendChunkStart(HttpResponseStatus status, Multimap<String, String> headers) {
    HttpResponse response = new DefaultHttpResponse(
      HttpVersion.HTTP_1_1, status != null ? status : HttpResponseStatus.OK);

    if (headers != null) {
      for (Map.Entry<String, Collection<String>> entry : headers.asMap().entrySet()) {
        response.setHeader(entry.getKey(), entry.getValue());
      }
    }

    response.setChunked(true);
    response.setHeader(HttpHeaders.Names.TRANSFER_ENCODING, HttpHeaders.Values.CHUNKED);
    channel.write(response);
  }

  /**
   * Add a chunk of data to the response. @{link sendChunkStart} should be called before calling this method.
   * @{link sendChunkEnd} should be called after all chunks are done.
   * @param content the chunk of content to send
   */
  public void sendChunk(ChannelBuffer content) {
    channel.write(new DefaultHttpChunk(content));
  }

  /**
   * Called after all chunks are done. This keeps the connection alive
   * unless specified otherwise in the original request.
   */
  public void sendChunkEnd() {
    ChannelFuture future = channel.write(new DefaultHttpChunkTrailer());
    if (!keepalive) {
      future.addListener(ChannelFutureListener.CLOSE);
    }
  }

  /**
   * Send response back to client.
   * @param status Status of the response.
   * @param content Content to be sent back.
   * @param contentType Type of content.
   * @param headers Headers to be sent back.
   */
  public void sendContent(HttpResponseStatus status, ChannelBuffer content, String contentType,
                           Multimap<String, String> headers){
    HttpResponse response = new DefaultHttpResponse(HttpVersion.HTTP_1_1, status);

    if (content != null) {
      response.setContent(content);
      response.setHeader(HttpHeaders.Names.CONTENT_TYPE, contentType);
      response.setHeader(HttpHeaders.Names.CONTENT_LENGTH, content.readableBytes());
    } else {
      response.setHeader(HttpHeaders.Names.CONTENT_LENGTH, 0);
    }

    if (keepalive) {
      response.setHeader(HttpHeaders.Names.CONNECTION, HttpHeaders.Values.KEEP_ALIVE);
    }

    // Add headers, note will override all headers set by the framework
    if (headers != null) {
      for (Map.Entry<String, Collection<String>> entry : headers.asMap().entrySet()) {
        response.setHeader(entry.getKey(), entry.getValue());
      }
    }

    ChannelFuture future = channel.write(response);
    if (!keepalive) {
      future.addListener(ChannelFutureListener.CLOSE);
    }
  }
}
