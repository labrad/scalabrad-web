package org.labrad.browser.client.message;

import org.fusesource.restygwt.client.JsonEncoderDecoder;
import org.labrad.browser.common.message.LabradConnectMessage;
import org.labrad.browser.common.message.LabradDisconnectMessage;
import org.labrad.browser.common.message.NodeServerMessage;
import org.labrad.browser.common.message.NodeStatusMessage;
import org.labrad.browser.common.message.RegistryDirMessage;
import org.labrad.browser.common.message.RegistryKeyMessage;
import org.labrad.browser.common.message.ServerConnectMessage;
import org.labrad.browser.common.message.ServerDisconnectMessage;

import com.google.gwt.core.client.GWT;

public class Codecs {
  public static interface LabradConnectCodec extends JsonEncoderDecoder<LabradConnectMessage> {}
  public static final LabradConnectCodec labradConnect = GWT.create(LabradConnectCodec.class);

  public static interface LabradDisconnectCodec extends JsonEncoderDecoder<LabradDisconnectMessage> {}
  public static final LabradDisconnectCodec labradDisconnect = GWT.create(LabradDisconnectCodec.class);

  public static interface NodeServerCodec extends JsonEncoderDecoder<NodeServerMessage> {}
  public static final NodeServerCodec nodeServer = GWT.create(NodeServerCodec.class);

  public static interface NodeStatusCodec extends JsonEncoderDecoder<NodeStatusMessage> {}
  public static final NodeStatusCodec nodeStatus = GWT.create(NodeStatusCodec.class);

  public static interface RegistryDirCodec extends JsonEncoderDecoder<RegistryDirMessage> {}
  public static final RegistryDirCodec registryDir = GWT.create(RegistryDirCodec.class);

  public static interface RegistryKeyCodec extends JsonEncoderDecoder<RegistryKeyMessage> {}
  public static final RegistryKeyCodec registryKey = GWT.create(RegistryKeyCodec.class);

  public static interface ServerConnectCodec extends JsonEncoderDecoder<ServerConnectMessage> {}
  public static final ServerConnectCodec serverConnect = GWT.create(ServerConnectCodec.class);

  public static interface ServerDisconnectCodec extends JsonEncoderDecoder<ServerDisconnectMessage> {}
  public static final ServerDisconnectCodec serverDisconnect = GWT.create(ServerDisconnectCodec.class);
}