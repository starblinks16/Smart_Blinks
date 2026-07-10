import React, { useState } from "react";
import {
  TrendingUp,
  Sliders,
  Play,
  Pause,
  AlertOctagon,
  Sparkles,
  Zap,
  Activity,
  ChevronRight,
  ShieldCheck
} from "lucide-react";
import { Position, TradingAccount } from "../types";

interface AITradingProps {
  isAiTradingActive: boolean;
  onToggleAiTrading: () => void;
  positions: Position[];
  onClosePosition: (id: string) => void;
  account: TradingAccount | null;
  onManualTrade: (side: "BUY" | "SELL", lots: number) => void;
}

export default function AITrading({
  isAiTradingActive,
  onToggleAiTrading,
  positions,
  onClosePosition,
  account,
  onManualTrade
}: AITradingProps) {
  const [manualLots, setManualLots] = useState(0.01);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 h-full bg-[#060709] text-slate-100 font-sans select-none">
      {/* Header */}
      <header className="bg-gradient-to-r from-gray-900/40 to-gray-950/60 border border-gray-800/40 p-4 sm:p-6 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 backdrop-blur-md">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-cyan-400 bg-clip-text text-transparent flex items-center space-x-2.5">
            <TrendingUp className="text-cyan-400" />
            <span>Autonomous Intelligence Controller</span>
          </h1>
          <p className="text-[10px] sm:text-[11px] text-gray-500 font-mono mt-0.5 uppercase tracking-wide">
            Arm or disarm neural decision execution matrix
          </p>
        </div>
      </header>

      {/* Main Grid: Control Station */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Core Arm/Disarm Neural Center */}
        <div className="lg:col-span-2 bg-gradient-to-b from-gray-900/50 to-gray-950/70 border border-gray-800/30 p-6 rounded-xl flex flex-col justify-between shadow-2xl relative overflow-hidden">
          {/* Animated cybernetic grid glow background */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-500/5 rounded-full filter blur-3xl pointer-events-none" />

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-sans tracking-widest text-slate-400 uppercase">
                Neural Executive Core State
              </span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono tracking-widest ${
                isAiTradingActive ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-amber-500/10 text-amber-500 border border-amber-500/20"
              }`}>
                {isAiTradingActive ? "FULLY ARMED" : "MANUAL BYPASS"}
              </span>
            </div>

            <div className="py-6 flex flex-col items-center justify-center space-y-5 text-center">
              <button
                id="btn-toggle-ai-core"
                onClick={onToggleAiTrading}
                className={`w-28 h-28 rounded-full border flex flex-col items-center justify-center transition-all duration-500 cursor-pointer ${
                  isAiTradingActive
                    ? "bg-gradient-to-tr from-cyan-500/10 to-blue-500/15 border-cyan-500 shadow-[0_0_40px_rgba(0,229,255,0.25)] scale-105"
                    : "bg-gradient-to-tr from-gray-900 to-gray-950 border-gray-700 shadow-inner"
                }`}
              >
                {isAiTradingActive ? (
                  <Pause size={38} className="text-cyan-400 animate-pulse" />
                ) : (
                  <Play size={38} className="text-gray-400 translate-x-1" />
                )}
                <span className="text-[9px] font-mono tracking-widest mt-2 uppercase font-extrabold text-slate-300">
                  {isAiTradingActive ? "ARMED" : "OFFLINE"}
                </span>
              </button>

              <p className="text-xs text-gray-400 max-w-md font-sans leading-relaxed">
                {isAiTradingActive
                  ? "Neural network is active. Subscribing to cTrader Gold ticks, evaluating Smart Money Structure, and automatically submitting orders."
                  : "Decision core in standby mode. No autonomous entries or risk trailing will be initiated."}
              </p>
            </div>
          </div>

          <div className="border-t border-gray-800/40 pt-4 flex items-center justify-between text-[11px] font-mono text-gray-500">
            <div className="flex items-center space-x-1.5">
              <ShieldCheck size={14} className="text-emerald-500" />
              <span>SMC Neural Model fully synchronized</span>
            </div>
            <span>v2.4.0-Stable</span>
          </div>
        </div>

        {/* Manual Command Overrides (Broker Direct) */}
        <div className="bg-gradient-to-b from-gray-900/50 to-gray-950/70 border border-gray-800/30 p-6 rounded-xl flex flex-col justify-between shadow-2xl relative">
          <div className="space-y-4">
            <h2 className="text-xs font-bold font-sans tracking-widest text-slate-400 uppercase flex items-center space-x-2">
              <Sliders size={14} className="text-amber-500" />
              <span>Manual Execution Override</span>
            </h2>
            <p className="text-[11px] text-gray-500 font-sans leading-relaxed">
              Force direct spot Gold order placement to test connection and real-time execution response.
            </p>

            <div className="space-y-3 pt-3">
              <label className="text-[11px] font-mono text-gray-400 block uppercase">Order Size (Lots)</label>
              <div className="flex items-center space-x-2 bg-gray-950/60 p-2.5 rounded-lg border border-gray-800/40 font-mono">
                <input
                  id="input-manual-lots"
                  type="number"
                  min="0.01"
                  max="1.0"
                  step="0.01"
                  value={manualLots}
                  onChange={(e) => setManualLots(Math.max(0.01, Number(e.target.value)))}
                  className="bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-100 font-bold w-full"
                />
                <span className="text-[10px] text-gray-500 font-bold">XAUUSD</span>
              </div>
            </div>
          </div>

          <div className="space-y-3.5 mt-6">
            <div className="grid grid-cols-2 gap-3">
              <button
                id="btn-manual-buy"
                onClick={() => onManualTrade("BUY", manualLots)}
                className="bg-gradient-to-r from-cyan-500/20 to-cyan-600/10 hover:from-cyan-500/30 hover:to-cyan-600/15 border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 py-3 rounded-lg text-xs font-bold font-sans transition-all duration-200 cursor-pointer shadow-lg"
              >
                BUY (LONG)
              </button>
              <button
                id="btn-manual-sell"
                onClick={() => onManualTrade("SELL", manualLots)}
                className="bg-gradient-to-r from-red-500/20 to-red-600/10 hover:from-red-500/30 hover:to-red-600/15 border border-red-500/30 hover:border-red-400 text-red-400 py-3 rounded-lg text-xs font-bold font-sans transition-all duration-200 cursor-pointer shadow-lg"
              >
                SELL (SHORT)
              </button>
            </div>
            
            <div className="text-[10px] text-gray-500 font-mono text-center bg-gray-950/45 p-2 rounded">
              Note: Executed orders apply risk safeguards automatically.
            </div>
          </div>
        </div>
      </section>

      {/* Position Matrix Summary */}
      <section className="bg-gradient-to-b from-gray-900/40 to-gray-950/60 border border-gray-800/30 rounded-xl overflow-hidden mt-6">
        <div className="px-5 py-4 border-b border-gray-800/40">
          <h2 className="text-xs font-bold font-sans tracking-widest text-slate-400 uppercase">
            Active Neural Execution Table
          </h2>
        </div>

        {positions.length === 0 ? (
          <div className="p-8 text-center text-gray-500 font-sans text-xs">
            No active positions inside cTrader pools.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-800/35 bg-gray-950/30 text-[10px] uppercase font-sans text-gray-500">
                  <th className="py-3 px-5">ID</th>
                  <th className="py-3 px-5">Symbol</th>
                  <th className="py-3 px-5">Trade Side</th>
                  <th className="py-3 px-5">Volume</th>
                  <th className="py-3 px-5">Entry</th>
                  <th className="py-3 px-5">PnL</th>
                  <th className="py-3 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/20 font-mono text-[12px] text-slate-200">
                {positions.map((pos) => (
                  <tr key={pos.id} className="hover:bg-gray-900/10">
                    <td className="py-3 px-5 text-gray-500">{pos.id}</td>
                    <td className="py-3 px-5 font-semibold">{pos.symbol}</td>
                    <td className="py-3 px-5">
                      <span className={`px-2 py-0.5 rounded font-black text-[9px] ${
                        pos.tradeSide === "BUY" ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" : "bg-red-500/10 text-red-500 border border-red-500/20"
                      }`}>
                        {pos.tradeSide}
                      </span>
                    </td>
                    <td className="py-3 px-5">{(pos.volume / 100000).toFixed(2)} Lots</td>
                    <td className="py-3 px-5">${pos.entryPrice.toFixed(2)}</td>
                    <td className={`py-3 px-5 font-bold ${pos.pnl >= 0 ? "text-cyan-400" : "text-red-500"}`}>
                      {pos.pnl >= 0 ? "+" : ""}${pos.pnl.toFixed(2)}
                    </td>
                    <td className="py-3 px-5 text-right">
                      <button
                        onClick={() => onClosePosition(pos.id)}
                        className="bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 px-2.5 py-1 rounded text-[11px] font-sans font-bold"
                      >
                        CLOSE FULL
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
