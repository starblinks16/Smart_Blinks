import http from "http";
import path from "path";
import fs from "fs";
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";
import {
  encodeFrame,
  decodeFrame,
  payloadTypeEnum,
  lookupType
} from "./src/lib/ctraderProto";
import {
  ConnectionStatus,
  WebSocketState,
  TradingAccount,
  Position,
  Candle,
  MarketBrainState,
  ExecutionLog,
  RiskSettings,
  DashboardState
} from "./src/types";

// Load environment variables
dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];

  if (!value) {
    // Graceful fallback to prevent server startup crash if keys are not yet configured in UI
    return `MY_${key}`;
  }

  return value.trim();
}

export const config = {
  PORT: parseInt(process.env.PORT || "3000", 10),

  NODE_ENV: process.env.NODE_ENV || "development",

  CTRADER_CLIENT_ID: requireEnv("CTRADER_CLIENT_ID"),

  CTRADER_CLIENT_SECRET: requireEnv("CTRADER_CLIENT_SECRET"),

  CTRADER_REDIRECT_URI: requireEnv("CTRADER_REDIRECT_URI"),

  // AUTH
  CTRADER_AUTH_URL: "https://id.ctrader.com/my/settings/openapi/grantingaccess",

  CTRADER_TOKEN_URL: "https://connect.spotware.com/apps/token",

  // REAL OPEN API ENDPOINTS (current, as per official cTrader docs)
  // Use port 5035 for Protobuf, port 5036 for JSON.
  CTRADER_DEMO_WSS: "wss://demo.ctraderapi.com:5035",

  CTRADER_LIVE_WSS: "wss://live.ctraderapi.com:5035",
};

const PORT = config.PORT;
const app = express();
const server = http.createServer(app);

// Enable JSON parser for REST requests
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Mutex / Lock for Token Exchange to prevent duplicate / concurrent exchange attempts
let tokenExchangeLock = false;
const processedCodes = new Set<string>();
let chosenAuthEnvironment: "LIVE" | "DEMO" = "DEMO";

// Real-time trading states from cTrader Open API
let currentGoldPrice = 0;
let goldCandles: Candle[] = [];
let activePositions: Position[] = [];
let tradingAccount: TradingAccount | null = null;
let consecutiveLosses = 0;
const partialTpHitPositions = new Set<string>();

// 8 Authentication and Synchronization steps for secure SmartBlinks core
let syncState = {
  oauthSuccess: true,
  tokenExchangeSuccess: false,
  accountDiscoverySuccess: false,
  accountMappingSuccess: false,
  wsAuthenticationSuccess: false,
  realtimeSyncSuccess: false,
  balanceSyncSuccess: false,
  positionSyncSuccess: false
};

function getRedirectUri(req: any): string {
  // 1. Highest priority: configured/required CTRADER_REDIRECT_URI env var
  try {
    const configuredUri = config.CTRADER_REDIRECT_URI;
    if (configuredUri && configuredUri !== "MY_CTRADER_REDIRECT_URI" && configuredUri !== "") {
      return configuredUri;
    }
  } catch (e) {
    // Gracefully handle if config throws missing variable during initial container configuration
  }

  // 2. High priority: Check process.env.PUBLIC_BASE_URL or process.env.APP_URL
  let baseUrl = process.env.PUBLIC_BASE_URL;
  if (!baseUrl || baseUrl === "MY_APP_URL" || baseUrl === "") {
    baseUrl = process.env.APP_URL;
  }

  if (baseUrl && baseUrl !== "MY_APP_URL" && baseUrl !== "") {
    const cleanBase = baseUrl.replace(/\/+$/, "");
    return `${cleanBase}/callback`;
  }

  // 3. Dynamic construction using proxy headers (crucial for Cloud Run, Render, Replit, etc.)
  const forwardedHost = req.headers["x-forwarded-host"];
  const host = forwardedHost || req.headers.host || "localhost:3000";
  const isLocalhost = host.includes("localhost") || host.includes("127.0.0.1");
  
  // Default to https for any non-localhost cloud deployment
  const protocol = req.headers["x-forwarded-proto"] || (isLocalhost ? "http" : "https");
  
  baseUrl = `${protocol}://${host}`;
  const cleanBase = baseUrl.replace(/\/+$/, "");
  return `${cleanBase}/callback`;
}

function resetSyncState() {
  syncState = {
    oauthSuccess: false,
    tokenExchangeSuccess: false,
    accountDiscoverySuccess: false,
    accountMappingSuccess: false,
    wsAuthenticationSuccess: false,
    realtimeSyncSuccess: false,
    balanceSyncSuccess: false,
    positionSyncSuccess: false
  };
  cTraderConnStatus = "DISCONNECTED";
  tradingAccount = null;
  activePositions = [];
  goldCandles = [];
  currentGoldPrice = 0;
  cTraderAccounts = [];
  isTokenValid = false;
  isTokenExpired = false;
  lastPingSentTime = 0;
  lastHeartbeatReceivedTime = 0;
  cTraderSession = null;
}

function checkAllStepsSynced() {
  const isAllSynced = 
    syncState.oauthSuccess &&
    syncState.tokenExchangeSuccess &&
    syncState.accountDiscoverySuccess &&
    syncState.accountMappingSuccess &&
    syncState.wsAuthenticationSuccess &&
    syncState.realtimeSyncSuccess &&
    syncState.balanceSyncSuccess &&
    syncState.positionSyncSuccess;

  if (isAllSynced) {
    cTraderConnStatus = "CONNECTED";
  } else {
    cTraderConnStatus = "CONNECTING";
  }
}

// Default Settings
let riskSettings: RiskSettings = {
  maxRiskPerTrade: 1.0, // 1% of equity
  defaultLotSize: 0.05, // Standard lots (1 lot of gold is 100 oz, 0.01 is 1 oz, so 0.05 is 5 oz)
  maxDrawdownLimit: 15.0, // 15% Max floating drawdown
  trailingStopEnabled: true,
  trailingStopTriggerPips: 150, // 15 pips ($1.50)
  trailingStopDistancePips: 100, // 10 pips ($1.00)
  partialTakeProfitEnabled: true,
  partialTakeProfitPct: 50, // Close half position
  partialTakeProfitTriggerPips: 200 // 20 pips ($2.00)
};

// Default Market Brain State
let marketBrain: MarketBrainState = {
  marketMood: "NEUTRAL",
  volatilityState: "NORMAL",
  confidenceLevel: 0,
  aggressionState: "BALANCED",
  sessionState: "LONDON",
  executionReadiness: "STANDBY",
  activeStrategy: "COOLDOWN",
  trendStrength: 0,
  liquidityWarnings: [],
  comments: ["Waiting for real cTrader synchronization..."]
};

// Execution logs
let executionFeed: ExecutionLog[] = [
  {
    id: "init",
    timestamp: Date.now(),
    type: "INFO",
    title: "System Initialization",
    message: "SmartBlinks AI core fully armed. Connecting neural strategy model."
  }
];

// Active cTrader OAuth / Token session
let cTraderSession: {
  accessToken: string;
  refreshToken: string;
  accountId: string;
  clientId: string;
  clientSecret: string;
  environment?: "LIVE" | "DEMO";
  tradeServerHost?: string;
  tradeServerPort?: number;
} | null = null;

let goldSymbolId = 1n;
let cTraderAccounts: any[] = [];
let currentConnectedEnv: "LIVE" | "DEMO" | null = null;
let handshakeSequenceId = 0;
let discoverySequenceStep = 0;
let envSwitchCount = 0;

// cTrader connection state
let cTraderConnStatus: ConnectionStatus = "DISCONNECTED";
let cTraderWsStatus: WebSocketState = "CLOSED";
let cTraderWebSocket: WebSocket | null = null;
let reconnectAttempts = 0;
let appAuthSuccessful = false;
let isReconnecting = false;
let isAiTradingActive = true;

let isTokenValid = false;
let isTokenExpired = false;
let lastPingSentTime = 0;
let lastHeartbeatReceivedTime = 0;
let cTraderLastDirectError = "";

// Initial candles are empty until synchronized with real cTrader Open API spot stream

let geminiCooldownUntil = 0;

