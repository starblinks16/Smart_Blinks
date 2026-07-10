import React from "react";
import {
  Brain,
  Zap,
  Activity,
  Flame,
  Clock,
  Compass,
  AlertTriangle,
  Server,
  Fingerprint,
  Shield,
  HeartPulse,
  Eye,
  TrendingUp,
  LineChart,
  HelpCircle,
  HelpCircle as InfoIcon
} from "lucide-react";
import { MarketBrainState, Candle } from "../types";

interface MarketBrainProps {
  marketBrain: MarketBrainState;
  candles: Candle[];
}

export default function MarketBrain({ marketBrain, candles }: MarketBrainProps) {
  const lastClose = candles.length > 0 ? candles[candles.length - 1].close : 0;
  
  // SMC structural markers
  const smcMarkers = [
    { name: "Daily Liquidity Sweep", state: "COMPLETED", type: "BULLISH", price: lastClose ? lastClose - 4.50 : 2322.40 },
    { name: "M15 Market Structure Shift (CHOCH)", state: "ACTIVE", type: "BULLISH", price: lastClose ? lastClose - 1.20 : 2331.10 },
    { name: "H1 Fair Value Gap (FVG)", state: "UNFILLED", type: "BEARISH_OB", price: lastClose ? lastClose + 3.80 : 2344.80 },
    { name: "M5 Break of Structure (BOS)", state: "COMPLETED", type: "BULLISH", price: lastClose ? lastClose - 2.10 : 2334.50 }
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 h-full bg-[#060709] text-slate-100 font-sans select-none">
      {/* Header */}
      <header className="relative bg-gradient-to-r from-[#0d0e12] via-[#12141c] to-[#0a0b0d] border border-amber-500/15 p-5 sm:p-6 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 overflow-hidden shadow-[0_0_20px_rgba(212,175,55,0.05)]">
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 left-1/4 w-40 h-10 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="space-y-1">
          <h1 className="text-lg sm:text-xl font-bold tracking-tight bg-gradient-to-r from-[#fcd34d] via-[#fef08a] to-slate-100 bg-clip-text text-transparent flex items-center space-x-2.5">
            <Brain className="text-amber-500 animate-pulse" size={24} />
            <span>XAUUSD Market Brain Core</span>
          </h1>
          <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono uppercase tracking-widest flex items-center gap-1.5">
            <Fingerprint size={12} className="text-amber-500/70" />
            <span>INSTITUTIONAL QUANTUM NEURAL DECISION ENGINE</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 rounded backdrop-blur-sm">
            ENGINE: GEMINI-2.5-FLASH
          </span>
          <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded backdrop-blur-sm">
            MODE: AUTONOMOUS
          </span>
        </div>
      </header>

      {/* Primary Neural Analytics Grid */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {/* Core Mood Card */}
        <div className="relative overflow-hidden bg-gradient-to-b from-[#0f111a] to-[#07080c] border border-slate-800/80 p-5 rounded-xl space-y-4 shadow-lg group hover:border-amber-500/20 transition-all">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase font-mono">
              Market Mood Synthesis
            </h2>
            <Activity size={14} className="text-slate-500" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Mood Bias</span>
              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                marketBrain.marketMood === "BULLISH" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                marketBrain.marketMood === "BEARISH" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}>
                {marketBrain.marketMood}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Market Personality</span>
              <span className="text-xs font-mono font-bold text-cyan-400 capitalize bg-cyan-500/5 px-2 py-0.5 rounded border border-cyan-500/10">
                {marketBrain.marketPersonality || "Trending"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Active Strategy</span>
              <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/5 px-2 py-0.5 rounded border border-amber-500/10">
                {marketBrain.activeStrategy}
              </span>
            </div>
          </div>
        </div>

        {/* Risk Metrics Card */}
        <div className="relative overflow-hidden bg-gradient-to-b from-[#0f111a] to-[#07080c] border border-slate-800/80 p-5 rounded-xl space-y-4 shadow-lg group hover:border-amber-500/20 transition-all">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase font-mono">
              Execution safeguards
            </h2>
            <Shield size={14} className="text-slate-500" />
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Readiness State</span>
              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                marketBrain.executionReadiness === "READY" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" :
                marketBrain.executionReadiness === "COOLDOWN_ACTIVE" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse" :
                "bg-amber-500/10 text-amber-400 border border-amber-500/20"
              }`}>
                {marketBrain.executionReadiness}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Volatility Risk</span>
              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                marketBrain.volatilityState === "DANGEROUS" ? "bg-rose-500/10 text-rose-400 border border-rose-500/25 animate-pulse" :
                marketBrain.volatilityState === "HIGH" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" :
                "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10"
              }`}>
                {marketBrain.volatilityState}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">Liquidity Trap</span>
              <span className={`px-2 py-0.5 rounded text-xs font-mono font-bold ${
                marketBrain.liquidityDanger ? "bg-red-500/10 text-red-400 border border-red-500/20 animate-pulse" : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/10"
              }`}>
                {marketBrain.liquidityDanger ? "SWEEP RISK DETECTED" : "SAFE / NORMAL"}
              </span>
            </div>
          </div>
        </div>

        {/* Confidence Circle */}
        <div className="relative overflow-hidden bg-gradient-to-b from-[#0f111a] to-[#07080c] border border-slate-800/80 p-5 rounded-xl flex flex-col justify-between shadow-lg group hover:border-amber-500/20 transition-all">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase font-mono">
              AI Directional Confidence
            </h2>
            <Eye size={14} className="text-slate-500" />
          </div>
          <div className="flex flex-col items-center justify-center py-2 space-y-1">
            <div className="relative flex items-center justify-center">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  className="stroke-slate-800"
                  strokeWidth="5"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  className="stroke-amber-500"
                  strokeWidth="5"
                  fill="transparent"
                  strokeDasharray="213.6"
                  strokeDashoffset={213.6 - (213.6 * (marketBrain.confidenceLevel ?? 0)) / 100}
                />
              </svg>
              <span className="absolute text-base font-mono font-extrabold text-slate-100">
                {marketBrain.confidenceLevel ?? 0}%
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Conviction Bias</span>
          </div>
        </div>

        {/* Trend Strength Circle */}
        <div className="relative overflow-hidden bg-gradient-to-b from-[#0f111a] to-[#07080c] border border-slate-800/80 p-5 rounded-xl flex flex-col justify-between shadow-lg group hover:border-amber-500/20 transition-all">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase font-mono">
              Trend Strength Metric
            </h2>
            <TrendingUp size={14} className="text-slate-500" />
          </div>
          <div className="flex flex-col items-center justify-center py-2 space-y-1">
            <div className="relative flex items-center justify-center">
              <svg className="w-20 h-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  className="stroke-slate-800"
                  strokeWidth="5"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  className="stroke-cyan-400"
                  strokeWidth="5"
                  fill="transparent"
                  strokeDasharray="213.6"
                  strokeDashoffset={213.6 - (213.6 * (marketBrain.trendStrength ?? 0)) / 100}
                />
              </svg>
              <span className="absolute text-base font-mono font-extrabold text-slate-100">
                {marketBrain.trendStrength ?? 0}%
              </span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Flow Vector</span>
          </div>
        </div>
      </section>

      {/* SMC Matrix & Reasoning Columns */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Smart Money Concepts Structural Log */}
        <div className="lg:col-span-5 bg-gradient-to-b from-[#0f111a] to-[#07080c] border border-slate-800/80 rounded-xl p-5 space-y-4 shadow-lg">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold font-sans tracking-widest text-slate-400 uppercase flex items-center gap-2">
              <LineChart size={14} className="text-amber-500" />
              <span>Smart Money Concepts Matrix</span>
            </h2>
            <span className="text-[9px] font-mono text-[#D4AF37] border border-[#D4AF37]/30 px-1.5 py-0.5 rounded bg-[#D4AF37]/5">
              SMC SECURE
            </span>
          </div>

          <div className="space-y-3">
            {smcMarkers.map((marker, i) => (
              <div key={i} className="flex items-center justify-between border-b border-slate-800/40 pb-2.5 last:border-0 last:pb-0">
                <div className="space-y-1">
                  <div className="text-slate-200 text-[12px] font-semibold flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500/70"></span>
                    <span>{marker.name}</span>
                  </div>
                  <div className="text-[10px] font-mono text-slate-400 pl-3">Trigger price: ${marker.price.toFixed(2)}</div>
                </div>

                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-0.5 rounded font-bold text-[8px] font-mono border ${
                    marker.type === "BULLISH" ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                  }`}>
                    {marker.type}
                  </span>
                  <span className="text-[10px] font-mono font-extrabold text-slate-400">
                    {marker.state}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AI Structural Reasoning Details */}
        <div className="lg:col-span-7 bg-gradient-to-b from-[#0f111a] to-[#07080c] border border-slate-800/80 rounded-xl p-5 space-y-4 shadow-lg flex flex-col justify-between">
          <div className="space-y-3">
            <h2 className="text-xs font-bold font-sans tracking-widest text-slate-400 uppercase flex items-center gap-2">
              <Compass size={14} className="text-cyan-400" />
              <span>AI Core Structural Reasoning</span>
            </h2>
            
            <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-lg space-y-2.5">
              <div className="text-[11px] font-mono text-cyan-400/90 uppercase tracking-wider flex items-center gap-1.5">
                <Brain size={12} />
                <span>Deep Neural Reasoning Output</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed font-sans">
                {marketBrain.aiReasoning || "The Quant Core is monitoring XAUUSD institutional order blocks, tracking stop sweeps above local candle highs, and waiting for optimal risk-to-reward ratio setups."}
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/40 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div className="flex items-center gap-2">
              <Clock size={14} className="text-amber-500/70" />
              <span className="text-[11px] font-mono text-slate-400">Active Trading Session:</span>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20 font-bold">
                {marketBrain.sessionState}
              </span>
            </div>
            
            <div className="text-[10px] text-slate-500 italic flex items-center gap-1">
              <AlertTriangle size={11} className="text-amber-500/70" />
              <span>Institutional filters require high-confidence confluence for all entry orders.</span>
            </div>
          </div>
        </div>
      </section>

      {/* Live Cinematic Neural Feed */}
      <section className="bg-gradient-to-b from-[#0f111a] to-[#07080c] border border-slate-800/80 rounded-xl p-5 space-y-4 shadow-lg">
        <div className="flex justify-between items-center">
          <h2 className="text-xs font-bold font-mono tracking-widest text-slate-400 uppercase flex items-center gap-2">
            <Server size={14} className="text-amber-500" />
            <span>Neural Market Brain Feed</span>
          </h2>
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
          </span>
        </div>

        <div className="bg-slate-950/80 border border-slate-900 p-4 rounded-xl space-y-3 font-mono text-[12px] text-slate-300 shadow-inner">
          {(marketBrain.comments || []).map((comment, idx) => (
            <div key={idx} className="flex items-start space-x-2.5 pb-2 border-b border-slate-900 last:border-0 last:pb-0 leading-relaxed">
              <span className="text-[#D4AF37] font-extrabold shrink-0 select-none">&gt;&gt;</span>
              <span className="text-slate-200">{comment}</span>
            </div>
          ))}
          {(!marketBrain.comments || marketBrain.comments.length === 0) && (
            <div className="text-slate-500 italic text-center py-2">
              Awaiting neural processing cycle...
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
