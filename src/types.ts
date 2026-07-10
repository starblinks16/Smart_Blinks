export type ConnectionStatus = "DISCONNECTED" | "CONNECTING" | "CONNECTED" | "ERROR";
export type WebSocketState = "CLOSED" | "CONNECTING" | "OPEN" | "ERROR";

export interface TradingAccount {
  ctidTraderAccountId: string;
  brokerName?: string;
  accountType?: string;
  balance: number;
  equity: number;
  margin: number;
  freeMargin: number;
  leverage: number;
  currency: string;
  live: boolean;
  accountHealthScore?: number;
  consecutiveLosses?: number;
}

export interface Position {
  id: string;
  symbol: string;
  tradeSide: "BUY" | "SELL";
  volume: number; // in units (e.g. 100000 is 1 lot)
  entryPrice: number;
  currentPrice: number;
  sl?: number;
  tp?: number;
  initialSL?: number;
  initialTP?: number;
  pnl: number;
  timestamp: number;
}

export interface Candle {
  time: number; // Epoch timestamp in seconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

export interface MarketBrainState {
  marketMood: "BULLISH" | "BEARISH" | "NEUTRAL" | "VOLATILE" | "COOLDOWN";
  volatilityState: "LOW" | "NORMAL" | "HIGH" | "DANGEROUS";
  confidenceLevel: number; // 0 to 100
  aggressionState: "DEFENSIVE" | "CONSERVATIVE" | "BALANCED" | "AGGRESSIVE" | "SNIPER";
  sessionState: "ASIAN" | "LONDON" | "NEW_YORK" | "OVERLAP" | "CLOSED";
  executionReadiness: "READY" | "STANDBY" | "PAUSED_VOLATILITY" | "COOLDOWN_ACTIVE";
  activeStrategy: "SCALP" | "CONTINUATION" | "SNIPER" | "DEFENSIVE" | "COOLDOWN";
  trendStrength: number; // 0 to 100
  liquidityWarnings: string[];
  comments: string[];
  marketPersonality?: string;
  liquidityDanger?: boolean;
  aiReasoning?: string;
}

export interface ExecutionLog {
  id: string;
  timestamp: number;
  type: "INFO" | "TRADE_OPEN" | "TRADE_CLOSE" | "PARTIAL_CLOSE" | "SL_HIT" | "TP_HIT" | "STRATEGY_CHANGE" | "WARNING" | "COOLDOWN";
  title: string;
  message: string;
  strategy?: string;
}

export interface RiskSettings {
  maxRiskPerTrade: number; // percentage (e.g. 1%)
  defaultLotSize: number; // standard lots (e.g. 0.01)
  maxDrawdownLimit: number; // percentage (e.g. 10%)
  trailingStopEnabled: boolean;
  trailingStopTriggerPips: number;
  trailingStopDistancePips: number;
  partialTakeProfitEnabled: boolean;
  partialTakeProfitPct: number; // percentage (e.g. 50%)
  partialTakeProfitTriggerPips: number;
}

export interface DashboardState {
  account: TradingAccount | null;
  connectionStatus: ConnectionStatus;
  websocketStatus: WebSocketState;
  positions: Position[];
  marketPrice: { bid: number; ask: number; spread: number };
  candles: Candle[];
  marketBrain: MarketBrainState;
  executionFeed: ExecutionLog[];
  riskSettings: RiskSettings;
  credentials: {
    clientId: string;
    clientSecret: string;
    isConfigured: boolean;
  };
  cTraderAccounts?: Array<{ accountId: string; isLive: boolean; traderLogin: string }>;
  activeAccountId?: string;
  syncState?: {
    oauthSuccess: boolean;
    tokenExchangeSuccess: boolean;
    accountDiscoverySuccess: boolean;
    accountMappingSuccess: boolean;
    wsAuthenticationSuccess: boolean;
    realtimeSyncSuccess: boolean;
    balanceSyncSuccess: boolean;
    positionSyncSuccess: boolean;
  };
  redirectUri?: string;
  diagnostics?: {
    authorized: boolean;
    tokenValid: boolean;
    tokenExpired: boolean;
    accountLinked: boolean;
    streamActive: boolean;
    lastPing: string;
    lastHeartbeat: string;
    reconnectCount: number;
  };
}
