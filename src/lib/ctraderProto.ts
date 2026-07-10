import protobuf from "protobufjs";

// Proto schema definition for cTrader Open API V2
const cTraderProtoStr = `
syntax = "proto2";

package cTrader;

enum ProtoPayloadType {
    PROTO_MESSAGE = 50;
    PING_REQ = 52;
    PING_RES = 53;
    
    // Open API V2 specific types
    OA_APPLICATION_AUTH_REQ = 2100;
    OA_APPLICATION_AUTH_RES = 2101;
    OA_ACCOUNT_AUTH_REQ = 2102;
    OA_ACCOUNT_AUTH_RES = 2103;
    OA_SYMBOLS_LIST_REQ = 2114;
    OA_SYMBOLS_LIST_RES = 2115;
    OA_SUBSCRIBE_SPOTS_REQ = 2137;
    OA_SUBSCRIBE_SPOTS_RES = 2138;
    OA_SPOT_EVENT = 2140;
    OA_NEW_ORDER_REQ = 2106;
    OA_EXECUTION_EVENT = 2126;
    OA_CLOSE_POSITION_REQ = 2111;
    OA_TRADER_REQ = 2121;
    OA_TRADER_RES = 2122;
    OA_RECONCILE_REQ = 2124;
    OA_RECONCILE_RES = 2125;
    OA_MODIFY_POSITION_SL_TP_REQ = 2107;
    OA_MODIFY_POSITION_SL_TP_RES = 2108;
    OA_GET_ACCOUNTS_BY_ACCESS_TOKEN_REQ = 2149;
    OA_GET_ACCOUNTS_BY_ACCESS_TOKEN_RES = 2150;
    OA_ERROR_RES = 2142;
}

message ProtoOAErrorRes {
    optional int64 ctidTraderAccountId = 1;
    required string errorCode = 2;
    optional string description = 3;
}

message ProtoMessage {
    required uint32 payloadType = 1;
    optional bytes payload = 2;
    optional string clientMsgId = 3;
}

message ProtoPingReq {
    required uint64 timestamp = 1;
}

message ProtoPingRes {
    required uint64 timestamp = 1;
}

message ProtoOAApplicationAuthReq {
    required string clientId = 1;
    required string clientSecret = 2;
}

message ProtoOAApplicationAuthRes {
    // Empty res means success
}

message ProtoOAAccountAuthReq {
    required int64 ctidTraderAccountId = 1;
    required string accessToken = 2;
}

message ProtoOAAccountAuthRes {
    required int64 ctidTraderAccountId = 1;
}

message ProtoOASymbolsListReq {
    required int64 ctidTraderAccountId = 1;
    optional bool includeDeleted = 2 [default = false];
}

message ProtoOASymbol {
    required int64 symbolId = 1;
    required string symbolName = 2;
    optional string baseAsset = 3;
    optional string quoteAsset = 4;
}

message ProtoOASymbolsListRes {
    required int64 ctidTraderAccountId = 1;
    repeated ProtoOASymbol symbol = 2;
}

message ProtoOASubscribeSpotsReq {
    required int64 ctidTraderAccountId = 1;
    repeated int64 symbolId = 2;
}

message ProtoOASubscribeSpotsRes {
    required int64 ctidTraderAccountId = 1;
}

message ProtoOASpotEvent {
    required int64 ctidTraderAccountId = 1;
    required int64 symbolId = 2;
    optional uint64 bid = 3;
    optional uint64 ask = 4;
    repeated ProtoOATrendbar trendbar = 5;
}

enum ProtoOATrendbarPeriod {
    M1 = 1;
    M5 = 2;
    M15 = 3;
    M30 = 4;
    H1 = 5;
    H4 = 6;
    D1 = 7;
}

message ProtoOATrendbar {
    required uint64 volume = 1;
    optional ProtoOATrendbarPeriod period = 2 [default = M1];
    optional uint64 low = 3;
    optional uint32 deltaOpen = 4;
    optional uint32 deltaHigh = 5;
    optional uint32 deltaClose = 6;
    optional uint32 utcTimestampInMinutes = 7;
}

message ProtoOANewOrderReq {
    required int64 ctidTraderAccountId = 1;
    required int64 symbolId = 2;
    required uint32 orderType = 3; // 1 = MARKET, 2 = LIMIT, etc.
    required uint32 tradeSide = 4; // 1 = BUY, 2 = SELL
    required uint64 volume = 5; // multiplied by 100
    optional double limitPrice = 6;
    optional double stopPrice = 7;
    optional uint64 slTriggerMethod = 8;
    optional double stopLoss = 9;
    optional double takeProfit = 10;
    optional string comment = 11;
}

message ProtoOAExecutionEvent {
    required int64 ctidTraderAccountId = 1;
    required uint32 executionType = 2; // ORDER_ACCEPTED, ORDER_FILLED, etc.
    optional ProtoOAPosition position = 3;
    optional ProtoOAOrder order = 4;
}

message ProtoOAPosition {
    required int64 positionId = 1;
    required int64 symbolId = 2;
    required uint32 tradeSide = 3; // 1 = BUY, 2 = SELL
    required uint64 volume = 4;
    required double entryPrice = 5;
    optional double stopLoss = 6;
    optional double takeProfit = 7;
    optional int64 utcLastUpdateTimestamp = 8;
}

message ProtoOAOrder {
    required int64 orderId = 1;
    required int64 symbolId = 2;
    required uint32 orderType = 3;
    required uint32 tradeSide = 4;
}

message ProtoOAClosePositionReq {
    required int64 ctidTraderAccountId = 1;
    required int64 positionId = 2;
    required uint64 volume = 3; // volume to close (multiplied by 100, or total)
}

message ProtoOAModifyPositionSLTPReq {
    required int64 ctidTraderAccountId = 1;
    required int64 positionId = 2;
    optional double stopLoss = 3;
    optional double takeProfit = 4;
}

message ProtoOAModifyPositionSLTPRes {
    required int64 ctidTraderAccountId = 1;
    required int64 positionId = 2;
}

message ProtoOActidTraderAccount {
    required int64 ctidTraderAccountId = 1;
    optional bool isLive = 2;
    optional int64 traderLogin = 3;
}

message ProtoOAGetAccountListByAccessTokenReq {
    required string accessToken = 1;
}

message ProtoOAGetAccountListByAccessTokenRes {
    required string accessToken = 1;
    repeated ProtoOActidTraderAccount ctidTraderAccount = 2;
}

message ProtoOAGetAccountsByAccessTokenReq {
    required string accessToken = 1;
}

message ProtoOAGetAccountsByAccessTokenRes {
    required string accessToken = 1;
    repeated ProtoOActidTraderAccount ctidTraderAccount = 2;
}

message ProtoOATrader {
    required int64 traderLogin = 1;
    optional string brokerName = 2;
    optional string traderType = 3;
    optional int64 balance = 4;
    optional int64 balanceVersion = 5;
    optional string currency = 6;
    optional uint32 depositAssetId = 7;
    optional bool swapFree = 8;
    optional uint32 leverageInCents = 9;
    optional int64 leverage = 10;
}

message ProtoOATraderReq {
    required int64 ctidTraderAccountId = 1;
}

message ProtoOATraderRes {
    required int64 ctidTraderAccountId = 1;
    required ProtoOATrader trader = 2;
}

message ProtoOAReconcileReq {
    required int64 ctidTraderAccountId = 1;
}

message ProtoOAReconcileRes {
    required int64 ctidTraderAccountId = 1;
    repeated ProtoOAPosition position = 2;
    repeated ProtoOAOrder order = 3;
}
`;