// Write structured prompt to Gemini AI to generate trades / analysis
async function runGeminiMarketAnalysis() {
  try {
    if (!tradingAccount || goldCandles.length === 0) {
      return;
    }

    if (Date.now() < geminiCooldownUntil) {
      return;
    }

    const key = process.env.GEMINI_API_KEY;
    if (!key || key === "MY_GEMINI_API_KEY") {
      addExecutionLog(
        "WARNING",
        "Neural Node Standby",
        "Gemini API key is not configured. Neural decision core is in STANDBY state."
      );
      return;
    }

    const ai = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });

    // Programmatic Institutional Market Calculations
    const atr = calculateATR(14);
    const session = getCurrentSession();
    
    // Liquidity Trap Detector (wick vs body size analysis of last 5 candles)
    let avgWickRatio = 0;
    if (goldCandles.length >= 5) {
      let sumWickRatio = 0;
      goldCandles.slice(-5).forEach(c => {
        const body = Math.abs(c.close - c.open);
        const wick = (c.high - c.low) - body;
        sumWickRatio += body > 0 ? wick / body : wick;
      });
      avgWickRatio = Number((sumWickRatio / 5).toFixed(2));
    }
    const isLiquidityTrapRisk = avgWickRatio > 1.8;

    // Market Fatigue Engine (range contraction check of last 8 candles)
    let isChoppyMarket = false;
    if (goldCandles.length >= 8) {
      const ranges = goldCandles.slice(-8).map(c => c.high - c.low);
      const avgRange = ranges.reduce((a, b) => a + b, 0) / ranges.length;
      isChoppyMarket = avgRange < 0.35; // Gold moving less than $0.35 per min is dead / choppy
    }

    // Session Transition Detector
    const utcHour = new Date().getUTCHours();
    const utcMin = new Date().getUTCMinutes();
    const isSessionTransition = (utcHour === 7 && utcMin >= 30) || (utcHour === 8 && utcMin <= 30) || // Asian -> London
                               (utcHour === 12 && utcMin >= 30) || (utcHour === 13 && utcMin <= 30) || // London -> NY
                               (utcHour === 15 && utcMin >= 30) || (utcHour === 16 && utcMin <= 30) || // London Close
                               (utcHour === 20 && utcMin >= 30) || (utcHour === 21 && utcMin <= 30);  // NY Close

    // Account Health Score
    const accountHealth = calculateAccountHealthScore();
    const isRiskCooldownActive = consecutiveLosses >= 3;

    // Package recent candles
    const recentCandles = goldCandles.slice(-12);
    const candleDataStr = recentCandles
      .map(
        (c) =>
          `Time: ${new Date(c.time * 1000).toISOString()} | O: ${c.open} | H: ${c.high} | L: ${c.low} | C: ${c.close}`
      )
      .join("\n");

    const prompt = `
You are the elite "Market Brain" engine of SmartBlinks AI, a highly advanced institutional-grade automated trading system specialized in XAUUSD (Gold).
Analyze the recent 1-minute gold candle structure, risk profile, and programmatic indicators to decide the next action.

[PROGRAMMATIC TECHNICAL FEED]
Current UTC Hour: ${utcHour}:${utcMin}
Current Session: ${session}
Is Session Transition: ${isSessionTransition} (London Close, NY Open, etc.)
Calculated ATR (14): $${atr.toFixed(2)}
Calculated Wick-To-Body Ratio: ${avgWickRatio} (Is Liquidity Trap Risk: ${isLiquidityTrapRisk})
Is Choppy/Fatigued Market: ${isChoppyMarket}
Account Health Score: ${accountHealth}/100
Consecutive Losses Count: ${consecutiveLosses} (Is Loss Cooldown Active: ${isRiskCooldownActive})

[RECENT GOLD CANDLES (1M)]
${candleDataStr}

[ACTIVE POSITIONS]
${JSON.stringify(activePositions)}

[ACCOUNT DETAILS]
Balance: $${tradingAccount.balance} | Equity: $${tradingAccount.equity} | Current Gold Spot: $${currentGoldPrice}

[RISK CONTROL PARAMETERS]
Max Risk Per Trade: ${riskSettings.maxRiskPerTrade}% | Default Lot Size: ${riskSettings.defaultLotSize} | Trailing Enabled: ${riskSettings.trailingStopEnabled}

STRICT INSTITUTIONAL INSTRUCTIONS:
1. Entry selectivity: The bot must be extremely selective. DO NOT recommend random BUY/SELL unless there is highly aligned structure (HTF align, BOS/CHOCH structure, high trend strength). If there is any warning (liquidity trap risk, choppy market, low account health, session transition instability), default to "HOLD".
2. Cooldown constraint: If Loss Cooldown is active (>= 3 consecutive losses), you MUST recommend "HOLD" to preserve capital.
3. Dynamic TP formulation: Formulate dynamic Take Profit (TP) targets. Instead of a fixed target, propose a high-probability target (small TP if choppy/dead, medium/runner TP if trending/high volatility).
4. Market Personality assessment: Identify the dominant personality (aggressive, slow, choppy, manipulative, volatile, trending, ranging, exhausted) and adjust execution.
5. Provide elite, high-confidence real-time market commentary feed about sweeps, stop hunts, displacement, and wicks.

You MUST respond strictly with a valid JSON block of the following shape. Do not include markdown code block styling other than standard JSON wrapper.

{
  "marketMood": "BULLISH", // BULLISH, BEARISH, NEUTRAL, VOLATILE, COOLDOWN
  "volatilityState": "NORMAL", // LOW, NORMAL, HIGH, DANGEROUS
  "confidenceLevel": 85, // 0 to 100
  "aggressionState": "BALANCED", // DEFENSIVE, CONSERVATIVE, BALANCED, AGGRESSIVE, SNIPER
  "trendStrength": 70, // 0 to 100
  "marketPersonality": "trending", // aggressive, slow, choppy, manipulative, volatile, trending, ranging, exhausted
  "liquidityDanger": false,
  "executionReadiness": "READY", // READY, STANDBY, PAUSED_VOLATILITY, COOLDOWN_ACTIVE
  "activeStrategy": "CONTINUATION", // SCALP, CONTINUATION, SNIPER, DEFENSIVE, COOLDOWN
  "liquidityWarnings": [], // array of strings
  "aiReasoning": "Gold cleared previous daily resistance, showing clean liquidity sweep.",
  "commentary": ["Liquidity sweep detected above London high.", "Momentum surge validates institutional continuation block."],
  "decision": "BUY", // BUY, SELL, HOLD, CLOSE
  "positionIdToClose": null, // if decision is CLOSE
  "suggestedSL": 2325.0, // SL price
  "suggestedTP": 2355.0  // TP price
}
`;

    let response;
    let attempts = 0;
    const maxAttempts = 2;
    while (attempts < maxAttempts) {
      try {
        response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: prompt,
          config: {
            responseMimeType: "application/json"
          }
        });
        break;
      } catch (err: any) {
        attempts++;
        if (attempts >= maxAttempts) {
          throw err;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    const text = response?.text ? response.text.trim() : "";
    if (text) {
      const data = JSON.parse(text);
      applyAIDecision(data);
    }
  } catch (error: any) {
    const errorStr = String(error?.message || error);
    const isQuotaError = errorStr.includes("quota") || errorStr.includes("429") || errorStr.includes("RESOURCE_EXHAUSTED") || error?.status === "RESOURCE_EXHAUSTED";
    
    if (isQuotaError) {
      geminiCooldownUntil = Date.now() + 5 * 60 * 1000;
      console.warn("Gemini API rate limit or quota exceeded. Activating 5-minute cooldown.");
      addExecutionLog(
        "WARNING",
        "Neural Node Cooldown",
        "Gemini API limit reached. Neural decision core temporarily paused for 5 minutes."
      );
    } else {
      console.warn("Error during Gemini core logic run:", errorStr);
      addExecutionLog(
        "WARNING",
        "Neural Node Timeout",
        "Autonomous Gemini standard engine timeout. Retrying next cycle..."
      );
    }
  }
}

// Core action application
function applyAIDecision(aiData: any) {
  // 1. Update Market Brain
  marketBrain = {
    marketMood: aiData.marketMood || "NEUTRAL",
    volatilityState: aiData.volatilityState || "NORMAL",
    confidenceLevel: aiData.confidenceLevel || 75,
    aggressionState: aiData.aggressionState || "CONSERVATIVE",
    sessionState: getCurrentSession(),
    executionReadiness: isAiTradingActive 
      ? (consecutiveLosses >= 3 ? "COOLDOWN_ACTIVE" : (aiData.volatilityState === "DANGEROUS" ? "PAUSED_VOLATILITY" : "READY"))
      : "STANDBY",
    activeStrategy: isAiTradingActive ? (aiData.activeStrategy || "CONTINUATION") : "COOLDOWN",
    trendStrength: aiData.trendStrength || 60,
    liquidityWarnings: aiData.liquidityWarnings || (aiData.volatilityState === "DANGEROUS" ? ["Slippage warning: Volume spikes detected"] : []),
    comments: aiData.commentary || ["Neural matrix analyzing market flow."],
    marketPersonality: aiData.marketPersonality || "slow",
    liquidityDanger: aiData.liquidityDanger || false,
    aiReasoning: aiData.aiReasoning || "Standard neural trend flow analysis."
  };

  // Broadcast the updated marketBrain instantly to the frontend
  broadcastStateUpdate();

  // Add comments to execution log
  if (aiData.commentary && aiData.commentary.length > 0) {
    aiData.commentary.forEach((com: string) => {
      addExecutionLog("INFO", "AI Insight", com);
    });
  }

  // If AI trading is not active, skip executions
  if (!isAiTradingActive) return;

  // 2. Perform Trades Based on Decision
  if (aiData.decision === "BUY" || aiData.decision === "SELL") {
    // If consecutive losses are active, block trades!
    if (consecutiveLosses >= 3) {
      addExecutionLog("WARNING", "Loss Protection Active", "Institutional entry blocked: Bot is in consecutive loss protective cooldown mode.");
      return;
    }

    // Check account health to prevent over-exposure
    if (activePositions.length >= 3) {
      addExecutionLog("WARNING", "Risk Cap Reached", "Max simultaneous positions reached (3). Holding execution.");
      return;
    }

    // Dynamic Sizing suitable for a small account (even $5)
    let calculatedLots = riskSettings.defaultLotSize;
    if (tradingAccount.balance < 100) {
      calculatedLots = 0.01; // Minimum possible size for risk protection
    } else {
      const maxRiskValue = (tradingAccount.balance * (riskSettings.maxRiskPerTrade / 100));
      const slDistance = 4.50;
      calculatedLots = Number((maxRiskValue / (slDistance * 100)).toFixed(2));
      if (calculatedLots < 0.01) calculatedLots = 0.01;
      if (calculatedLots > 0.5) calculatedLots = 0.5; // Cap to conservative sizing
    }

    const slPrice = aiData.suggestedSL || (aiData.decision === "BUY" ? currentGoldPrice - 4.50 : currentGoldPrice + 4.50);
    const tpPrice = aiData.suggestedTP || (aiData.decision === "BUY" ? currentGoldPrice + 9.00 : currentGoldPrice - 9.00);

    executeTrade(aiData.decision, calculatedLots, slPrice, tpPrice);
  } else if (aiData.decision === "CLOSE" && aiData.positionIdToClose) {
    closePosition(aiData.positionIdToClose, "AI Target Reached");
  }
}

// Execute trade internally
function executeTrade(side: "BUY" | "SELL", lots: number, sl: number, tp: number) {
  if (!cTraderSession || !cTraderWebSocket || cTraderWsStatus !== "OPEN") {
    addExecutionLog("WARNING", "Order Rejected", "Cannot place trades: No active cTrader session or connection is offline.");
    return;
  }

  try {
    const OrderType = 1; // MARKET ORDER
    const tradeSideVal = side === "BUY" ? 1 : 2;
    const volumeVal = Math.round(lots * 10000000); // cTrader uses specific micro-units
    
    const orderReq = {
      ctidTraderAccountId: BigInt(cTraderSession.accountId),
      symbolId: goldSymbolId, // Dynamically resolved Gold symbol ID
      orderType: OrderType,
      tradeSide: tradeSideVal,
      volume: volumeVal,
      stopLoss: sl,
      takeProfit: tp,
      comment: "SmartBlinks Autonomous Order"
    };

    const payloadBytes = lookupType("ProtoOANewOrderReq").encode(orderReq).finish();
    const framed = encodeFrame(payloadTypeEnum.OA_NEW_ORDER_REQ, payloadBytes);
    
    sendFrame(framed, "ProtoOANewOrderReq");
    addExecutionLog(
      "TRADE_OPEN",
      `cTrader Core: ${side} Executed`,
      `Transmitting autonomous trade to cTrader exchange: ${lots} Lots of XAUUSD at $${currentGoldPrice.toFixed(2)}.`
    );
  } catch (err: any) {
    addExecutionLog("WARNING", "cTrader Order Error", `Failed to transmit order: ${err.message}`);
  }
}

// Close trade
function closePosition(id: string, reason: string) {
  if (!cTraderSession || !cTraderWebSocket || cTraderWsStatus !== "OPEN") {
    addExecutionLog("WARNING", "Close Rejected", "Cannot close position: No active cTrader session or connection is offline.");
    return;
  }

  try {
    const pos = activePositions.find(p => p.id === id);
    if (!pos) {
      addExecutionLog("WARNING", "cTrader Close Error", `Position ${id} not found in active list.`);
      return;
    }

    const closeReq = {
      ctidTraderAccountId: BigInt(cTraderSession.accountId),
      positionId: BigInt(id.replace("ctr_", "")),
      volume: BigInt(Math.round(pos.volume * 100)) // Reconstruct raw volume to close fully
    };
    const payloadBytes = lookupType("ProtoOAClosePositionReq").encode(closeReq).finish();
    const framed = encodeFrame(payloadTypeEnum.OA_CLOSE_POSITION_REQ, payloadBytes);
    sendFrame(framed, "ProtoOAClosePositionReq");
    addExecutionLog(
      "TRADE_CLOSE",
      "cTrader Core Close",
      `Sent close signal for position ID ${id} due to: ${reason}`
    );
  } catch (err: any) {
    addExecutionLog("WARNING", "cTrader Close Error", `Failed to transmit close request: ${err.message}`);
  }
}

