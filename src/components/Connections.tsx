import React, { useState } from "react";
import { Link, ShieldAlert, Key, HelpCircle, CheckCircle, ExternalLink, RefreshCw, AlertCircle, Check, Copy } from "lucide-react";
import { ConnectionStatus, TradingAccount } from "../types";

interface ConnectionsProps {
  connectionStatus: ConnectionStatus;
  account: TradingAccount | null;
  credentials: {
    clientId: string;
    clientSecret: string;
    isConfigured: boolean;
  };
  cTraderAccounts?: Array<{ accountId: string; isLive: boolean; traderLogin: string }>;
  activeAccountId?: string;
  onSaveCredentials: (clientId: string, clientSecret: string, wsMode?: string) => void;
  onInitiateOAuth: (environment?: "DEMO" | "LIVE") => void;
  onSelectAccount?: (accountId: string) => void;
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

export default function Connections({
  connectionStatus,
  account,
  credentials,
  cTraderAccounts,
  activeAccountId,
  onSaveCredentials,
  onInitiateOAuth,
  onSelectAccount,
  syncState,
  redirectUri,
  diagnostics
}: ConnectionsProps) {
  const [clientIdInput, setClientIdInput] = useState(credentials.clientId);
  const [clientSecretInput, setClientSecretInput] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [errorText, setErrorText] = useState("");
  const [copied, setCopied] = useState(false);
  const [authEnv, setAuthEnv] = useState<"DEMO" | "LIVE">("DEMO");
  const [wsMode, setWsMode] = useState<"live" | "demo">("demo");

  React.useEffect(() => {
    if (credentials.clientId) {
      setClientIdInput(credentials.clientId);
    }
  }, [credentials.clientId]);

  const handleCopyCallback = () => {
    const callbackUrl = redirectUri || `${window.location.origin}/callback`;
    navigator.clipboard.writeText(callbackUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSaveCredentials = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedClientId = (clientIdInput || "").trim();
    const trimmedClientSecret = (clientSecretInput || "").trim();
    if (!trimmedClientId || !trimmedClientSecret) {
      setErrorText("Please fill out Client ID, Client Secret, and API Endpoint Mode.");
      return;
    }
    setErrorText("");
    setIsSaving(true);
    try {
      await onSaveCredentials(trimmedClientId, trimmedClientSecret, wsMode);
      setClientSecretInput(""); // clear sensitive entry
    } catch (e: any) {
      setErrorText(e.message || "Failed to save developer keys.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 h-full bg-[#060709] text-slate-100 font-sans select-none">
      {/* Header */}
      <header className="bg-gradient-to-r from-gray-900/40 to-gray-950/60 border border-gray-800/40 p-4 sm:p-6 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 backdrop-blur-md">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent flex items-center space-x-2.5">
            <Link className="text-amber-500" />
            <span>cTrader Node Connector</span>
          </h1>
          <p className="text-[10px] sm:text-[11px] text-gray-500 font-mono mt-0.5 uppercase tracking-wide">
            Sync autonomous platform directly with cTrader Open API systems
          </p>
        </div>
      </header>

      {/* Connection State Info Panel */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Connection Control Card */}
        <div className="lg:col-span-2 bg-gradient-to-b from-gray-900/50 to-gray-950/70 border border-gray-800/30 p-6 rounded-xl shadow-2xl relative">
          <div className="space-y-4">
            <h2 className="text-xs font-bold font-sans tracking-widest text-slate-400 uppercase flex items-center space-x-2">
              <CheckCircle size={14} className="text-cyan-400" />
              <span>Link Control Node</span>
            </h2>

            {connectionStatus === "CONNECTED" || connectionStatus === "CONNECTING" ? (
              <div className="space-y-6">
                {/* State Badge and Summary */}
                <div className={`p-5 rounded-lg border flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 transition-all duration-300 shadow-lg ${
                  connectionStatus === "CONNECTED" 
                    ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-400 shadow-emerald-950/10" 
                    : "bg-amber-500/5 border-amber-500/20 text-amber-400 shadow-amber-950/10"
                }`}>
                  <div className="flex items-center space-x-3.5">
                    {connectionStatus === "CONNECTED" ? (
                      <div className="h-10 w-10 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-pulse">
                        <CheckCircle size={22} />
                      </div>
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.15)]">
                        <RefreshCw size={20} className="animate-spin" />
                      </div>
                    )}
                    <div className="space-y-0.5">
                      <h3 className="text-[13px] font-extrabold uppercase tracking-widest font-mono">
                        {connectionStatus === "CONNECTED" ? "LIVE SYNCHRONIZED" : "SYNCHRONIZATION IN PROGRESS"}
                      </h3>
                      <p className="text-[11px] text-slate-400 font-sans">
                        {connectionStatus === "CONNECTED" 
                          ? "Cryptographic stream established and active. Autonomous strategies armed." 
                          : "Executing handshake sequences and balancing assets with cTrader OpenAPI proxy."}
                      </p>
                    </div>
                  </div>

                  <span className={`text-[10px] font-extrabold px-3 py-1 rounded-full uppercase font-mono tracking-widest shadow-inner ${
                    connectionStatus === "CONNECTED"
                      ? "bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-300 border border-amber-500/20 animate-pulse"
                  }`}>
                    {connectionStatus === "CONNECTED" ? "SYSTEM READY" : "ALIGNED PENDING"}
                  </span>
                </div>

                {/* Account Details if fully aligned */}
                {connectionStatus === "CONNECTED" && account && (
                  <div className="bg-gradient-to-r from-gray-950/80 to-gray-900/60 border border-gray-800/50 p-5 rounded-lg grid grid-cols-2 md:grid-cols-4 gap-4 font-mono text-[12px] text-slate-300">
                    <div className="space-y-1">
                      <span className="text-gray-500 text-[9px] block uppercase tracking-wider">Broker Partner</span>
                      <span className="font-bold text-slate-100">{account.brokerName || "cTrader Partner"}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-500 text-[9px] block uppercase tracking-wider">Secure Account</span>
                      <span className="font-bold text-slate-100">#{account.ctidTraderAccountId}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-500 text-[9px] block uppercase tracking-wider">Real Net Balance</span>
                      <span className="font-bold text-cyan-400">${account.balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="space-y-1">
                      <span className="text-gray-500 text-[9px] block uppercase tracking-wider">Effective Leverage</span>
                      <span className="font-bold text-amber-400">1:{account.leverage}</span>
                    </div>
                  </div>
                )}

                {/* 8-Step Cryptographic Handshake Tracker */}
                <div className="bg-gray-950/60 border border-gray-900 rounded-lg p-5 space-y-4">
                  <h4 className="text-[11px] font-bold font-mono tracking-wider text-slate-400 uppercase flex items-center space-x-2 border-b border-gray-900 pb-2.5">
                    <ShieldAlert size={12} className="text-amber-500" />
                    <span>Real-Time Synchronization Checkpoints</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {[
                      { label: "OAuth Verification", key: "oauthSuccess" as const, desc: "Validate SmartBlinks Client application permissions" },
                      { label: "Token Exchange", key: "tokenExchangeSuccess" as const, desc: "Obtain secure bearer access tokens from cTrader" },
                      { label: "Broker Discovery", key: "accountDiscoverySuccess" as const, desc: "Retrieve links to demo and live portfolios" },
                      { label: "Account Mapping", key: "accountMappingSuccess" as const, desc: "Assign active session variables to designated account" },
                      { label: "SSL Handshake", key: "wsAuthenticationSuccess" as const, desc: "Connect client session with OpenAPI WebSocket" },
                      { label: "Price Stream", key: "realtimeSyncSuccess" as const, desc: "Acquire real-time price feeds for gold index (XAUUSD)" },
                      { label: "Capital Balance", key: "balanceSyncSuccess" as const, desc: "Align server parameters with correct current net equity" },
                      { label: "Positions Reconcile", key: "positionSyncSuccess" as const, desc: "Identify and map active broker tickets" }
                    ].map((step, idx) => {
                      const complete = !!syncState?.[step.key];
                      const active = !complete && (idx === 0 || !!syncState?.[ [
                        "oauthSuccess", "tokenExchangeSuccess", "accountDiscoverySuccess", "accountMappingSuccess", 
                        "wsAuthenticationSuccess", "realtimeSyncSuccess", "balanceSyncSuccess", "positionSyncSuccess"
                      ][idx - 1] as keyof typeof syncState ]);

                      return (
                        <div 
                          key={step.key} 
                          className={`flex items-start space-x-3 p-3 rounded-lg border transition-all duration-200 ${
                            complete 
                              ? "bg-emerald-500/5 border-emerald-500/10 text-slate-200" 
                              : active 
                                ? "bg-amber-500/5 border-amber-500/20 text-slate-200 shadow-[0_0_10px_rgba(245,158,11,0.05)]"
                                : "bg-gray-950/20 border-gray-900/60 text-slate-500 opacity-60"
                          }`}
                        >
                          {complete ? (
                            <Check size={14} className="text-emerald-400 mt-0.5 shrink-0" />
                          ) : active ? (
                            <RefreshCw size={13} className="text-amber-400 animate-spin mt-1 shrink-0" />
                          ) : (
                            <div className="h-2 w-2 rounded-full bg-gray-800 mt-2 shrink-0" />
                          )}
                          <div className="space-y-0.5 min-w-0">
                            <span className={`text-[12px] font-bold font-sans block ${complete ? "text-emerald-400" : active ? "text-amber-400" : "text-slate-400"}`}>
                              {idx + 1}. {step.label}
                            </span>
                            <p className="text-[10px] text-gray-500 font-sans truncate">{step.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Multiple Accounts Switcher */}
                {cTraderAccounts && cTraderAccounts.length > 0 && (
                  <div className="border-t border-gray-900 pt-5 space-y-3">
                    <span className="text-gray-500 text-[10px] uppercase font-mono block">Connected Trading Accounts</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {cTraderAccounts.map((acc) => {
                        const isSelected = activeAccountId === acc.accountId;
                        return (
                          <button
                            key={acc.accountId}
                            type="button"
                            onClick={() => onSelectAccount?.(acc.accountId)}
                            className={`flex items-center justify-between p-3 rounded-lg border text-left transition-all duration-150 cursor-pointer ${
                              isSelected
                                ? "bg-cyan-500/10 border-cyan-500/40 text-cyan-400"
                                : "bg-gray-950/40 border-gray-800/40 hover:border-gray-700 hover:bg-gray-950/60 text-slate-300"
                            }`}
                          >
                            <div className="space-y-0.5">
                              <div className="text-[12px] font-bold flex items-center space-x-1.5 font-mono">
                                <span>Account {acc.traderLogin || acc.accountId}</span>
                                {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />}
                              </div>
                              <span className="text-[10px] text-gray-500 block font-mono">ID: {acc.accountId}</span>
                            </div>
                            <span
                              className={`text-[9px] font-bold px-2 py-0.5 rounded uppercase font-mono tracking-wider ${
                                acc.isLive
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              }`}
                            >
                              {acc.isLive ? "LIVE" : "DEMO"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-950/40 border border-gray-800/35 p-6 rounded-lg text-center space-y-4">
                <div className="text-gray-500 text-xs font-sans">No active cTrader broker link. SmartBlinks engine requires a direct Open API connection.</div>
                
                {credentials.isConfigured ? (
                  <div className="flex flex-col items-center justify-center space-y-4 max-w-sm mx-auto">
                    <div className="flex items-center space-x-2 w-full">
                      <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider whitespace-nowrap">Auth Env:</span>
                      <select
                        id="select-auth-env"
                        value={authEnv}
                        onChange={(e) => setAuthEnv(e.target.value as "DEMO" | "LIVE")}
                        className="bg-gray-950 border border-gray-800 text-slate-100 text-xs font-semibold rounded p-1.5 focus:outline-none focus:border-amber-500 flex-1 font-mono cursor-pointer"
                      >
                        <option value="DEMO">DEMO PORTFOLIO</option>
                        <option value="LIVE">LIVE PORTFOLIO</option>
                      </select>
                    </div>
                    <button
                      id="btn-oauth-init"
                      onClick={() => onInitiateOAuth(authEnv)}
                      className="w-full bg-gradient-to-r from-amber-500/20 to-amber-600/15 border border-amber-500/30 hover:border-amber-400 text-amber-400 px-6 py-2.5 rounded-lg text-xs font-bold font-sans transition-all duration-200 cursor-pointer shadow-lg flex items-center justify-center space-x-2"
                    >
                      <span>SECURE DIRECT BROADCAST ACCESS</span>
                      <ExternalLink size={14} />
                    </button>
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-500/90 font-sans leading-relaxed bg-amber-500/5 p-4 rounded border border-amber-500/25 max-w-md mx-auto">
                    cTrader Open API developer credentials are required before launching OAuth synchronization. Register them in the form below.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Developers Instructions Panel */}
        <div className="bg-gradient-to-b from-gray-900/50 to-gray-950/70 border border-gray-800/30 p-6 rounded-xl flex flex-col shadow-2xl relative space-y-6">
          {/* WebSocket Diagnostics Panel */}
          <div className="bg-gray-950/60 border border-gray-900/60 rounded-lg p-5 space-y-4">
            <h4 className="text-[11px] font-bold font-mono tracking-wider text-slate-400 uppercase flex items-center space-x-2 border-b border-gray-900 pb-2.5">
              <ShieldAlert size={12} className="text-cyan-400" />
              <span>WebSocket Diagnostics</span>
            </h4>
            <div className="space-y-2.5 font-mono text-[11px]">
              <div className="flex justify-between items-center">
                <span className="text-gray-500">AUTHORIZED</span>
                <span className={diagnostics?.authorized ? "text-emerald-400 font-bold" : "text-red-500 font-bold"}>
                  {diagnostics?.authorized ? "YES" : "NO"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">TOKEN VALID</span>
                <span className={diagnostics?.tokenValid ? "text-emerald-400 font-bold" : diagnostics?.tokenExpired ? "text-red-500 font-bold" : "text-amber-500 font-bold"}>
                  {diagnostics?.tokenValid ? "VALID" : diagnostics?.tokenExpired ? "EXPIRED" : "PENDING"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">ACCOUNT LINKED</span>
                <span className={diagnostics?.accountLinked ? "text-emerald-400 font-bold" : "text-red-500 font-bold"}>
                  {diagnostics?.accountLinked ? "LINKED" : "UNLINKED"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">STREAM ACTIVE</span>
                <span className={diagnostics?.streamActive ? "text-cyan-400 font-bold" : "text-gray-500 font-bold"}>
                  {diagnostics?.streamActive ? "ACTIVE" : "OFFLINE"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">LAST PING</span>
                <span className="text-slate-300">{diagnostics?.lastPing || "Never"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">LAST HEARTBEAT</span>
                <span className="text-slate-300">{diagnostics?.lastHeartbeat || "Never"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-500">RECONNECT COUNT</span>
                <span className={diagnostics?.reconnectCount && diagnostics.reconnectCount > 0 ? "text-amber-500 font-bold" : "text-gray-500 font-bold"}>
                  {diagnostics?.reconnectCount ?? 0} / 5
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-900/40">
            <h2 className="text-xs font-bold font-sans tracking-widest text-slate-400 uppercase flex items-center space-x-2">
              <HelpCircle size={14} className="text-amber-500" />
              <span>Integration Guide</span>
            </h2>

            <div className="space-y-3.5 text-[11px] text-gray-500 font-sans leading-relaxed">
              <div className="space-y-1">
                <span className="font-bold text-slate-300 block">1. Obtain Developer Credentials</span>
                <p>Register an application on the cTrader Open API Playground (https://openapi.ctrader.com) to obtain your unique Client ID and Client Secret.</p>
              </div>

              <div className="space-y-2">
                <span className="font-bold text-slate-300 block">2. Set the Redirect Callback URL</span>
                <p className="mb-2">Ensure that your application settings on cTrader include the exact redirect callback URL:</p>
                <div className="flex items-center space-x-2 bg-gray-950/80 border border-gray-800/60 rounded-lg p-2.5 font-mono text-[11px] text-cyan-400 select-all shadow-inner">
                  <span className="truncate flex-1 select-all" id="text-callback-url-guide">
                    {redirectUri || `${window.location.origin}/callback`}
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCallback}
                    className="shrink-0 text-gray-400 hover:text-cyan-400 p-1 rounded hover:bg-gray-800/40 transition-colors"
                    title="Copy to clipboard"
                  >
                    {copied ? <Check size={14} className="text-cyan-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-slate-300 block">3. Register and Authorize</span>
                <p>Input your Client ID and Secret in the Credentials panel, click Secure Access to prompt authorization, and establish secure streaming sync.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Developer Credentials Setup Card */}
      <section className="bg-gradient-to-b from-gray-900/40 to-gray-950/60 border border-gray-800/30 p-6 rounded-xl shadow-2xl">
        <form onSubmit={handleSaveCredentials} className="space-y-5">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h2 className="text-xs font-bold font-sans tracking-widest text-slate-400 uppercase flex items-center space-x-2">
              <Key size={14} className="text-amber-500" />
              <span>Developer Open API V2 Credentials</span>
            </h2>
            <div className="flex items-center space-x-2 bg-gray-950/80 border border-amber-500/10 rounded-lg p-2 font-mono text-[11px] text-amber-500/90 w-full md:w-auto">
              <span className="text-[9px] text-gray-500 uppercase mr-1 select-none">Redirect URI:</span>
              <span className="truncate flex-1 select-all" id="text-callback-url-form">
                {redirectUri || `${window.location.origin}/callback`}
              </span>
              <button
                type="button"
                onClick={handleCopyCallback}
                className="shrink-0 text-gray-400 hover:text-amber-400 p-1 rounded hover:bg-gray-800/40 transition-colors"
                title="Copy to clipboard"
              >
                {copied ? <Check size={14} className="text-amber-400" /> : <Copy size={14} />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Client ID */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-gray-500 uppercase block">Client ID</label>
              <div className="bg-gray-950/60 p-2.5 rounded-lg border border-gray-800/45 font-mono text-[12px]">
                <input
                  id="conn-input-client-id"
                  type="text"
                  placeholder="Enter cTrader Client ID"
                  value={clientIdInput}
                  onChange={(e) => setClientIdInput(e.target.value)}
                  className="bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-100 font-bold w-full"
                />
              </div>
            </div>

            {/* Client Secret */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-gray-500 uppercase block font-bold">Client Secret</label>
              <div className="bg-gray-950/60 p-2.5 rounded-lg border border-gray-800/45 font-mono text-[12px]">
                <input
                  id="conn-input-client-secret"
                  type="password"
                  placeholder="••••••••••••••••••••"
                  value={clientSecretInput}
                  onChange={(e) => setClientSecretInput(e.target.value)}
                  className="bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-100 font-bold w-full"
                />
              </div>
            </div>

            {/* API Endpoint Mode */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-gray-500 uppercase block font-bold">API Endpoint Mode</label>
              <div className="bg-gray-950/60 p-2.5 rounded-lg border border-gray-800/45 font-mono text-[12px]">
                <select
                  id="select-ws-mode"
                  value={wsMode}
                  onChange={(e) => setWsMode(e.target.value as "live" | "demo")}
                  className="bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-100 font-bold w-full cursor-pointer font-sans"
                >
                  <option value="demo" className="bg-gray-950 text-slate-100 font-sans">Demo (demo.ctraderapi.com)</option>
                  <option value="live" className="bg-gray-950 text-slate-100 font-sans">Live (live.ctraderapi.com)</option>
                </select>
              </div>
            </div>
          </div>

          {errorText && (
            <div className="flex items-start space-x-2 text-xs text-red-500 font-bold bg-red-500/5 p-3 rounded border border-red-500/25">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{errorText}</span>
            </div>
          )}

          <div className="flex justify-between items-center border-t border-gray-800/40 pt-4">
            <span className="text-[10px] text-gray-500 font-sans">
              *Credentials are persisted in memory and never transmitted to non-cTrader endpoints.
            </span>

            <button
              id="btn-save-credentials"
              type="submit"
              disabled={isSaving}
              className="bg-gradient-to-r from-amber-500/20 to-amber-600/10 hover:from-amber-500/30 hover:to-amber-600/15 border border-amber-500/30 hover:border-amber-400 text-amber-400 px-6 py-2.5 rounded-lg text-xs font-bold font-sans transition-all duration-200 cursor-pointer shadow-lg disabled:opacity-50"
            >
              {isSaving ? "REGISTERING..." : "REGISTER CREDENTIALS"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