// Parse the schema
const parsed = protobuf.parse(cTraderProtoStr);
const root = parsed.root;

// Helper to wrap a buffer in cTrader length-prefixed format (4-byte header for size)
export function encodeFrame(payloadType: number, payloadBytes: Uint8Array, clientMsgId?: string): Uint8Array {
  const ProtoMessage = root.lookupType("cTrader.ProtoMessage");
  
  const msgObj = {
    payloadType,
    payload: payloadBytes,
    clientMsgId: clientMsgId || Math.random().toString(36).substring(7)
  };
  
  const err = ProtoMessage.verify(msgObj);
  if (err) throw Error("Protobuf verification failed: " + err);
  
  const serializedMsg = ProtoMessage.encode(ProtoMessage.create(msgObj)).finish();
  
  // Frame format: [4 bytes length][serialized message]
  const framed = new Uint8Array(4 + serializedMsg.length);
  const view = new DataView(framed.buffer);
  view.setUint32(0, serializedMsg.length, false); // Big endian size
  framed.set(serializedMsg, 4);
  
  return framed;
}

// Decode a length-prefixed cTrader message from buffer
export function decodeFrame(framedBuffer: Uint8Array): { payloadType: number; payload: Uint8Array; clientMsgId?: string } {
  const ProtoMessage = root.lookupType("cTrader.ProtoMessage");
  
  // Skip the first 4 bytes (the length)
  const msgBytes = framedBuffer.subarray(4);
  const msg = ProtoMessage.decode(msgBytes) as any;
  
  return {
    payloadType: msg.payloadType,
    payload: msg.payload,
    clientMsgId: msg.clientMsgId
  };
}

// Access underlying message types directly
export function lookupType(name: string) {
  return root.lookupType(`cTrader.${name}`);
}

export const payloadTypeEnum = {
  PROTO_MESSAGE: 50,
  PING_REQ: 52,
  PING_RES: 53,
  OA_APPLICATION_AUTH_REQ: 2100,
  OA_APPLICATION_AUTH_RES: 2101,
  OA_ACCOUNT_AUTH_REQ: 2102,
  OA_ACCOUNT_AUTH_RES: 2103,
  OA_SYMBOLS_LIST_REQ: 2114,
  OA_SYMBOLS_LIST_RES: 2115,
  OA_SUBSCRIBE_SPOTS_REQ: 2137,
  OA_SUBSCRIBE_SPOTS_RES: 2138,
  OA_SPOT_EVENT: 2140,
  OA_NEW_ORDER_REQ: 2106,
  OA_EXECUTION_EVENT: 2126,
  OA_CLOSE_POSITION_REQ: 2111,
  OA_TRADER_REQ: 2121,
  OA_TRADER_RES: 2122,
  OA_RECONCILE_REQ: 2124,
  OA_RECONCILE_RES: 2125,
  OA_MODIFY_POSITION_SL_TP_REQ: 2107,
  OA_MODIFY_POSITION_SL_TP_RES: 2108,
  OA_GET_ACCOUNTS_BY_ACCESS_TOKEN_REQ: 2149,
  OA_GET_ACCOUNTS_BY_ACCESS_TOKEN_RES: 2150,
  OA_ERROR_RES: 2142
};