// Log utility
function addExecutionLog(
  type: ExecutionLog["type"],
  title: string,
  message: string,
  strategy?: string
) {
  const newLog: ExecutionLog = {
    id: "log_" + Math.random().toString(36).substring(4, 9),
    timestamp: Date.now(),
    type,
    title,
    message,
    strategy: strategy || marketBrain.activeStrategy
  };
  executionFeed.unshift(newLog);
  if (executionFeed.length > 200) {
    executionFeed.pop();
  }
  // Broadcast immediately to frontend ws clients
  broadcastToFrontend({ type: "EXECUTION_LOG", data: newLog });
}

// Get Session Name based on UTC hour
function getCurrentSession(): MarketBrainState["sessionState"] {
  const utcHour = new Date().getUTCHours();
  if (utcHour >= 0 && utcHour < 8) return "ASIAN";
  if (utcHour >= 8 && utcHour < 13) return "LONDON";
  if (utcHour >= 13 && utcHour < 21) return "NEW_YORK";
  if (utcHour >= 21) return "CLOSED";
  return "OVERLAP";
}

// Background connection keeper and AI task runner
let lastPingTime = 0;
let lastAiAnalysisTime = 0;

setInterval(() => {
  const now = Date.now();

  // 1. Keep secure cTrader stream alive via standard ping frames every 25 seconds
  if (cTraderSession && cTraderWebSocket && cTraderWsStatus === "OPEN") {
    if (now - lastPingTime >= 25000) {
      sendOaPing();
      lastPingTime = now;
    }
  }

  // 2. Query Gemini core analysis periodically (every 1 minute) if fully connected
  // Temporarily disabled as requested: Focus ONLY on stable cTrader synchronization core.
  /*
  if (tradingAccount && isAiTradingActive && cTraderSession && cTraderConnStatus === "CONNECTED") {
    if (now - lastAiAnalysisTime >= 60000) {
      runGeminiMarketAnalysis();
      lastAiAnalysisTime = now;
    }
  }
  */
}, 1000);

// Setup WebSockets layer for React clients
let wsClients: WebSocket[] = [];

function broadcastToFrontend(payload: { type: string; data: any }) {
  const jsonStr = JSON.stringify(payload);
  wsClients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(jsonStr);
    }
  });
}

// Express Routes for OAuth and settings Management
app.get("/api/state", (req, res) => {
  res.json({
    account: tradingAccount,
    connectionStatus: cTraderConnStatus,
    websocketStatus: cTraderWsStatus,
    positions: activePositions,
    marketPrice: currentGoldPrice > 0 ? {
      bid: currentGoldPrice - 0.08,
      ask: currentGoldPrice + 0.08,
      spread: 0.16
    } : {
      bid: 0,
      ask: 0,
      spread: 0
    },
    candles: goldCandles.slice(-120),
    marketBrain,
    executionFeed,
    riskSettings,
    credentials: {
      clientId: getClientCredentials().clientId,
      clientSecret: getClientCredentials().clientSecret ? "••••••••" : "",
      isConfigured: !!(getClientCredentials().clientId && getClientCredentials().clientSecret),
      wsMode: process.env.CTRADER_WS_MODE || "demo"
    },
    cTraderAccounts,
    activeAccountId: cTraderSession?.accountId || "",
    syncState,
    redirectUri: getRedirectUri(req),
    diagnostics: getDiagnostics()
  });
});

app.post("/api/settings", (req, res) => {
  const { maxRisk, defaultLotSize, maxDrawdown, trailingEnabled } = req.body;
  
  if (maxRisk !== undefined) riskSettings.maxRiskPerTrade = Number(maxRisk);
  if (defaultLotSize !== undefined) riskSettings.defaultLotSize = Number(defaultLotSize);
  if (maxDrawdown !== undefined) riskSettings.maxDrawdownLimit = Number(maxDrawdown);
  if (trailingEnabled !== undefined) riskSettings.trailingStopEnabled = !!trailingEnabled;

  addExecutionLog("INFO", "Settings Updated", `Risk parameters updated: Risk ${riskSettings.maxRiskPerTrade}%, Lots: ${riskSettings.defaultLotSize}, Drawdown cap: ${riskSettings.maxDrawdownLimit}%`);
  res.json({ status: "success", settings: riskSettings });
});

app.post("/api/positions/close", (req, res) => {
  const { positionId } = req.body;
  if (!positionId) {
    return res.status(400).json({ error: "Missing positionId" });
  }
  closePosition(positionId, "Manual UI Close Command");
  res.json({ status: "success" });
});

app.post("/api/trading/toggle", (req, res) => {
  isAiTradingActive = !isAiTradingActive;
  marketBrain.executionReadiness = isAiTradingActive ? "READY" : "STANDBY";
  addExecutionLog(
    "INFO",
    isAiTradingActive ? "AI Mode Armed" : "AI Mode Disarmed",
    isAiTradingActive 
      ? "Autonomous core online. Actively evaluating XAUUSD opportunities."
      : "Autonomous core disarmed. Trading engine in manual standby mode."
  );
  res.json({ status: "success", active: isAiTradingActive });
});

app.post("/api/trading/order", (req, res) => {
  const { side, lots } = req.body;
  if (!side || !lots) {
    return res.status(400).json({ error: "Missing trade side or lot size" });
  }

  const slPrice = side === "BUY" ? currentGoldPrice - 4.50 : currentGoldPrice + 4.50;
  const tpPrice = side === "BUY" ? currentGoldPrice + 9.00 : currentGoldPrice - 9.00;

  executeTrade(side, Number(lots), slPrice, tpPrice);
  res.json({ status: "success" });
});

app.post("/api/trading/account", (req, res) => {
  const { accountId } = req.body;
  if (!accountId) {
    return res.status(400).json({ error: "Missing accountId" });
  }
  if (!cTraderSession) {
    return res.status(400).json({ error: "No active cTrader session" });
  }

  const targetAcc = cTraderAccounts.find((a) => a.accountId === String(accountId));
  if (!targetAcc) {
    return res.status(404).json({ error: "Account not found in linked list" });
  }

  cTraderSession.accountId = targetAcc.accountId;
  cTraderSession.environment = targetAcc.isLive ? "LIVE" : "DEMO";
  addExecutionLog("INFO", "Active Account Selected", `User switched active trade sync to account: ${targetAcc.accountId} (${targetAcc.isLive ? "LIVE" : "DEMO"})`);

  // Reconnect with target account and appropriate environment
  if (cTraderWebSocket) {
    cTraderWebSocket.removeAllListeners();
    cTraderWebSocket.close();
    cTraderWebSocket = null;
  }
  cTraderWsStatus = "CLOSED";
  connectToCTraderWebSocket();

  res.json({ status: "success", accountId: targetAcc.accountId });
});

// Helper to dynamically resolve active client credentials prioritising memory/process.env first
function getClientCredentials() {
  let clientId = (process.env.CTRADER_CLIENT_ID || "").trim();
  if (clientId === "MY_CTRADER_CLIENT_ID") {
    clientId = "";
  }
  let clientSecret = (process.env.CTRADER_CLIENT_SECRET || "").trim();
  if (clientSecret === "MY_CTRADER_CLIENT_SECRET") {
    clientSecret = "";
  }

  // Fallback to static config properties if needed
  if (!clientId) {
    try {
      const fallbackId = config.CTRADER_CLIENT_ID;
      if (fallbackId && fallbackId !== "MY_CTRADER_CLIENT_ID") {
        clientId = fallbackId.trim();
      }
    } catch (e) {}
  }
  if (!clientSecret) {
    try {
      const fallbackSecret = config.CTRADER_CLIENT_SECRET;
      if (fallbackSecret && fallbackSecret !== "MY_CTRADER_CLIENT_SECRET") {
        clientSecret = fallbackSecret.trim();
      }
    } catch (e) {}
  }

  return { clientId: clientId.trim(), clientSecret: clientSecret.trim() };
}

// Register developer credentials dynamically in memory
app.post("/api/credentials", (req, res) => {
  const { clientId, clientSecret, wsMode } = req.body;
  process.env.CTRAPID_MODE = wsMode; // preserve
  process.env.CTRADER_CLIENT_ID = (clientId || "").trim();
  process.env.CTRADER_CLIENT_SECRET = (clientSecret || "").trim();
  if (wsMode) {
    process.env.CTRADER_WS_MODE = wsMode;
  }
  
  addExecutionLog("INFO", "Credentials Registered", `Real-time cTrader OpenAPI developer credentials successfully registered in memory. API Endpoint Mode set to: ${wsMode || "demo"}.`);
  res.json({ status: "success" });
});

// Automatically trigger account discovery & stream connection from frontend
app.post("/api/ctrader/connect", (req, res) => {
  if (!cTraderSession || !cTraderSession.accessToken) {
    return res.status(400).json({ error: "No active cTrader session. Please authenticate first." });
  }
  
  addExecutionLog("INFO", "API Connect Request", "Direct client connection request received. Initializing cTrader account discovery stream...");
  
  // Clean start
  reconnectAttempts = 0;
  isReconnecting = false;
  connectToCTraderWebSocket();
  
  res.json({ status: "success", message: "Account discovery and stream auto-selection triggered." });
});

// 1. Generate cTrader Authorization Redirect URL
app.get("/api/auth/url", (req, res) => {
  const { environment } = req.query;
  let targetEnv = environment;
  if (!targetEnv && process.env.CTRADER_WS_MODE) {
    targetEnv = process.env.CTRADER_WS_MODE.toUpperCase() === "LIVE" ? "LIVE" : "DEMO";
  }
  if (targetEnv === "LIVE" || targetEnv === "DEMO") {
    chosenAuthEnvironment = targetEnv as "LIVE" | "DEMO";
  } else {
    chosenAuthEnvironment = "DEMO";
  }

  const { clientId, clientSecret } = getClientCredentials();
  
  if (!clientId || !clientSecret) {
    return res.status(400).json({
      error: "cTrader Credentials missing",
      message: "Please configure CTRADER_CLIENT_ID and CTRADER_CLIENT_SECRET in the credentials pane."
    });
  }

  const redirectUri = getRedirectUri(req);
  const state = Math.random().toString(36).substring(2, 15);
  
  // Construct the exact OAuth provider's auth URL using config values
  const authUrl = `${config.CTRADER_AUTH_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=trading&product=web`;
  
  addExecutionLog("INFO", "AUTH URL GENERATED", `Authorization URL generated targeting: ${authUrl}`);
  res.json({ url: authUrl });
});

