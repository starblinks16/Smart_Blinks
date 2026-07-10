import React, { useState, useEffect, useRef } from "react";
import { ConnectionStatus, WebSocketState, DashboardState, Position, Candle, ExecutionLog, RiskSettings } from "./types";
import Sidebar from "./components/Sidebar";
import Overview from "./components/Overview";
import MarketBrain from "./components/MarketBrain";
import AITrading from "./components/AITrading";
import RiskEngine from "./components/RiskEngine";
import ExecutionFeed from "./components/ExecutionFeed";
import Connections from "./components/Connections";
import Settings from "./components/Settings";
import LoginGateway from "./components/LoginGateway";
import { ShieldCheck, RefreshCw, AlertCircle, Menu } from "lucide-react";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Dashboard Live State Management
  const [state, setState] = useState<DashboardState>({
    account: null,
    connectionStatus: "DISCONNECTED",
    websocketStatus: "CLOSED",
    positions: [],
    marketPrice: { bid: 2335.40, ask: 2335.56, spread: 0.16 },
    candles: [],
    marketBrain: {
      marketMood: "NEUTRAL",
      volatilityState: "NORMAL",
      confidenceLevel: 75,
      aggressionState: "BALANCED",
      sessionState: "LONDON",
      executionReadiness: "READY",
      activeStrategy: "CONTINUATION",
      trendStrength: 60,
      liquidityWarnings: [],
      comments: ["System initializing. Ready for telemetry stream."]
    },
    executionFeed: [],
    riskSettings: {
      maxRiskPerTrade: 1.0,
      defaultLotSize: 0.05,
      maxDrawdownLimit: 15.0,
      trailingStopEnabled: true,
      trailingStopTriggerPips: 150,
      trailingStopDistancePips: 100,
      partialTakeProfitEnabled: true,
      partialTakeProfitPct: 50,
      partialTakeProfitTriggerPips: 200
    },
    credentials: {
      clientId: "",
      clientSecret: "",
      isConfigured: false
    },
    syncState: {
      oauthSuccess: false,
      tokenExchangeSuccess: false,
      accountDiscoverySuccess: false,
      accountMappingSuccess: false,
      wsAuthenticationSuccess: false,
      realtimeSyncSuccess: false,
      balanceSyncSuccess: false,
      positionSyncSuccess: false
    },
    redirectUri: "",
    diagnostics: {
      authorized: false,
      tokenValid: false,
      tokenExpired: false,
      accountLinked: false,
      streamActive: false,
      lastPing: "Never",
      lastHeartbeat: "Never",
      reconnectCount: 0
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [errorText, setErrorText] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  // Check login session on load
  useEffect(() => {
    const session = localStorage.getItem("smartblinks_session_token") || sessionStorage.getItem("smartblinks_session_token");
    if (session) {
      setIsAuthenticated(true);
    }
    setIsLoading(false);
  }, []);

  // Fetch initial REST state once authenticated
  const fetchState = async () => {
    try {
      const res = await fetch("/api/state");
      if (!res.ok) throw new Error("Failed to pull state telemetry");
      const data = await res.json();
      setState((prev) => ({
        ...prev,
        ...data
      }));
    } catch (e: any) {
      setErrorText(e.message || "Failed to initialize telemetry link");
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchState();
    }
  }, [isAuthenticated]);

  // Connect WebSocket for live cTrader ticks and neural logs
  useEffect(() => {
    if (!isAuthenticated) return;

    let reconnectTimer: any;
    let ws: WebSocket;

    const connectWS = () => {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}/api/ws`;

      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setState((prev) => ({ ...prev, websocketStatus: "OPEN" }));
      };

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          
          if (payload.type === "INITIAL_STATE") {
            setState((prev) => ({
              ...prev,
              account: payload.data.account,
              connectionStatus: payload.data.connectionStatus,
              websocketStatus: payload.data.websocketStatus,
              positions: payload.data.positions,
              marketPrice: payload.data.marketPrice,
              candles: payload.data.candles,
              marketBrain: payload.data.marketBrain,
              executionFeed: payload.data.executionFeed,
              riskSettings: payload.data.riskSettings,
              credentials: payload.data.credentials,
              cTraderAccounts: payload.data.cTraderAccounts,
              activeAccountId: payload.data.activeAccountId,
              syncState: payload.data.syncState
            }));
          } else if (payload.type === "TICKER_UPDATE") {
            setState((prev) => ({
              ...prev,
              marketPrice: payload.data.price,
              account: payload.data.account,
              positions: payload.data.positions,
              candles: payload.data.candles,
              marketBrain: payload.data.marketBrain ? payload.data.marketBrain : prev.marketBrain,
              cTraderAccounts: payload.data.cTraderAccounts !== undefined ? payload.data.cTraderAccounts : prev.cTraderAccounts,
              activeAccountId: payload.data.activeAccountId !== undefined ? payload.data.activeAccountId : prev.activeAccountId,
              syncState: payload.data.syncState !== undefined ? payload.data.syncState : prev.syncState
            }));
          } else if (payload.type === "EXECUTION_LOG") {
            setState((prev) => ({
              ...prev,
              executionFeed: [payload.data, ...prev.executionFeed].slice(0, 200)
            }));
          }
        } catch (e) {
          console.error("Failed to parse websocket event", e);
        }
      };

      ws.onclose = () => {
        setState((prev) => ({ ...prev, websocketStatus: "CLOSED" }));
        reconnectTimer = setTimeout(connectWS, 3000); // Auto reconnect backoff
      };

      ws.onerror = () => {
        setState((prev) => ({ ...prev, websocketStatus: "ERROR" }));
      };
    };

    connectWS();

    // Listen for cross-origin popup cTrader auth success message (OAUTH_AUTH_SUCCESS)
    const handleAuthMessage = async (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith(".run.app") && !origin.includes("localhost")) {
        return;
      }
      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        try {
          // Automatically trigger the backend's account discovery and stream auto-selection flow immediately
          await fetch("/api/ctrader/connect", { method: "POST" });
        } catch (e) {
          console.error("Failed to automatically trigger cTrader stream connection:", e);
        }
        fetchState(); // Refetch linked cTrader status
      }
    };
    window.addEventListener("message", handleAuthMessage);

    return () => {
      clearTimeout(reconnectTimer);
      if (ws) ws.close();
      window.removeEventListener("message", handleAuthMessage);
    };
  }, [isAuthenticated]);

  // Action: Save custom developer keys for OAuth Link
  const handleSaveCredentials = async (clientId: string, clientSecret: string, wsMode?: string) => {
    const res = await fetch("/api/credentials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, clientSecret, wsMode })
    });
    if (!res.ok) {
      throw new Error("Failed to register client credentials");
    }
    fetchState();
  };

  // Action: Launch popup authorization flow
  const handleInitiateOAuth = async (environment?: "DEMO" | "LIVE") => {
    try {
      const urlParams = environment ? `?environment=${environment}` : "";
      const res = await fetch(`/api/auth/url${urlParams}`);
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to generate auth link");
      }
      const { url } = data;

      // Open OAuth directly in a centered popup
      const width = 600;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const authWindow = window.open(
        url,
        "ctrader_oauth_popup",
        `width=${width},height=${height},left=${left},top=${top},scrollbars=yes,resizable=yes`
      );

      if (!authWindow) {
        alert("Security popup blocked. Please allow popups for SmartBlinks AI to authorize.");
      }
    } catch (e: any) {
      alert("cTrader Link Initiator Error: " + e.message);
    }
  };

  // Action: Close active cTrader position
  const handleClosePosition = async (positionId: string) => {
    try {
      const res = await fetch("/api/positions/close", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ positionId })
      });
      if (!res.ok) throw new Error("Failed to close position");
      fetchState();
    } catch (e: any) {
      console.error("Failed to close position", e);
    }
  };

  // Action: Toggle AI active status
  const handleToggleAiTrading = async () => {
    try {
      const res = await fetch("/api/trading/toggle", { method: "POST" });
      if (!res.ok) throw new Error("Failed to toggle autonomous core");
      const data = await res.json();
      setState((prev) => ({
        ...prev,
        marketBrain: {
          ...prev.marketBrain,
          executionReadiness: data.active ? "READY" : "STANDBY"
        }
      }));
    } catch (e: any) {
      console.error(e);
    }
  };

  // Action: Execute direct manual order override
  const handleManualTrade = async (side: "BUY" | "SELL", lots: number) => {
    try {
      const res = await fetch("/api/trading/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ side, lots })
      });
      if (!res.ok) throw new Error("Manual entry rejected by broker core");
      fetchState();
    } catch (e: any) {
      alert("Override execution failure: " + e.message);
    }
  };

  // Action: Save custom risk parameters
  const handleSaveRiskSettings = async (settings: {
    maxRisk: number;
    defaultLotSize: number;
    maxDrawdown: number;
    trailingEnabled: boolean;
  }) => {
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings)
      });
      if (!res.ok) throw new Error("Failed to apply settings");
      const data = await res.json();
      setState((prev) => ({
        ...prev,
        riskSettings: data.settings
      }));
    } catch (e: any) {
      console.error(e);
    }
  };

  // Action: Clear terminal logs
  const handleClearLogs = () => {
    setState((prev) => ({
      ...prev,
      executionFeed: []
    }));
  };

  // Action: Logout / Terminate Session
  const handleLogout = () => {
    localStorage.removeItem("smartblinks_session_token");
    sessionStorage.removeItem("smartblinks_session_token");
    setIsAuthenticated(false);
    setActiveTab("overview");
  };

  if (isLoading) {
    return (
      <div className="w-screen h-screen bg-[#040508] flex flex-col items-center justify-center space-y-4">
        <RefreshCw size={36} className="text-cyan-400 animate-spin" />
        <span className="text-xs font-mono tracking-widest text-gray-500 uppercase">Synchronizing Nodes...</span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginGateway onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  // Render view depending on active tab
  const renderContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <Overview
            account={state.account}
            positions={state.positions}
            candles={state.candles}
            price={state.marketPrice}
            marketBrain={state.marketBrain}
            executionFeed={state.executionFeed}
            onClosePosition={handleClosePosition}
            isAiTradingActive={state.marketBrain.executionReadiness === "READY"}
          />
        );
      case "brain":
        return <MarketBrain marketBrain={state.marketBrain} candles={state.candles} />;
      case "trading":
        return (
          <AITrading
            isAiTradingActive={state.marketBrain.executionReadiness === "READY"}
            onToggleAiTrading={handleToggleAiTrading}
            positions={state.positions}
            onClosePosition={handleClosePosition}
            account={state.account}
            onManualTrade={handleManualTrade}
          />
        );
      case "risk":
        return <RiskEngine riskSettings={state.riskSettings} onSaveSettings={handleSaveRiskSettings} />;
      case "feed":
        return <ExecutionFeed executionFeed={state.executionFeed} onClearLogs={handleClearLogs} />;
      case "connections":
        return (
          <Connections
            connectionStatus={state.connectionStatus}
            account={state.account}
            credentials={state.credentials}
            cTraderAccounts={state.cTraderAccounts}
            activeAccountId={state.activeAccountId}
            onSaveCredentials={handleSaveCredentials}
            onInitiateOAuth={handleInitiateOAuth}
            syncState={state.syncState}
            redirectUri={state.redirectUri}
            diagnostics={state.diagnostics}
            onSelectAccount={async (accountId) => {
              try {
                const res = await fetch("/api/trading/account", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ accountId })
                });
                if (!res.ok) throw new Error("Failed to switch active account");
                fetchState();
              } catch (e: any) {
                alert(e.message);
              }
            }}
          />
        );
      case "settings":
        return <Settings />;
      default:
        return null;
    }
  };

  return (
    <div className="flex w-screen h-screen bg-[#040508] text-slate-100 overflow-hidden font-sans">
      {/* Desktop Sidebar (visible on lg screens and above) */}
      <div className="hidden lg:flex w-64 h-screen shrink-0">
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          connectionStatus={state.connectionStatus}
          isAiTradingActive={state.marketBrain.executionReadiness === "READY"}
          onLogout={handleLogout}
          account={state.account}
        />
      </div>

      {/* Mobile/Tablet Drawer Backdrop */}
      {isMobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      {/* Mobile/Tablet Drawer Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 w-64 h-screen z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isMobileSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          connectionStatus={state.connectionStatus}
          isAiTradingActive={state.marketBrain.executionReadiness === "READY"}
          onLogout={handleLogout}
          onNavItemClick={() => setIsMobileSidebarOpen(false)}
          showCloseButton={true}
          onClose={() => setIsMobileSidebarOpen(false)}
          account={state.account}
        />
      </div>

      {/* Main Workspace Frame */}
      <main className="flex-1 flex flex-col min-w-0 relative h-full overflow-hidden">
        {/* Mobile Top Navigation Header */}
        <div className="lg:hidden flex items-center justify-between bg-[#08090C] border-b border-gray-800/40 px-4 py-3 shrink-0 z-30">
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setIsMobileSidebarOpen(true)}
              id="btn-mobile-menu-toggle"
              className="p-2 text-gray-400 hover:text-slate-100 bg-gray-800/20 hover:bg-gray-800/40 rounded-lg transition-colors duration-200"
            >
              <Menu size={20} />
            </button>
            <div className="flex items-baseline text-md font-bold">
              <span className="text-slate-100 font-sans">Smart</span>
              <span className="text-[#D4AF37] font-sans">Blinks</span>
            </div>
          </div>

          {/* Status Indicators in Mobile Bar */}
          <div className="flex items-center space-x-3 text-[10px] font-mono">
            <div className="flex items-center space-x-1 text-slate-400">
              <span className={`h-1.5 w-1.5 rounded-full ${state.marketBrain.executionReadiness === "READY" ? "bg-cyan-400 animate-pulse" : "bg-amber-500"}`} />
              <span className="hidden sm:inline">{state.marketBrain.executionReadiness === "READY" ? "AI ACTIVE" : "AI STANDBY"}</span>
            </div>
            <div className="h-3 w-[1px] bg-gray-800/60" />
            <div className="flex items-center space-x-1 text-slate-400">
              <span className={`h-1.5 w-1.5 rounded-full ${state.connectionStatus === "CONNECTED" ? "bg-cyan-400" : state.connectionStatus === "CONNECTING" ? "bg-amber-400 animate-pulse" : "bg-red-500"}`} />
              <span>{state.connectionStatus}</span>
            </div>
          </div>
        </div>

        {/* Error notification bar if state fetch fails */}
        {errorText && (
          <div className="bg-red-500/10 border-b border-red-500/25 px-6 py-2.5 flex items-center space-x-2 text-xs font-semibold text-red-400">
            <AlertCircle size={14} />
            <span>{errorText}</span>
          </div>
        )}

        {/* Render Active Dashboard Frame */}
        <div className="flex-1 min-h-0 relative overflow-hidden">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}
