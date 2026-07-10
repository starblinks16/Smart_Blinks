import React from "react";
import {
  Wallet,
  Activity,
  Percent,
  Coins,
  Shield,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  HeartPulse,
  Flame,
  CheckCircle,
  Eye,
  LineChart
} from "lucide-react";
import TradingViewChart from "./TradingViewChart";
import { TradingAccount, Position, Candle, ExecutionLog, MarketBrainState } from "../types";

interface OverviewProps {
  account: TradingAccount | null;
  positions: Position[];
  candles: Candle[];
  price: { bid: number; ask: number; spread: number };
  marketBrain: MarketBrainState;
  executionFeed: ExecutionLog[];
  onClosePosition: (id: string) => void;
  isAiTradingActive: boolean;
}

export default function Overview({
  account,
  positions,
  candles,
  price,
  marketBrain,
  executionFeed,
  onClosePosition,
  isAiTradingActive
}: OverviewProps) {
  const totalFloatingPnl = positions.reduce((acc, pos) => acc + (pos.pnl || 0), 0);
  const pnlColorClass = totalFloatingPnl >= 0 ? "text-cyan-400" : "text-rose-500";
  const pnlBgClass = totalFloatingPnl >= 0 ? "bg-cyan-500/5 border-cyan-500/10" : "bg-rose-500/5 border-rose-500/10";

  // Account Health Assessment
  const healthScore = account?.accountHealthScore ?? 100;
  let healthLabel = "OPTIMAL";
  let healthColor = "text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
  if (healthScore < 70) {
    healthLabel = "CRITICAL LIMIT";
    healthColor = "text-red-400 bg-red-500/10 border-red-500/25 animate-pulse";
  } else if (healthScore < 90) {
    healthLabel = "STABLE ADJUSTMENT";
    healthColor = "text-amber-400 bg-amber-500/10 border-amber-500/20";
  }

  // Cooldown Protection Mode
  const lossCount = account?.consecutiveLosses ?? 0;
  const isCooldownActive = lossCount >= 3;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 h-full bg-[#060709] text-slate-100 font-sans select-none">
      {/* Top Banner Header */}
      <header className="relative flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-r from-[#0d0e12] via-[#12141c] to-[#0a0b0d] border border-slate-800/60 px-5 py-5 rounded-xl backdrop-blur-md gap-4 shadow-lg overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-10 w-32 h-16 bg-amber-500/5 rounded-full blur-2xl pointer-events-none"></div>

        <div className="space-y-1">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <h1 className="text-lg sm:text-xl font-extrabold tracking-tight bg-gradient-to-r from-[#fcd34d] via-slate-100 to-cyan-400 bg-clip-text text-transparent">
              Autonomous Command Deck
            </h1>
            {account ? (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[9px] font-bold font-mono rounded-md uppercase w-fit tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span>LIVE cTrader Sync Active</span>
              </span>
            ) : (
              <span className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[9px] font-bold font-mono rounded-md uppercase w-fit tracking-wider">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                <span>Awaiting Broker Authentication</span>
              </span>
            )}
          </div>
          <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono uppercase tracking-widest">
            XAUUSD Gold Portfolio Specialization • Active Node Telemetry
          </p>
        </div>

        {/* Live quote strip - responsive flow */}
        <div className="grid grid-cols-3 sm:flex sm:items-center gap-3 sm:gap-6 w-full md:w-auto border-t md:border-t-0 border-slate-800/40 pt-3 md:pt-0">
          <div className="flex flex-col items-center sm:items-end">
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono">XAUUSD BID</span>
            <span className="text-sm sm:text-base font-mono font-bold text-cyan-400">${(price?.bid ?? 0).toFixed(2)}</span>
          </div>
          <div className="hidden sm:block h-6 w-[1px] bg-slate-800" />
          <div className="flex flex-col items-center sm:items-end">
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono">XAUUSD ASK</span>
            <span className="text-sm sm:text-base font-mono font-bold text-rose-500">${(price?.ask ?? 0).toFixed(2)}</span>
          </div>
          <div className="hidden sm:block h-6 w-[1px] bg-slate-800" />
          <div className="flex flex-col items-center sm:items-end">
            <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono">SPREAD</span>
            <span className="text-[10px] sm:text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 font-bold">
              ${(price?.spread ?? 0).toFixed(2)}
            </span>
          </div>
        </div>
      </header>

      {/* Protective Loss Cooldown Alert Banner */}
      {isCooldownActive && (
        <div className="relative bg-gradient-to-r from-rose-500/10 via-[#1e1014] to-[#0a0b0d] border border-rose-500/20 px-5 py-4 rounded-xl flex items-center gap-3.5 shadow-md">
          <div className="absolute top-0 right-10 w-24 h-full bg-rose-500/5 blur-xl pointer-events-none"></div>
          <Flame className="text-rose-500 animate-bounce shrink-0" size={20} />
          <div className="space-y-0.5">
            <h4 className="text-xs font-bold text-rose-400 font-mono uppercase tracking-wide">
              CONSECUTIVE LOSS PROTECTION TRIGGERED (COOLDOWN ACTIVE)
            </h4>
            <p className="text-[11px] text-slate-300">
              The neural system has flagged {lossCount} consecutive losses on this account. Capital protection is active; all automated new entries are temporarily blocked to preserve account equity.
            </p>
          </div>
        </div>
      )}

      {/* Main Financial Metrics Bar - responsive column count */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Balance Card */}
        <div className="bg-gradient-to-b from-[#0f111a] to-[#07080c] border border-slate-800/80 p-4 rounded-xl space-y-1.5 shadow-lg group hover:border-amber-500/15 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold tracking-wider font-mono uppercase">Balance</span>
            <Wallet size={14} className="text-amber-500" />
          </div>
          <div className="font-mono text-xl font-extrabold text-slate-100">
            ${account?.balance ? account.balance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
          </div>
          <div className="text-[9px] text-slate-400 font-mono uppercase">Currency: {account?.currency || "USD"}</div>
        </div>

        {/* Equity Card */}
        <div className="bg-gradient-to-b from-[#0f111a] to-[#07080c] border border-slate-800/80 p-4 rounded-xl space-y-1.5 shadow-lg group hover:border-amber-500/15 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold tracking-wider font-mono uppercase">Equity</span>
            <Coins size={14} className="text-cyan-400" />
          </div>
          <div className="font-mono text-xl font-extrabold text-slate-100">
            ${account?.equity ? account.equity.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
          </div>
          <div className="text-[9px] text-slate-400 font-mono uppercase">Leverage: 1:{account?.leverage || "500"}</div>
        </div>

        {/* Floating PnL Card */}
        <div className={`border p-4 rounded-xl space-y-1.5 transition-all shadow-lg ${pnlBgClass}`}>
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold tracking-wider font-mono uppercase">Floating PnL</span>
            <Activity size={14} className={pnlColorClass} />
          </div>
          <div className={`font-mono text-xl font-extrabold ${pnlColorClass}`}>
            {totalFloatingPnl >= 0 ? "+" : ""}${totalFloatingPnl.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[9px] text-slate-400 font-mono uppercase">
            {positions.length} Active Position(s)
          </div>
        </div>

        {/* Margin State */}
        <div className="bg-gradient-to-b from-[#0f111a] to-[#07080c] border border-slate-800/80 p-4 rounded-xl space-y-1.5 shadow-lg group hover:border-amber-500/15 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold tracking-wider font-mono uppercase">Margin State</span>
            <Percent size={14} className="text-amber-500" />
          </div>
          <div className="font-mono text-xl font-extrabold text-slate-100">
            ${account?.margin ? account.margin.toFixed(2) : "0.00"}
          </div>
          <div className="text-[9px] text-slate-400 font-mono uppercase truncate">
            Free: ${account?.freeMargin ? account.freeMargin.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
          </div>
        </div>

        {/* Upgraded Account Health Score Card */}
        <div className="bg-gradient-to-b from-[#0f111a] to-[#07080c] border border-slate-800/80 p-4 rounded-xl space-y-1.5 shadow-lg group hover:border-amber-500/15 transition-all">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] font-bold tracking-wider font-mono uppercase">Health score</span>
            <HeartPulse size={14} className="text-emerald-400 animate-pulse" />
          </div>
          <div className="flex items-baseline space-x-1.5">
            <span className="font-mono text-xl font-extrabold text-slate-100">
              {healthScore}%
            </span>
            <span className={`text-[8px] font-mono font-bold border px-1.5 py-0.5 rounded ${healthColor}`}>
              {healthLabel}
            </span>
          </div>
          <div className="text-[9px] text-slate-400 font-mono uppercase truncate">
            Risk safeguards check ok
          </div>
        </div>
      </section>

      {/* Main Dashboard Workspace: Chart + Feed */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* TV Lightweight Interactive Chart */}
        <div className="lg:col-span-2 h-[300px] sm:h-[400px] lg:h-[480px] bg-slate-900/20 border border-slate-800/60 rounded-xl overflow-hidden shadow-2xl relative">
          <TradingViewChart candles={candles} positions={positions} />
        </div>

        {/* Sidebar panels: Market Mood summary + Recent Executions */}
        <div className="space-y-6 flex flex-col justify-between">
          {/* Market Brain Status Capsule */}
          <div className="bg-gradient-to-b from-[#0f111a] to-[#07080c] border border-slate-800/80 p-5 rounded-xl space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold font-sans tracking-widest text-slate-400 uppercase">AI Strategic Mind</span>
              <Sparkles size={14} className="text-amber-400 animate-pulse" />
            </div>

            <div className="flex items-center space-x-3">
              <div className="bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg text-center flex-1">
                <span className="text-[9px] text-amber-500 font-mono block">MOOD</span>
                <span className="text-xs font-extrabold text-amber-400 font-mono">{marketBrain.marketMood}</span>
              </div>

              <div className="bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-lg text-center flex-1">
                <span className="text-[9px] text-cyan-500 font-mono block">BIAS CONFIDENCE</span>
                <span className="text-xs font-extrabold text-cyan-400 font-mono">{marketBrain.confidenceLevel}%</span>
              </div>
            </div>

            <p className="text-[12px] text-slate-300 leading-relaxed font-sans italic bg-slate-950/60 p-3.5 rounded border border-slate-900 shadow-inner">
              "{marketBrain.comments[0] || "Synchronizing telemetry matrices..."}"
            </p>

            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 border-t border-slate-800/40 pt-3">
              <span>Strategy: {marketBrain.activeStrategy}</span>
              <span>State: {marketBrain.executionReadiness}</span>
            </div>
          </div>

          {/* Mini Execution Log Panel */}
          <div className="bg-gradient-to-b from-[#0f111a] to-[#07080c] border border-slate-800/80 p-5 rounded-xl space-y-3 shadow-xl flex-1 flex flex-col justify-between mt-6 lg:mt-0">
            <span className="text-[11px] font-bold font-sans tracking-widest text-slate-400 uppercase">Neural Stream</span>
            
            <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
              {executionFeed.slice(0, 3).map((log) => (
                <div key={log.id} className="text-[12px] space-y-0.5 border-b border-slate-800/40 pb-2.5 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center">
                    <span className={`font-mono text-[10px] font-extrabold ${
                      log.type.startsWith("TRADE") || log.type === "PARTIAL_CLOSE" ? "text-cyan-400" : log.type === "WARNING" ? "text-rose-500" : "text-amber-400"
                    }`}>
                      [{log.type}]
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="font-sans font-semibold text-slate-200">{log.title}</div>
                  <div className="text-[11px] text-slate-400 leading-normal">{log.message}</div>
                </div>
              ))}
              {executionFeed.length === 0 && (
                <div className="text-slate-500 italic text-center py-6 font-sans">
                  Awaiting system events...
                </div>
              )}
            </div>

            <div className="text-[10px] font-mono text-slate-500 text-right pt-2 border-t border-slate-800/40">
              Refreshes automatically • Real-time Active
            </div>
          </div>
        </div>
      </section>

      {/* Active Positions Table Console */}
      <section className="bg-gradient-to-b from-[#0f111a] to-[#07080c] border border-slate-800/80 rounded-xl overflow-hidden shadow-xl">
        <div className="px-5 py-4 border-b border-slate-800/40 flex justify-between items-center bg-slate-950/20">
          <h2 className="text-xs font-bold font-sans tracking-widest text-slate-400 uppercase flex items-center gap-2">
            <LineChart size={14} className="text-cyan-400" />
            <span>Active Position Matrix</span>
          </h2>
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/25 px-2.5 py-0.5 rounded-full uppercase">
            {positions.length} active executions
          </span>
        </div>

        {positions.length === 0 ? (
          <div className="p-10 text-center space-y-2">
            <div className="text-slate-500 font-sans text-sm">No active positions in cTrader pool.</div>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto font-sans leading-relaxed">
              When autonomous analysis flags a structural opportunity or you execute a manual trade command, positions will manifest here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800/40 bg-slate-950/30 text-[10px] tracking-wider uppercase font-mono text-slate-400">
                  <th className="py-3 px-5">ID</th>
                  <th className="py-3 px-5">Symbol</th>
                  <th className="py-3 px-5">Type</th>
                  <th className="py-3 px-5">Volume</th>
                  <th className="py-3 px-5">Entry Price</th>
                  <th className="py-3 px-5">Current Price</th>
                  <th className="py-3 px-5">Stop Loss</th>
                  <th className="py-3 px-5">Take Profit</th>
                  <th className="py-3 px-5">PnL (USD)</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40 font-mono text-[12px] text-slate-200">
                {positions.map((pos) => {
                  const isBuy = pos.tradeSide === "BUY";
                  return (
                    <tr key={pos.id} className="hover:bg-slate-900/15">
                      <td className="py-3 px-5 text-slate-500 font-bold">{pos.id}</td>
                      <td className="py-3 px-5 font-semibold text-slate-300">{pos.symbol}</td>
                      <td className="py-3 px-5">
                        <span className={`px-2 py-0.5 rounded font-black text-[10px] ${
                          isBuy ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-rose-500/10 text-rose-500 border border-rose-500/20"
                        }`}>
                          {pos.tradeSide}
                        </span>
                      </td>
                      <td className="py-3 px-5 text-slate-300">
                        {typeof pos.volume === "number" && !isNaN(pos.volume) 
                          ? `${pos.volume >= 1000 ? (pos.volume / 100000).toFixed(2) : pos.volume.toFixed(2)} Lots`
                          : "0.01 Lots"}
                      </td>
                      <td className="py-3 px-5">${(pos?.entryPrice ?? 0).toFixed(2)}</td>
                      <td className="py-3 px-5 text-slate-400">${(pos?.currentPrice ?? 0).toFixed(2)}</td>
                      <td className="py-3 px-5 text-rose-400/80">${pos.sl ? pos.sl.toFixed(2) : "None"}</td>
                      <td className="py-3 px-5 text-cyan-400/80">${pos.tp ? pos.tp.toFixed(2) : "None"}</td>
                      <td className={`py-3 px-5 font-bold ${pos.pnl >= 0 ? "text-cyan-400" : "text-rose-500"}`}>
                        {pos.pnl >= 0 ? "+" : ""}${(pos?.pnl ?? 0).toFixed(2)}
                      </td>
                      <td className="py-3 px-5 text-right">
                        <button
                          id={`btn-close-position-${pos.id}`}
                          onClick={() => onClosePosition(pos.id)}
                          className="bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 hover:text-rose-300 px-2.5 py-1 rounded text-[11px] font-sans font-bold transition-all duration-200"
                        >
                          CLOSE
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