// 2. Real OAuth Authorization Exchange (Accepts GET and POST requests for safety)
app.all(["/callback", "/callback/", "/api/ctrader/callback"], async (req, res) => {
  const incomingUrl = req.originalUrl || req.url;
  const headersStr = JSON.stringify(req.headers);
  const queryStr = JSON.stringify(req.query);
  const bodyStr = JSON.stringify(req.body);

  console.log(`[DEBUG CALLBACK] Incoming Request: ${req.method} | URL: ${incomingUrl}`);
  console.log(`[DEBUG CALLBACK] Query Parameters: ${queryStr}`);
  console.log(`[DEBUG CALLBACK] Request Headers: ${headersStr}`);
  console.log(`[DEBUG CALLBACK] Request Body: ${bodyStr}`);

  addExecutionLog(
    "INFO",
    "OAUTH REDIRECT RECEIVED",
    `OAuth redirect received. Method: ${req.method} | URL: ${incomingUrl} | Query: ${queryStr} | Body: ${bodyStr}`
  );

  const code = req.query.code || req.body?.code;
  const state = req.query.state || req.body?.state;
  const error = req.query.error || req.body?.error;
  const error_description = req.query.error_description || req.body?.error_description || req.body?.errorDescription;

  if (error) {
    return res.send(getOAuthHtmlResponse(false, `Authorization failed: ${error_description || error}`));
  }

  if (!code) {
    return res.send(getOAuthHtmlResponse(false, "Authorization code missing."));
  }

  const authCode = String(code);
  addExecutionLog("INFO", "AUTH CODE DETECTED", `Authorization code detected: ${authCode.substring(0, 6)}...`);

  // 1. Safety Locks check
  if (processedCodes.has(authCode)) {
    return res.send(getOAuthHtmlResponse(true, "Authentication already processed. This window can be safely closed."));
  }

  if (tokenExchangeLock) {
    return res.send(getOAuthHtmlResponse(false, "Exchange in progress. Please wait a moment."));
  }

  // Engage Lock
  tokenExchangeLock = true;

  try {
    const { clientId, clientSecret } = getClientCredentials();
    
    if (!clientId || !clientSecret) {
      throw new Error("Client credentials are not registered or misconfigured.");
    }

    const redirectUri = getRedirectUri(req);

    addExecutionLog("INFO", "TOKEN EXCHANGE STARTED", `Starting server-side OAuth token exchange with cTrader OpenAPI (POST) using redirect_uri: ${redirectUri}`);

    // 2. cTrader OAuth POST request using configured Token URL
    const tokenUrlParams = new URLSearchParams({
      grant_type: "authorization_code",
      code: authCode,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret
    });

    const tokenResponse = await fetch(config.CTRADER_TOKEN_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: tokenUrlParams.toString()
    });

    if (!tokenResponse.ok) {
      const errText = await tokenResponse.text();
      throw new Error(`Token exchange failed (HTTP ${tokenResponse.status}): ${errText}`);
    }

    const tokenData = await tokenResponse.json();

    addExecutionLog("INFO", "TOKEN EXCHANGE SUCCESS", "Token exchange completed successfully. Access and refresh tokens received.");

    // Cache processed code to avoid duplicate exchanges
    processedCodes.add(authCode);

    const accessToken = tokenData.accessToken || tokenData.access_token;
    if (!accessToken) {
      throw new Error("No access token returned from cTrader token response.");
    }

    isTokenValid = true;
    isTokenExpired = false;

    // Automate session initialization using direct WebSocket and Protobuf sequence!
    const isLiveTarget = (chosenAuthEnvironment === "LIVE");
    const initialHost = isLiveTarget ? "live.ctraderapi.com" : "demo.ctraderapi.com";

    // Setup cTrader session with empty accountId to trigger auto-discovery over WebSocket
    cTraderSession = {
      accessToken: accessToken,
      refreshToken: tokenData.refreshToken || tokenData.refresh_token,
      accountId: "", // Will be dynamically mapped on WebSocket connection!
      clientId: clientId || "",
      clientSecret: clientSecret || "",
      environment: chosenAuthEnvironment,
      tradeServerHost: initialHost,
      tradeServerPort: 5035
    };

    addExecutionLog("INFO", "SESSION INITIALIZED", `Token secured. Launching automated WebSocket handshake to wss://${initialHost}:5035 to execute ProtoOAGetAccountListByAccessTokenReq...`);

    // Reset sync states for new sequence
    syncState.oauthSuccess = true;
    syncState.tokenExchangeSuccess = true;
    syncState.accountDiscoverySuccess = false;
    syncState.accountMappingSuccess = false;
    syncState.wsAuthenticationSuccess = false;
    syncState.realtimeSyncSuccess = false;
    syncState.balanceSyncSuccess = false;
    syncState.positionSyncSuccess = false;
    cTraderConnStatus = "CONNECTING";

    // Connect to WebSocket directly to run the auto-discovery & mapping sequence!
    connectToCTraderWebSocket();

    // Send successful postMessage HTML response to the popup
    res.send(getOAuthHtmlResponse(true, "cTrader Link Obtained. Automating account discovery & socket mapping..."));
  } catch (err: any) {
    console.error("OAuth Exchange failure:", err);
    addExecutionLog("WARNING", "OAuth Connection Failed", `Token exchange aborted: ${err.message}`);
    res.send(getOAuthHtmlResponse(false, `Authentication exchange failed: ${err.message}`));
  } finally {
    // Unlock exchange
    tokenExchangeLock = false;
  }
});

// Generate beautiful cinematic popup closure page
function getOAuthHtmlResponse(success: boolean, message: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>SmartBlinks cTrader Connection</title>
      <style>
        body {
          background-color: #0b0c10;
          color: #c5c6c7;
          font-family: 'Inter', system-ui, -apple-system, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          text-align: center;
        }
        .container {
          background: rgba(31, 40, 51, 0.45);
          backdrop-filter: blur(12px);
          border: 1px solid ${success ? "rgba(0, 229, 255, 0.3)" : "rgba(255, 75, 75, 0.3)"};
          box-shadow: 0 0 40px ${success ? "rgba(0, 229, 255, 0.15)" : "rgba(255, 75, 75, 0.15)"};
          padding: 40px;
          border-radius: 16px;
          max-width: 400px;
        }
        h1 {
          font-size: 24px;
          margin-bottom: 16px;
          color: ${success ? "#00E5FF" : "#FF4B4B"};
          letter-spacing: 0.5px;
        }
        p {
          font-size: 14px;
          line-height: 1.6;
          margin-bottom: 24px;
        }
        .btn {
          background: linear-gradient(135deg, #1f2833 0%, #0b0c10 100%);
          border: 1px solid rgba(197, 198, 199, 0.2);
          color: #ffffff;
          padding: 10px 24px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 13px;
        }
        .btn:hover {
          border-color: #00E5FF;
          box-shadow: 0 0 10px rgba(0, 229, 255, 0.3);
        }
      </style>
    </head>
    <body>
      <div class="container">
        <h1>${success ? "Connection Secure" : "Link Aborted"}</h1>
        <p>${message}</p>
        <button class="btn" onclick="if(window.opener){window.close();}else{window.location.href='/';}">${success ? "Return to Dashboard" : "Go Back"}</button>
      </div>
      <script>
        if (window.opener) {
          window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
          setTimeout(() => {
            window.close();
          }, 1500);
        } else {
          // Same tab fallback: redirect to app root where app will auto-sync cTrader state
          setTimeout(() => {
            window.location.href = '/';
          }, 1500);
        }
      </script>
    </body>
    </html>
  `;
}

// Helper to send binary frames over cTrader WebSocket
function sendFrame(framed: Uint8Array, messageName: string = "Frame") {
  if (!cTraderWebSocket || cTraderWsStatus !== "OPEN") {
    addExecutionLog("WARNING", "Transmission Skipped", `Cannot send ${messageName}: WebSocket is not open.`);
    return;
  }
  try {
    const hex = Buffer.from(framed).toString("hex").toUpperCase();
    console.log(`[CTRADER SEND] ${messageName} (${framed.length} bytes): ${hex}`);
    addExecutionLog("INFO", "Transmission Hex Dump", `[${messageName}] Sent ${framed.length} bytes. Hex payload: ${hex}`);
    cTraderWebSocket.send(Buffer.from(framed), { binary: true });
  } catch (err: any) {
    console.error(`Failed to send ${messageName}:`, err);
    addExecutionLog("WARNING", "Transmission Error", `Failed to send ${messageName}: ${err.message}`);
  }
}

// cTrader real Proto WebSocket Connection Client
function connectToCTraderWebSocket() {
  if (!cTraderSession || !cTraderSession.accessToken) {
    addExecutionLog("WARNING", "Stream Init Blocked", "Cannot initialize stream: cTrader session is unauthorized or missing access token.");
    return;
  }
  if (isReconnecting) return;

  // Clean up any existing WebSocket first to prevent lingering event handlers from triggering
  if (cTraderWebSocket) {
    try {
      cTraderWebSocket.removeAllListeners();
      cTraderWebSocket.close();
    } catch (e) {
      console.error("Error closing old cTrader WebSocket:", e);
    }
    cTraderWebSocket = null;
  }

  cTraderWsStatus = "CONNECTING";
  const environment = cTraderSession.environment || "DEMO";
  currentConnectedEnv = environment;
  cTraderLastDirectError = ""; // Reset last cTrader direct error for the new connection sequence

  const configuredWsMode = (process.env.CTRADER_WS_MODE || "demo").toUpperCase();
  if (configuredWsMode !== environment) {
    addExecutionLog(
      "WARNING",
      "Environment Mismatch Alert",
      `YOUR SETTINGS MAY BE MISCONFIGURED! Credentials API Endpoint Mode is set to "${configuredWsMode}", but your target authorization environment is set to "${environment}". If you have a Demo application, make sure BOTH are set to Demo; if you have a Live application, ensure BOTH are set to Live.`
    );
  }

  let wsUrl = config.CTRADER_DEMO_WSS;
  if (cTraderSession.tradeServerHost) {
    const port = cTraderSession.tradeServerPort || 5035;
    wsUrl = `wss://${cTraderSession.tradeServerHost}:${port}`;
  } else if (environment === "LIVE") {
    wsUrl = config.CTRADER_LIVE_WSS;
  }

  addExecutionLog("INFO", "cTrader Stream Core", `Initializing binary WebSocket connection to ${wsUrl} (${environment} mode).`);

  // Start a handshake watchdog to identify precisely where the auto-discovery or connection gets stuck
  const currentHandshakeId = ++handshakeSequenceId;
  setTimeout(() => {
    if (currentHandshakeId !== handshakeSequenceId) return; // stale socket session
    if (cTraderWsStatus !== "OPEN") {
      addExecutionLog("WARNING", "Handshake Watchdog", "Connection failed to open in 15 seconds. Ensure the cTrader OpenAPI servers are online and port 5035 is not blocked.");
      return;
    }
    if (!syncState.wsAuthenticationSuccess) {
      addExecutionLog("WARNING", "Handshake Stuck Diagnostic", "Handshake did not complete within 15 seconds. Diagnosing problem state...");
      if (!syncState.accountDiscoverySuccess) {
        addExecutionLog("WARNING", "Diagnostic [Step 3 - Broker Discovery]", "STUCK AT BROKER DISCOVERY: WebSocket opened and App authorized, but we did not receive the trading accounts list. This usually means either: 1) Your cTrader OpenAPI App is Demo-only but you are trying to sync Live accounts (or vice versa), 2) Your Client ID/Secret are invalid on this environment, or 3) There are no trading accounts linked to your cidTrader profile.");
      } else if (!syncState.accountMappingSuccess) {
        addExecutionLog("WARNING", "Diagnostic [Step 4 - Account Mapping]", "STUCK AT ACCOUNT MAPPING: Received accounts list but could not map a valid active account. Check if you have at least one demo/live trading account linked.");
      } else if (!syncState.wsAuthenticationSuccess) {
        addExecutionLog("WARNING", "Diagnostic [Step 5 - SSL Handshake / Auth]", "STUCK AT ACCOUNT AUTHENTICATION: Mapped the account, but cTrader rejected our ProtoOAAccountAuthReq. This means: 1) The access token lacks permission for this specific broker account, or 2) This broker has disabled OpenAPI access for this account. Try authorizing a different account.");
      }
    }
  }, 15000);

  try {
    cTraderWebSocket = new WebSocket(wsUrl);

    cTraderWebSocket.on("open", () => {
      cTraderWsStatus = "OPEN";
      isReconnecting = false;
      appAuthSuccessful = false;
      addExecutionLog("INFO", "cTrader WS Connected", "Active SSL stream channel authorized. Sending authentication payloads.");

      // 1. Authorize Application Immediately
      sendOaAppAuth();
    });

    cTraderWebSocket.on("message", (data: any) => {
      handleOaMessage(data);
    });

    cTraderWebSocket.on("close", (code, reason) => {
      cTraderWsStatus = "CLOSED";
      // Clear websocket-dependent sync steps upon connection drop
      syncState.accountDiscoverySuccess = false;
      syncState.accountMappingSuccess = false;
      syncState.wsAuthenticationSuccess = false;
      syncState.realtimeSyncSuccess = false;
      syncState.balanceSyncSuccess = false;
      syncState.positionSyncSuccess = false;

      const rsn = reason ? reason.toString() : "";
      if (!appAuthSuccessful) {
        let directErrorContext = "";
        if (cTraderLastDirectError) {
          directErrorContext = `\n[DIRECT ERROR FROM CTRADER]: ${cTraderLastDirectError}`;
        } else {
          directErrorContext = `
================================================================================
[DIAGNOSTIC ANALYSIS - SILENT CONNECTION CLOSED BY CTRADER]
No direct error frame was received from cTrader before the socket disconnected. This means cTrader closed the raw TCP/SSL stream immediately upon receiving our first payload.

This is a signature cTrader OpenAPI behavior that occurs due to one of three reasons:

1. ENVIRONMENT MISMATCH (Most Common):
   - If your application "SmartBlinks" was created on the LIVE Open API Panel (openapi.ctrader.com), your Client ID and Client Secret only exist on the Live system. You MUST set your "API Endpoint Mode" in the credentials form to "Live" (live.ctraderapi.com:5035), EVEN IF you are trading or syncing a DEMO trading account!
   - If your application was created on the SANDBOX Open API Panel (sandbox-openapi.ctrader.com), your credentials only exist on the Sandbox system. You MUST set your "API Endpoint Mode" to "Demo" (demo.ctraderapi.com:5035).
   - Connecting to the Demo server (demo.ctraderapi.com) using Live credentials (or vice-versa) results in an immediate silent connection drop by cTrader.

2. INVALID DEVELOPER CREDENTIALS:
   - Double-check that your Client ID and Client Secret are copied exactly from your developer page (check for any copy-paste spaces).
   - Ensure your application is approved and marked as "Active" on the cTrader developer portal.

3. ACCESS RIGHTS OR TOKEN SCOPE:
   - Ensure your token was granted with the required 'trading' scope.
================================================================================`;
        }

        addExecutionLog(
          "WARNING",
          "Handshake Failed",
          `Application Auth Failed: cTrader disconnected immediately (Code: ${code}, Reason: ${rsn || "None"}). Context: Client ID = "${cTraderSession ? cTraderSession.clientId : 'unknown'}", Environment = "${currentConnectedEnv || 'DEMO'}".${directErrorContext}`
        );
        cTraderSession = null;
        isTokenValid = false;
        cTraderConnStatus = "DISCONNECTED";
        broadcastStateUpdate();
        return; // Halt here - do NOT trigger reconnection
      } else {
        addExecutionLog(
          "WARNING",
          "Connection Closed",
          `cTrader WebSocket stream closed (Code: ${code}, Reason: ${rsn || "None"}). Reconnecting...`
        );
        cTraderConnStatus = "CONNECTING";
        broadcastStateUpdate();
        triggerWsReconnection();
      }
    });

    cTraderWebSocket.on("error", (err) => {
      cTraderWsStatus = "ERROR";
      addExecutionLog("WARNING", "cTrader WS Error", `SSL stream experienced a failure: ${err.message}. Connection target was: ${wsUrl}. This usually indicates a socket timeout, DNS failure, or the target server rejected the secure handshake.`);
    });
  } catch (err: any) {
    cTraderWsStatus = "ERROR";
    addExecutionLog("WARNING", "WS Connection Failed", `WebSocket setup failed: ${err.message}`);
  }
}

// Reconnection with backoff protection
function triggerWsReconnection() {
  if (isReconnecting) return;
  if (!cTraderSession || !isTokenValid || isTokenExpired) {
    addExecutionLog("WARNING", "Reconnect Skipped", "Skipping reconnection: Session is not authorized, or token has expired.");
    return;
  }

  isReconnecting = true;
  reconnectAttempts++;
  
  if (reconnectAttempts > 5) {
    addExecutionLog("WARNING", "cTrader Disconnected", "Failed to establish stream after 5 attempts. Re-authorization required.");
    resetSyncState();
    isReconnecting = false;
    return;
  }

  const delay = Math.min(2000 * Math.pow(2, reconnectAttempts), 15000);
  addExecutionLog("INFO", "Reconnecting Stream", `SSL Connection lost. Retrying in ${(delay/1000).toFixed(0)} seconds... (Attempt ${reconnectAttempts}/5)`);

  setTimeout(() => {
    isReconnecting = false;
    connectToCTraderWebSocket();
  }, delay);
}

// Query all linked accounts under the current cTrader Access Token using ProtoOAGetAccountListByAccessTokenReq
function sendOaGetAccounts() {
  if (!cTraderSession || !cTraderWebSocket) return;
  try {
    const getAccReq = {
      accessToken: cTraderSession.accessToken
    };
    const payloadBytes = lookupType("ProtoOAGetAccountListByAccessTokenReq").encode(getAccReq).finish();
    const framed = encodeFrame(payloadTypeEnum.OA_GET_ACCOUNTS_BY_ACCESS_TOKEN_REQ, payloadBytes);
    
    sendFrame(framed, "ProtoOAGetAccountListByAccessTokenReq");
    addExecutionLog("INFO", "Discovery Request", "Querying cTrader accounts using ProtoOAGetAccountListByAccessTokenReq...");
    
    // Set step sync status and broadcast to frontend
    syncState.accountDiscoverySuccess = false;
    syncState.accountMappingSuccess = false;
    broadcastStateUpdate();
  } catch (err: any) {
    console.error("Failed to build ProtoOAGetAccountListByAccessTokenReq", err);
    addExecutionLog("WARNING", "Discovery Failed", `ProtoOAGetAccountListByAccessTokenReq failed: ${err.message}`);
  }
}

// Query specific details (balance, leverage, etc.) of target cTrader account
function sendOaTraderReq() {
  if (!cTraderSession || !cTraderWebSocket || !cTraderSession.accountId) return;
  try {
    const traderReq = {
      ctidTraderAccountId: BigInt(cTraderSession.accountId)
    };
    const payloadBytes = lookupType("ProtoOATraderReq").encode(traderReq).finish();
    const framed = encodeFrame(payloadTypeEnum.OA_TRADER_REQ, payloadBytes);
    
    sendFrame(framed, "ProtoOATraderReq");
  } catch (err: any) {
    console.error("Failed to build trader req", err);
  }
}

// Reconcile and query all active open positions and orders from target account
function sendOaReconcileReq() {
  if (!cTraderSession || !cTraderWebSocket || !cTraderSession.accountId) return;
  try {
    const reconcileReq = {
      ctidTraderAccountId: BigInt(cTraderSession.accountId)
    };
    const payloadBytes = lookupType("ProtoOAReconcileReq").encode(reconcileReq).finish();
    const framed = encodeFrame(payloadTypeEnum.OA_RECONCILE_REQ, payloadBytes);
    
    sendFrame(framed, "ProtoOAReconcileReq");
  } catch (err: any) {
    console.error("Failed to build reconcile req", err);
  }
}

// Fetch all symbols list to map XAUUSD symbol ID dynamically
function sendOaSymbolsListReq() {
  if (!cTraderSession || !cTraderWebSocket || !cTraderSession.accountId) return;
  try {
    const symbolsReq = {
      ctidTraderAccountId: BigInt(cTraderSession.accountId),
      includeDeleted: false
    };
    const payloadBytes = lookupType("ProtoOASymbolsListReq").encode(symbolsReq).finish();
    const framed = encodeFrame(payloadTypeEnum.OA_SYMBOLS_LIST_REQ, payloadBytes);
    
    sendFrame(framed, "ProtoOASymbolsListReq");
    addExecutionLog("INFO", "Fetching Symbols", "Mapping cTrader asset IDs dynamically for precise trading.");
  } catch (err: any) {
    console.error("Failed to build symbols list req", err);
  }
}

// Keep connection alive by sending standard PING_REQ
function sendOaPing() {
  if (!cTraderWebSocket || cTraderWsStatus !== "OPEN") return;
  try {
    const pingReq = {
      timestamp: BigInt(Date.now())
    };
    const payloadBytes = lookupType("ProtoPingReq").encode(pingReq).finish();
    const framed = encodeFrame(payloadTypeEnum.PING_REQ, payloadBytes);
    sendFrame(framed, "ProtoPingReq");
    lastPingSentTime = Date.now();
    broadcastStateUpdate();
  } catch (err: any) {
    console.error("Failed to send ping", err);
  }
}

// Build and update standard Candle elements on tick events without simulation
function updateCandlesWithTick(price: number, timestampMs: number) {
  const currentMinUnix = Math.floor(timestampMs / 60000) * 60;
  if (goldCandles.length === 0) {
    goldCandles.push({
      time: currentMinUnix,
      open: price,
      high: price,
      low: price,
      close: price,
      volume: 1
    });
    return;
  }

  const lastCandle = goldCandles[goldCandles.length - 1];
  if (currentMinUnix > lastCandle.time) {
    goldCandles.push({
      time: currentMinUnix,
      open: price,
      high: price,
      low: price,
      close: price,
      volume: 1
    });
    if (goldCandles.length > 1000) {
      goldCandles.shift();
    }
  } else if (currentMinUnix === lastCandle.time) {
    lastCandle.high = Math.max(lastCandle.high, price);
    lastCandle.low = Math.min(lastCandle.low, price);
    lastCandle.close = price;
    if (lastCandle.volume) lastCandle.volume += 1;
  }
}

// Calculate the Account Health Score dynamically based on multiple risk metrics
function calculateAccountHealthScore(): number {
  if (!tradingAccount || tradingAccount.balance <= 0) return 100;
  
  let score = 100;
  
  // Deduct based on current floating drawdown
  const floatingDrawdown = tradingAccount.balance > tradingAccount.equity 
    ? ((tradingAccount.balance - tradingAccount.equity) / tradingAccount.balance) * 100 
    : 0;
  score -= floatingDrawdown * 3;
  
  // Deduct based on margin level
  if (tradingAccount.margin > 0) {
    const marginLevel = (tradingAccount.equity / tradingAccount.margin) * 100;
    if (marginLevel < 200) {
      score -= 30;
    } else if (marginLevel < 500) {
      score -= 15;
    }
  }

  // Deduct for consecutive losses
  if (consecutiveLosses > 0) {
    score -= consecutiveLosses * 10;
  }
  
  // Deduct for dangerous market volatility
  if (marketBrain.volatilityState === "DANGEROUS") {
    score -= 15;
  } else if (marketBrain.volatilityState === "HIGH") {
    score -= 5;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

// ATR calculation based on real goldCandles
function calculateATR(period = 14): number {
  if (goldCandles.length < period + 1) {
    return 1.20; // default ATR for gold (around $1.20 movement per 1m candle)
  }
  let sumTR = 0;
  for (let i = goldCandles.length - period; i < goldCandles.length; i++) {
    const current = goldCandles[i];
    const prev = goldCandles[i - 1];
    const hl = current.high - current.low;
    const hpc = prev ? Math.abs(current.high - prev.close) : hl;
    const lpc = prev ? Math.abs(current.low - prev.close) : hl;
    const tr = Math.max(hl, hpc, lpc);
    sumTR += tr;
  }
  return Number((sumTR / period).toFixed(2)) || 1.20;
}

// Advanced Dynamic Staged Trailing stop
function processStagedTrailing(pos: Position) {
  if (!pos.sl) return;
  
  // Set initialSL if it wasn't captured yet
  if (!pos.initialSL) {
    pos.initialSL = pos.sl;
  }
  if (!pos.initialTP && pos.tp) {
    pos.initialTP = pos.tp;
  }

  const R = Math.abs(pos.entryPrice - pos.initialSL);
  if (R <= 0) return;

  const currentProfit = pos.tradeSide === "BUY" ? (currentGoldPrice - pos.entryPrice) : (pos.entryPrice - currentGoldPrice);
  const profitInR = currentProfit / R;

  let newSl = pos.sl;
  const atr = calculateATR(14);
  const session = getCurrentSession();
  const confidence = marketBrain.confidenceLevel;
  const volState = marketBrain.volatilityState;

  let reason = "";

  // STAGE 4: SNIPER EXIT PROTECTION (near exhaustion, high volatility spikes, poor confidence, major session transition)
  if (profitInR >= 2.0 || volState === "DANGEROUS" || (profitInR >= 1.5 && confidence < 60)) {
    const slOffset = 1.2 * atr;
    if (pos.tradeSide === "BUY") {
      const trailSl = currentGoldPrice - slOffset;
      if (trailSl > newSl) {
        newSl = Number(trailSl.toFixed(2));
        reason = "Sniper Exit Protection (Tightening trailing stop due to momentum exhaustion/high volatility)";
      }
    } else {
      const trailSl = currentGoldPrice + slOffset;
      if (trailSl < newSl) {
        newSl = Number(trailSl.toFixed(2));
        reason = "Sniper Exit Protection (Tightening trailing stop due to momentum exhaustion/high volatility)";
      }
    }
  }
  // STAGE 3: AGGRESSIVE PROFIT TRAILING
  else if (profitInR >= 1.2) {
    let atrMultiplier = 2.0;
    if (volState === "HIGH") {
      atrMultiplier = 2.5;
    } else if (volState === "LOW") {
      atrMultiplier = 1.5;
    }

    if (session === "LONDON") {
      atrMultiplier -= 0.3;
    } else if (session === "ASIAN") {
      atrMultiplier += 0.4;
    }

    if (confidence > 0 && confidence < 70) {
      atrMultiplier -= 0.3;
    } else if (confidence >= 90) {
      atrMultiplier += 0.3;
    }

    atrMultiplier = Math.max(1.2, Math.min(3.5, atrMultiplier));

    const slOffset = atrMultiplier * atr;
    if (pos.tradeSide === "BUY") {
      const trailSl = currentGoldPrice - slOffset;
      if (trailSl > newSl && trailSl > pos.entryPrice) {
        newSl = Number(trailSl.toFixed(2));
        reason = `Aggressive Trailing (Dynamic ATR trailing active at ${atrMultiplier.toFixed(1)}x ATR)`;
      }
    } else {
      const trailSl = currentGoldPrice + slOffset;
      if (trailSl < newSl && trailSl < pos.entryPrice) {
        newSl = Number(trailSl.toFixed(2));
        reason = `Aggressive Trailing (Dynamic ATR trailing active at ${atrMultiplier.toFixed(1)}x ATR)`;
      }
    }
  }
  // STAGE 2: MICRO PROFIT LOCK
  else if (profitInR >= 1.0) {
    const lockOffset = Math.max(0.2, 0.1 * R);
    if (pos.tradeSide === "BUY") {
      const lockedSl = pos.entryPrice + lockOffset;
      if (lockedSl > newSl) {
        newSl = Number(lockedSl.toFixed(2));
        reason = "Micro Profit Lock (Locking in minor profit at 1.0R checkpoint)";
      }
    } else {
      const lockedSl = pos.entryPrice - lockOffset;
      if (lockedSl < newSl) {
        newSl = Number(lockedSl.toFixed(2));
        reason = "Micro Profit Lock (Locking in minor profit at 1.0R checkpoint)";
      }
    }
  }
  // STAGE 1: SAFE BREAKEVEN
  else if (profitInR >= 0.4) {
    if (pos.tradeSide === "BUY") {
      if (pos.entryPrice > newSl) {
        newSl = pos.entryPrice;
        reason = "Safe Breakeven Activated (Protecting capital at 0.4R milestone)";
      }
    } else {
      if (pos.entryPrice < newSl) {
        newSl = pos.entryPrice;
        reason = "Safe Breakeven Activated (Protecting capital at 0.4R milestone)";
      }
    }
  }

  if (newSl !== pos.sl) {
    pos.sl = newSl;
    addExecutionLog("INFO", "Dynamic SL Adjusted", `${reason}: Position ${pos.id} Stop Loss adjusted to $${newSl.toFixed(2)}.`);
    
    if (cTraderSession && cTraderWebSocket && cTraderWsStatus === "OPEN") {
      try {
        const modifyReq = {
          ctidTraderAccountId: BigInt(cTraderSession.accountId),
          positionId: BigInt(pos.id.replace("ctr_", "")),
          stopLoss: newSl,
          takeProfit: pos.tp
        };
        const payloadBytes = lookupType("ProtoOAModifyPositionSLTPReq").encode(modifyReq).finish();
        const framed = encodeFrame(payloadTypeEnum.OA_MODIFY_POSITION_SL_TP_REQ, payloadBytes);
        sendFrame(framed, "ProtoOAModifyPositionSLTPReq");
      } catch (err: any) {
        console.error("Failed to transmit cTrader SL modification:", err);
      }
    }
  }
}

// Partial Take Profit logic
function processPartialTakeProfit(pos: Position) {
  if (!riskSettings.partialTakeProfitEnabled) return;
  if (partialTpHitPositions.has(pos.id)) return;

  const currentProfit = pos.tradeSide === "BUY" ? (currentGoldPrice - pos.entryPrice) : (pos.entryPrice - currentGoldPrice);
  const triggerDistance = riskSettings.partialTakeProfitTriggerPips / 100;

  if (currentProfit >= triggerDistance) {
    partialTpHitPositions.add(pos.id);
    
    const partialVol = Math.round(pos.volume * (riskSettings.partialTakeProfitPct / 100));
    addExecutionLog("PARTIAL_CLOSE", "Partial Profit Taken", `Locking in ${riskSettings.partialTakeProfitPct}% profit for position ${pos.id} at $${currentGoldPrice.toFixed(2)}.`);

    if (cTraderSession && cTraderWebSocket && cTraderWsStatus === "OPEN") {
      try {
        const closeReq = {
          ctidTraderAccountId: BigInt(cTraderSession.accountId),
          positionId: BigInt(pos.id.replace("ctr_", "")),
          volume: BigInt(partialVol * 100)
        };
        const payloadBytes = lookupType("ProtoOAClosePositionReq").encode(closeReq).finish();
        const framed = encodeFrame(payloadTypeEnum.OA_CLOSE_POSITION_REQ, payloadBytes);
        sendFrame(framed, "ProtoOAClosePositionReq");
      } catch (err: any) {
        console.error("Partial close request failed:", err);
      }
    } else {
      const index = activePositions.findIndex(p => p.id === pos.id);
      if (index !== -1) {
        const actualPos = activePositions[index];
        const profitDiff = actualPos.tradeSide === "BUY" ? (currentGoldPrice - actualPos.entryPrice) : (actualPos.entryPrice - currentGoldPrice);
        const closedPnl = Number((profitDiff * (partialVol / 1000)).toFixed(2));
        
        tradingAccount.balance = Number((tradingAccount.balance + closedPnl).toFixed(2));
        actualPos.volume -= partialVol;
        actualPos.pnl = Number((actualPos.pnl * (actualPos.volume / (actualPos.volume + partialVol))).toFixed(2));
      }
    }
  }
}

// Recalculate floating metrics, leverage, free margin on ticker updates
function recalculateAccountMetrics() {
  if (!tradingAccount) return;

  let totalFloatingPnl = 0;
  activePositions.forEach((pos) => {
    pos.currentPrice = currentGoldPrice;
    const diff = pos.tradeSide === "BUY" ? (currentGoldPrice - pos.entryPrice) : (pos.entryPrice - currentGoldPrice);
    pos.pnl = Number((diff * (pos.volume / 1000)).toFixed(2));
    totalFloatingPnl += pos.pnl;

    // Local SL/TP hits fallback (safety check for offline/fallback run)
    if (pos.sl && ((pos.tradeSide === "BUY" && currentGoldPrice <= pos.sl) || (pos.tradeSide === "SELL" && currentGoldPrice >= pos.sl))) {
      closePosition(pos.id, "Stop Loss Hit [SL]");
    } else if (pos.tp && ((pos.tradeSide === "BUY" && currentGoldPrice >= pos.tp) || (pos.tradeSide === "SELL" && currentGoldPrice <= pos.tp))) {
      closePosition(pos.id, "Take Profit Hit [TP]");
    } else {
      // Process Trailing Stops & Partial Take Profit on ticker update
      if (riskSettings.trailingStopEnabled) {
        processStagedTrailing(pos);
      }
      processPartialTakeProfit(pos);
    }
  });

  tradingAccount.equity = Number((tradingAccount.balance + totalFloatingPnl).toFixed(2));
  
  let totalMargin = 0;
  activePositions.forEach((pos) => {
    totalMargin += (pos.volume * pos.entryPrice) / tradingAccount!.leverage / 1000;
  });
  tradingAccount.margin = Number(totalMargin.toFixed(2));
  tradingAccount.freeMargin = Number((tradingAccount.equity - tradingAccount.margin).toFixed(2));
  tradingAccount.accountHealthScore = calculateAccountHealthScore();
  tradingAccount.consecutiveLosses = consecutiveLosses;

  // Check Floating Drawdown Safeguard
  const drawdownPct = ((tradingAccount.balance - tradingAccount.equity) / tradingAccount.balance) * 100;
  if (drawdownPct >= riskSettings.maxDrawdownLimit) {
    addExecutionLog("WARNING", "Drawdown Breached", `Emergency liquidation! Floating drawdown of ${drawdownPct.toFixed(2)}% breached security threshold of ${riskSettings.maxDrawdownLimit}%.`);
    const idsToClose = activePositions.map((p) => p.id);
    idsToClose.forEach((id) => closePosition(id, "Emergency Liquidation due to Drawdown Breach"));
  }
}

function getDiagnostics() {
  return {
    authorized: !!cTraderSession,
    tokenValid: isTokenValid,
    tokenExpired: isTokenExpired,
    accountLinked: !!(cTraderSession?.accountId),
    streamActive: cTraderWsStatus === "OPEN",
    lastPing: lastPingSentTime > 0 ? new Date(lastPingSentTime).toLocaleTimeString() : "Never",
    lastHeartbeat: lastHeartbeatReceivedTime > 0 ? new Date(lastHeartbeatReceivedTime).toLocaleTimeString() : "Never",
    reconnectCount: reconnectAttempts
  };
}

// Broadcast tick/state values to all open websocket connections
function broadcastStateUpdate() {
  broadcastToFrontend({
    type: "TICKER_UPDATE",
    data: {
      price: currentGoldPrice > 0 ? {
        bid: currentGoldPrice - 0.08,
        ask: currentGoldPrice + 0.08,
        spread: 0.16
      } : {
        bid: 0,
        ask: 0,
        spread: 0
      },
      account: tradingAccount,
      connectionStatus: cTraderConnStatus,
      websocketStatus: cTraderWsStatus,
      positions: activePositions,
      candles: goldCandles.slice(-100),
      marketBrain: marketBrain,
      cTraderAccounts,
      activeAccountId: cTraderSession?.accountId || "",
      syncState,
      diagnostics: getDiagnostics()
    }
  });
}

// Send app auth payload
function sendOaAppAuth() {
  if (!cTraderSession || !cTraderWebSocket) return;
  try {
    const authReq = {
      clientId: cTraderSession.clientId,
      clientSecret: cTraderSession.clientSecret
    };
    const payloadBytes = lookupType("ProtoOAApplicationAuthReq").encode(authReq).finish();
    const framed = encodeFrame(payloadTypeEnum.OA_APPLICATION_AUTH_REQ, payloadBytes);
    
    addExecutionLog("INFO", "App Auth Request Transmitted", `Transmitting ProtoOAApplicationAuthReq to cTrader. Client ID: ${cTraderSession.clientId} | Secret length: ${cTraderSession.clientSecret ? cTraderSession.clientSecret.length : 0} characters.`);
    sendFrame(framed, "ProtoOAApplicationAuthReq");
  } catch (err: any) {
    console.error("Failed to build OA app auth req", err);
    addExecutionLog("WARNING", "App Auth Build Error", `Failed to build ProtoOAApplicationAuthReq: ${err.message}`);
  }
}

// Send account auth payload
function sendOaAccountAuth() {
  if (!cTraderSession || !cTraderWebSocket || !cTraderSession.accountId) return;
  try {
    const authReq = {
      ctidTraderAccountId: BigInt(cTraderSession.accountId),
      accessToken: cTraderSession.accessToken
    };
    const payloadBytes = lookupType("ProtoOAAccountAuthReq").encode(authReq).finish();
    const framed = encodeFrame(payloadTypeEnum.OA_ACCOUNT_AUTH_REQ, payloadBytes);
    
    addExecutionLog("INFO", "Account Auth Request Transmitted", `Transmitting ProtoOAAccountAuthReq to cTrader. Account ID: ${cTraderSession.accountId} | Token length: ${cTraderSession.accessToken ? cTraderSession.accessToken.length : 0} characters.`);
    sendFrame(framed, "ProtoOAAccountAuthReq");
  } catch (err: any) {
    console.error("Failed to build account auth req", err);
    addExecutionLog("WARNING", "Account Auth Build Error", `Failed to build ProtoOAAccountAuthReq: ${err.message}`);
  }
}

function getFriendlyErrorMessage(errCode: string, description: string): string {
  switch (errCode) {
    case "OA_AUTH_ERROR":
      return "Application authentication failed. This usually means your Client ID or Client Secret is incorrect, or your OpenAPI application is not approved/enabled on cTrader.";
    case "CH_UNAUTHORIZED_EXPIRED_TOKEN":
    case "INVALID_ACCESS_TOKEN":
    case "ACCESS_TOKEN_EXPIRED":
      return "The OAuth Access Token is invalid or has expired. Please click 'SECURE DIRECT BROADCAST ACCESS' again to re-authorize.";
    case "NOT_AUTHORIZED":
    case "NOT_AUTHORIZED_FOR_ACCOUNT":
      return "This application is not authorized to trade or view this account. Please verify that this account belongs to the profile that granted access during OAuth.";
    case "INVALID_REQUEST":
      return "Invalid request sent to cTrader OpenAPI. This can happen if the protocol fields are mismatching or the broker has custom restrictions.";
    default:
      return description || `Unknown cTrader OpenAPI error code: ${errCode}`;
  }
}

// Handle incoming cTrader open api messages
function handleOaMessage(data: Buffer) {
  try {
    const binary = new Uint8Array(data);
    const hex = Buffer.from(binary).toString("hex").toUpperCase();
    console.log(`[CTRADER RECV] Raw data (${binary.length} bytes): ${hex}`);
    
    const frame = decodeFrame(binary);
    console.log(`[CTRADER RECV] Decoded Frame. payloadType: ${frame.payloadType}, clientMsgId: ${frame.clientMsgId || "none"}`);
    addExecutionLog("INFO", "Reception Hex Dump", `Received ${binary.length} bytes. payloadType: ${frame.payloadType}. Hex: ${hex}`);

    switch (frame.payloadType) {
      case payloadTypeEnum.OA_APPLICATION_AUTH_RES:
        appAuthSuccessful = true;
        addExecutionLog("INFO", "App Stream Authorized", "Application credentials validated on cTrader network. Fetching accounts list.");
        sendOaGetAccounts();
        break;

      case payloadTypeEnum.OA_GET_ACCOUNTS_BY_ACCESS_TOKEN_RES: {
        let res: any;
        try {
          res = lookupType("ProtoOAGetAccountListByAccessTokenRes").decode(frame.payload) as any;
        } catch (err: any) {
          try {
            res = lookupType("ProtoOAGetAccountsByAccessTokenRes").decode(frame.payload) as any;
          } catch (fallbackErr: any) {
            addExecutionLog("WARNING", "Accounts Decode Error", `Could not decode accounts payload: ${fallbackErr.message}`);
            break;
          }
        }

        addExecutionLog("INFO", "Accounts Received", `Linked cTrader accounts fetched. Total found in this batch: ${res.ctidTraderAccount?.length || 0}`);

        if (res.ctidTraderAccount && res.ctidTraderAccount.length > 0) {
          const accountsList = res.ctidTraderAccount.map((acc: any) => ({
            accountId: String(acc.ctidTraderAccountId),
            isLive: !!acc.isLive,
            traderLogin: acc.traderLogin ? String(acc.traderLogin) : ""
          }));

          cTraderAccounts = accountsList;

          // Step 3. Broker Discovery Success
          syncState.oauthSuccess = true;
          syncState.tokenExchangeSuccess = true;
          syncState.accountDiscoverySuccess = true;
          broadcastStateUpdate();

          // Automatically select the first account matching the chosenAuthEnvironment, or fallback
          const targetIsLive = (chosenAuthEnvironment === "LIVE");
          const preferredAccount = 
            cTraderAccounts.find(a => a.isLive === targetIsLive) ||
            cTraderAccounts[0];
          
          if (preferredAccount) {
            cTraderSession!.accountId = preferredAccount.accountId;
            cTraderSession!.environment = preferredAccount.isLive ? "LIVE" : "DEMO";
            addExecutionLog("INFO", "Automated Primary Selector", `Selected primary account: ${preferredAccount.accountId} (${preferredAccount.isLive ? "LIVE" : "DEMO"}-mode) automatically.`);
          }

          // Step 4. Account Mapping Success
          syncState.accountMappingSuccess = true;
          broadcastStateUpdate();

          // Detect if we need to switch WebSocket environment to match the target account environment (either LIVE or DEMO)
          const activeAccount = cTraderAccounts.find(a => a.accountId === cTraderSession!.accountId) || cTraderAccounts[0];
          const targetEnv = activeAccount.isLive ? "LIVE" : "DEMO";
          const currentEnv = currentConnectedEnv || "LIVE";
          
          if (targetEnv !== currentEnv) {
            if (envSwitchCount >= 2) {
              addExecutionLog("WARNING", "Switching Prevented", `Prevented infinite reconnection loop: already switched environments ${envSwitchCount} times. Staying on current connection.`);
              envSwitchCount = 0;
            } else {
              envSwitchCount++;
              addExecutionLog("INFO", "Switching Environment", `Account ${activeAccount.accountId} requires ${targetEnv} connection. Reconnecting to correct proxy (Switch attempt: ${envSwitchCount})...`);
              cTraderSession!.environment = targetEnv;
              cTraderSession!.tradeServerHost = targetEnv === "LIVE" ? "live.ctraderapi.com" : "demo.ctraderapi.com";
              
              if (cTraderWebSocket) {
                cTraderWebSocket.removeAllListeners();
                cTraderWebSocket.close();
                cTraderWebSocket = null;
              }
              cTraderWsStatus = "CLOSED";
              connectToCTraderWebSocket();
              return;
            }
          } else {
            envSwitchCount = 0; // Reset switch counter when environment is aligned
          }
          
          addExecutionLog("INFO", "Target Account Mapped", `Mapping streaming bot to account ID: ${cTraderSession!.accountId} (${targetEnv}).`);
          sendOaAccountAuth();
        } else {
          addExecutionLog("WARNING", "No Accounts Found", "This cTrader access token does not have any linked trading accounts.");
          syncState.accountDiscoverySuccess = false;
          syncState.accountMappingSuccess = false;
          broadcastStateUpdate();
        }
        break;
      }

      case payloadTypeEnum.OA_ACCOUNT_AUTH_RES:
        syncState.wsAuthenticationSuccess = true;
        reconnectAttempts = 0; // Reset reconnect attempts only when full account sync/auth completes successfully
        addExecutionLog("INFO", "Account Stream Authorized", "Trading account successfully mapped and active. Syncing balance & positions.");
        broadcastStateUpdate();
        sendOaTraderReq();
        sendOaReconcileReq();
        sendOaSymbolsListReq();
        break;

      case payloadTypeEnum.OA_SYMBOLS_LIST_RES: {
        const res = lookupType("ProtoOASymbolsListRes").decode(frame.payload) as any;
        if (res.symbol) {
          const list = Array.isArray(res.symbol) ? res.symbol : [res.symbol];
          const goldSymbol = list.find((s: any) => s.symbolName === "XAUUSD" || s.symbolName === "GOLD");
          if (goldSymbol) {
            goldSymbolId = BigInt(goldSymbol.symbolId);
            addExecutionLog("INFO", "Gold Symbol Mapped", `Dynamically mapped Gold to Symbol ID: ${goldSymbolId}`);
          } else {
            addExecutionLog("WARNING", "Gold Mapping Alert", "XAUUSD symbol not found in asset list. Defaulting to Symbol ID 1.");
            goldSymbolId = 1n;
          }
        }
        subscribeToSpots();
        syncState.realtimeSyncSuccess = true;
        broadcastStateUpdate();
        break;
      }

      case payloadTypeEnum.OA_TRADER_RES: {
        const res = lookupType("ProtoOATraderRes").decode(frame.payload) as any;
        const trader = res.trader;
        if (trader) {
          // cTrader balance is in cents (e.g. 100000 cents is $1000.00)
          const realBalance = Number(trader.balance) / 100;
          let realLeverage = 500;
          if (trader.leverage) {
            realLeverage = Number(trader.leverage);
          } else if (trader.leverageInCents) {
            realLeverage = Number(trader.leverageInCents) / 100;
          }

          tradingAccount = {
            ctidTraderAccountId: String(res.ctidTraderAccountId),
            brokerName: trader.brokerName || "cTrader Partner",
            accountType: trader.traderType === "LIVE" || trader.traderType === "2" ? "LIVE" : "DEMO",
            balance: realBalance,
            equity: realBalance,
            margin: 0,
            freeMargin: realBalance,
            leverage: realLeverage,
            currency: trader.currency || "USD",
            live: trader.traderType === "LIVE" || trader.traderType === "2"
          };

          syncState.realtimeSyncSuccess = true;
          syncState.balanceSyncSuccess = true;
          checkAllStepsSynced();

          addExecutionLog(
            "INFO",
            "Trader Profile Synced",
            `REAL cTrader profile loaded: Balance $${realBalance.toLocaleString()} | Leverage 1:${realLeverage} | Broker: ${tradingAccount.brokerName}`
          );

          broadcastStateUpdate();
        }
        break;
      }

      case payloadTypeEnum.OA_RECONCILE_RES: {
        const res = lookupType("ProtoOAReconcileRes").decode(frame.payload) as any;
        const parsedPositions: Position[] = [];
        const newIds = new Set<string>();

        if (res.position) {
          const list = Array.isArray(res.position) ? res.position : [res.position];
          list.forEach((pos: any) => {
            const side: "BUY" | "SELL" = pos.tradeSide === 1 || pos.tradeSide === "BUY" ? "BUY" : "SELL";
            const volumeUnits = Number(pos.volume) / 100; // cTrader volume divisor
            const entryPrice = Number(pos.entryPrice);
            const posId = "ctr_" + String(pos.positionId);
            newIds.add(posId);

            const existingPos = activePositions.find(p => p.id === posId);
            const stopLossVal = pos.stopLoss ? Number(pos.stopLoss) : undefined;
            const takeProfitVal = pos.takeProfit ? Number(pos.takeProfit) : undefined;

            parsedPositions.push({
              id: posId,
              symbol: "XAUUSD",
              tradeSide: side,
              volume: volumeUnits,
              entryPrice: entryPrice,
              currentPrice: currentGoldPrice || entryPrice,
              sl: stopLossVal,
              tp: takeProfitVal,
              initialSL: existingPos?.initialSL || stopLossVal,
              initialTP: existingPos?.initialTP || takeProfitVal,
              pnl: 0,
              timestamp: pos.utcLastUpdateTimestamp ? Number(pos.utcLastUpdateTimestamp) : Date.now()
            });
          });
        }

        // Detect closed positions
        activePositions.forEach((oldPos) => {
          if (!newIds.has(oldPos.id)) {
            // This position was closed!
            addExecutionLog(
              oldPos.pnl >= 0 ? "TP_HIT" : "SL_HIT",
              "cTrader Position Closed",
              `Position ${oldPos.id} (${oldPos.tradeSide}) closed at $${currentGoldPrice.toFixed(2)}. PnL: $${oldPos.pnl.toFixed(2)}`
            );
            // Track consecutive losses
            if (oldPos.pnl < 0) {
              consecutiveLosses++;
            } else if (oldPos.pnl > 0.5) {
              consecutiveLosses = 0;
            }
            partialTpHitPositions.delete(oldPos.id);
          }
        });

        activePositions = parsedPositions;
        recalculateAccountMetrics();
        addExecutionLog(
          "INFO",
          "Positions Reconciled",
          `Synced real-time positions with cTrader broker: ${activePositions.length} active trade(s) detected.`
        );

        syncState.positionSyncSuccess = true;
        checkAllStepsSynced();

        broadcastStateUpdate();
        break;
      }

      case payloadTypeEnum.OA_SPOT_EVENT: {
        const spotEvent = lookupType("ProtoOASpotEvent").decode(frame.payload) as any;
        const symId = spotEvent.symbolId ? BigInt(spotEvent.symbolId) : 0n;
        if (symId === goldSymbolId) {
          if (spotEvent.bid !== undefined) {
            let divisor = 100000;
            const rawBidVal = Number(spotEvent.bid);
            if (rawBidVal > 0) {
              if (rawBidVal / 100000 >= 1000 && rawBidVal / 100000 <= 4000) {
                divisor = 100000;
              } else if (rawBidVal / 100 >= 1000 && rawBidVal / 100 <= 4000) {
                divisor = 100;
              } else if (rawBidVal / 1000 >= 1000 && rawBidVal / 1000 <= 4000) {
                divisor = 1000;
              } else if (rawBidVal / 10000 >= 1000 && rawBidVal / 10000 <= 4000) {
                divisor = 10000;
              }
            }

            const rawBid = Number(spotEvent.bid) / divisor;
            const rawAsk = spotEvent.ask !== undefined ? Number(spotEvent.ask) / divisor : rawBid + 0.15;
            currentGoldPrice = Number(((rawBid + rawAsk) / 2).toFixed(2));

            // Build/update standard candles live from real-time tick streaming data
            updateCandlesWithTick(currentGoldPrice, Date.now());

            recalculateAccountMetrics();
            broadcastStateUpdate();
          }
        }
        break;
      }

      case payloadTypeEnum.OA_EXECUTION_EVENT:
        const execEvent = lookupType("ProtoOAExecutionEvent").decode(frame.payload) as any;
        addExecutionLog(
          "INFO",
          "cTrader Event",
          `Exchange action finalized on cTrader: Type ID ${execEvent.executionType}`
        );
        // Refresh account profile details & position states to remain in 100% sync
        sendOaTraderReq();
        sendOaReconcileReq();
        break;
      
      case payloadTypeEnum.PING_RES:
        // Heartbeat received
        lastHeartbeatReceivedTime = Date.now();
        broadcastStateUpdate();
        break;

      case payloadTypeEnum.OA_ERROR_RES: {
        try {
          const errorRes = lookupType("ProtoOAErrorRes").decode(frame.payload) as any;
          const errCode = errorRes.errorCode;
          const errMsg = errorRes.description || "Unknown cTrader OpenAPI error";
          const friendlyMessage = getFriendlyErrorMessage(errCode, errMsg);
          
          cTraderLastDirectError = `Error Code: "${errCode}" | Description: "${errMsg}" | Diagnostic: "${friendlyMessage}"`;
          
          addExecutionLog("WARNING", "cTrader Error Event", `cTrader returned error (${errCode}): ${friendlyMessage} [Description: ${errMsg}]`);

          // Reset subsequent steps to prevent hanging UI trackers on fatal error
          syncState.accountDiscoverySuccess = false;
          syncState.accountMappingSuccess = false;
          syncState.wsAuthenticationSuccess = false;
          syncState.realtimeSyncSuccess = false;
          syncState.balanceSyncSuccess = false;
          syncState.positionSyncSuccess = false;
          cTraderConnStatus = "DISCONNECTED";

          if (errCode === "CH_UNAUTHORIZED_EXPIRED_TOKEN" || errCode === "INVALID_ACCESS_TOKEN" || errCode === "OA_AUTH_ERROR" || errCode === "ACCESS_TOKEN_EXPIRED") {
            addExecutionLog("WARNING", "Token Expired", "Access token has expired or has been revoked by the broker. Demanding clean reauthorization.");
            isTokenValid = false;
            isTokenExpired = true;
            cTraderSession = null;
            if (cTraderWebSocket) {
              cTraderWebSocket.close();
            }
          }
          broadcastStateUpdate();
        } catch (decodeErr: any) {
          console.error("Failed to decode ProtoOAErrorRes", decodeErr);
        }
        break;
      }

      case payloadTypeEnum.ERROR_RES: {
        try {
          const errorRes = lookupType("ProtoErrorRes").decode(frame.payload) as any;
          const errCode = errorRes.errorCode;
          const errMsg = errorRes.description || "General cTrader system error";
          
          cTraderLastDirectError = `System Error Code: "${errCode}" | Description: "${errMsg}"`;
          
          addExecutionLog("WARNING", "cTrader System Error", `cTrader returned system-level error code (${errCode}): ${errMsg}`);
          addExecutionLog("WARNING", "Handshake Stuck Diagnostic", `FATAL SYSTEM ERROR FROM CTRADER DURING HANDSHAKE/STREAM: ${errCode} - ${errMsg}. Please verify that the Client ID, Client Secret, or access token are perfectly matched and have permissions for this chosen environment.`);
          
          cTraderConnStatus = "DISCONNECTED";
          broadcastStateUpdate();
        } catch (decodeErr: any) {
          console.error("Failed to decode ProtoErrorRes", decodeErr);
        }
        break;
      }

      default: {
        // Log generic incoming frames for maximum tracing
        const payloadTypeName = Object.keys(payloadTypeEnum).find(k => (payloadTypeEnum as any)[k] === frame.payloadType) || "Unknown";
        addExecutionLog("INFO", "cTrader Stream Received", `Received unhandled payload frame type: ${frame.payloadType} (${payloadTypeName}). Size: ${frame.payload.length} bytes.`);
        break;
      }
    }
  } catch (err: any) {
    console.error("Failed to decode framed cTrader message", err);
  }
}

// Subscribe XAUUSD spot quotes
function subscribeToSpots() {
  if (!cTraderSession || !cTraderWebSocket) return;
  try {
    const subscribeReq = {
      ctidTraderAccountId: BigInt(cTraderSession.accountId),
      symbolId: [goldSymbolId] // Dynamically resolved Gold symbol ID
    };
    const payloadBytes = lookupType("ProtoOASubscribeSpotsReq").encode(subscribeReq).finish();
    const framed = encodeFrame(payloadTypeEnum.OA_SUBSCRIBE_SPOTS_REQ, payloadBytes);
    
    sendFrame(framed, "ProtoOASubscribeSpotsReq");
    addExecutionLog("INFO", "Tick Feed Subscribed", "Listening to real-time spot Gold (XAUUSD) quotes directly from cTrader broker.");
  } catch (err: any) {
    console.error("Failed to compile spots subscription req", err);
  }
}

// WebSocket connection to frontend
const wss = new WebSocketServer({ noServer: true });
wss.on("connection", (ws: WebSocket) => {
  wsClients.push(ws);
  
  // Send initial state immediately
  ws.send(JSON.stringify({
    type: "INITIAL_STATE",
    data: {
      account: tradingAccount,
      connectionStatus: cTraderConnStatus,
      websocketStatus: cTraderWsStatus,
      positions: activePositions,
      marketPrice: currentGoldPrice > 0 ? {
        bid: currentGoldPrice - 0.08,
        ask: currentGoldPrice + 0.08,
        spread: 0.16
      } : {
        bid: 0,
        ask: 0,
        spread: 0
      },
      candles: goldCandles.slice(-120),
      marketBrain,
      executionFeed,
      riskSettings,
      credentials: {
        clientId: getClientCredentials().clientId,
        clientSecret: getClientCredentials().clientSecret ? "••••••••" : "",
        isConfigured: !!(getClientCredentials().clientId && getClientCredentials().clientSecret)
      },
      cTraderAccounts,
      activeAccountId: cTraderSession?.accountId || "",
      diagnostics: getDiagnostics()
    }
  }));

  ws.on("close", () => {
    wsClients = wsClients.filter((client) => client !== ws);
  });
});

// Upgrade server connections to support standard WebSockets
server.on("upgrade", (request, socket, head) => {
  const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;
  if (pathname === "/api/ws" || pathname === "/api/ws/") {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit("connection", ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Serve frontend assets in production and development (Vite Integration)
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`SmartBlinks server running on http://localhost:${PORT}`);
  });
}

startServer();
