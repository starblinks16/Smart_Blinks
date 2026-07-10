import React, { useState } from "react";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  Percent,
  Sliders,
  DollarSign,
  AlertOctagon,
  TrendingUp,
  SlidersHorizontal
} from "lucide-react";
import { RiskSettings } from "../types";

interface RiskEngineProps {
  riskSettings: RiskSettings;
  onSaveSettings: (settings: {
    maxRisk: number;
    defaultLotSize: number;
    maxDrawdown: number;
    trailingEnabled: boolean;
  }) => void;
}

export default function RiskEngine({ riskSettings, onSaveSettings }: RiskEngineProps) {
  const [maxRisk, setMaxRisk] = useState(riskSettings.maxRiskPerTrade);
  const [lotSize, setLotSize] = useState(riskSettings.defaultLotSize);
  const [maxDrawdown, setMaxDrawdown] = useState(riskSettings.maxDrawdownLimit);
  const [trailingEnabled, setTrailingEnabled] = useState(riskSettings.trailingStopEnabled);

  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings({
      maxRisk,
      defaultLotSize: lotSize,
      maxDrawdown,
      trailingEnabled
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 h-full bg-[#060709] text-slate-100 font-sans select-none">
      {/* Header */}
      <header className="bg-gradient-to-r from-gray-900/40 to-gray-950/60 border border-gray-800/40 p-4 sm:p-6 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 backdrop-blur-md">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent flex items-center space-x-2.5">
            <ShieldAlert className="text-amber-500" />
            <span>Autonomous Risk Shield</span>
          </h1>
          <p className="text-[10px] sm:text-[11px] text-gray-500 font-mono mt-0.5 uppercase tracking-wide">
            Interactive Risk Limits & Automatic Capital Protection Systems
          </p>
        </div>
      </header>

      {/* Main Grid: Settings form + explanation cards */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sizing & Protection Form */}
        <div className="lg:col-span-2 bg-gradient-to-b from-gray-900/50 to-gray-950/70 border border-gray-800/30 p-6 rounded-xl shadow-2xl relative">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h2 className="text-xs font-bold font-sans tracking-widest text-slate-400 uppercase flex items-center space-x-2">
              <SlidersHorizontal size={14} className="text-amber-500" />
              <span>Sizing & Protection Matrix</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Max Risk Per Trade */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono text-gray-400 uppercase flex items-center justify-between">
                  <span>Max Risk Per Trade (%)</span>
                  <Percent size={12} className="text-amber-500" />
                </label>
                <div className="bg-gray-950/60 p-2.5 rounded-lg border border-gray-800/45 font-mono">
                  <input
                    id="risk-input-max-risk"
                    type="number"
                    min="0.1"
                    max="5.0"
                    step="0.1"
                    value={maxRisk}
                    onChange={(e) => setMaxRisk(Number(e.target.value))}
                    className="bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-100 font-bold w-full"
                  />
                </div>
                <span className="text-[10px] text-gray-500 font-sans block leading-relaxed">
                  Percentage of account equity allocated for stop loss on each trade.
                </span>
              </div>

              {/* Default Lot Sizing */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono text-gray-400 uppercase flex items-center justify-between">
                  <span>Base Execution Lots</span>
                  <DollarSign size={12} className="text-cyan-400" />
                </label>
                <div className="bg-gray-950/60 p-2.5 rounded-lg border border-gray-800/45 font-mono">
                  <input
                    id="risk-input-lots"
                    type="number"
                    min="0.01"
                    max="2.0"
                    step="0.01"
                    value={lotSize}
                    onChange={(e) => setLotSize(Number(e.target.value))}
                    className="bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-100 font-bold w-full"
                  />
                </div>
                <span className="text-[10px] text-gray-500 font-sans block leading-relaxed">
                  Default lot size for standard entries. Sizing automatically downscales on micro accounts (&lt;$100).
                </span>
              </div>

              {/* Max Floating Drawdown Safeguard */}
              <div className="space-y-2">
                <label className="text-[11px] font-mono text-gray-400 uppercase flex items-center justify-between">
                  <span>Floating Drawdown Cap (%)</span>
                  <AlertOctagon size={12} className="text-red-500" />
                </label>
                <div className="bg-gray-950/60 p-2.5 rounded-lg border border-gray-800/45 font-mono">
                  <input
                    id="risk-input-drawdown"
                    type="number"
                    min="2.0"
                    max="50.0"
                    step="0.5"
                    value={maxDrawdown}
                    onChange={(e) => setMaxDrawdown(Number(e.target.value))}
                    className="bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-100 font-bold w-full"
                  />
                </div>
                <span className="text-[10px] text-gray-500 font-sans block leading-relaxed">
                  Emergency Liquidation Threshold. Breaks and liquidates all open positions if floating loss exceeds this percentage of balance.
                </span>
              </div>

              {/* Trailing Stops Toggle */}
              <div className="space-y-2 flex flex-col justify-between">
                <div className="space-y-2">
                  <span className="text-[11px] font-mono text-gray-400 block uppercase">Dynamic Trailing SL</span>
                  <label className="relative inline-flex items-center cursor-pointer pt-1">
                    <input
                      id="checkbox-trailing-stop"
                      type="checkbox"
                      checked={trailingEnabled}
                      onChange={(e) => setTrailingEnabled(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500 peer-checked:after:bg-slate-100" />
                    <span className="ml-3 text-xs font-semibold text-gray-300">
                      {trailingEnabled ? "ENABLED" : "DISABLED"}
                    </span>
                  </label>
                </div>
                <span className="text-[10px] text-gray-500 font-sans leading-relaxed">
                  Automatically trails SL behind trade profit once trigger distance of 150 pips ($1.50) is reached.
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-gray-800/40 flex justify-between items-center">
              {saveSuccess ? (
                <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400 font-mono">
                  <ShieldCheck size={16} />
                  <span>RISK PARAMETERS SECURED</span>
                </div>
              ) : (
                <span className="text-[11px] text-gray-500 font-mono">Changes apply to active bot instantly</span>
              )}

              <button
                id="btn-save-risk"
                type="submit"
                className="bg-gradient-to-r from-amber-500/20 to-amber-600/10 hover:from-amber-500/30 hover:to-amber-600/15 border border-amber-500/30 hover:border-amber-400 text-amber-400 px-6 py-2.5 rounded-lg text-xs font-bold font-sans transition-all duration-200 cursor-pointer shadow-lg"
              >
                APPLY PARAMETERS
              </button>
            </div>
          </form>
        </div>

        {/* Protection Mechanics Information */}
        <div className="bg-gradient-to-b from-gray-900/50 to-gray-950/70 border border-gray-800/30 p-6 rounded-xl flex flex-col justify-between shadow-2xl relative">
          <div className="space-y-4">
            <h2 className="text-xs font-bold font-sans tracking-widest text-slate-400 uppercase flex items-center space-x-2">
              <Lock size={14} className="text-amber-500" />
              <span>Capital Safeguards</span>
            </h2>

            <div className="space-y-4">
              <div className="space-y-1">
                <h3 className="text-slate-200 text-[12px] font-bold">1. Floating Drawdown Breaker</h3>
                <p className="text-[11px] text-gray-500 font-sans leading-relaxed">
                  The risk breaker guarantees that no matter what market spikes or black-swan events occur on Gold, floating drawdown can never exceed your security threshold. It triggers total position liquidation automatically.
                </p>
              </div>

              <div className="space-y-1">
                <h3 className="text-slate-200 text-[12px] font-bold">2. Fractional/Micro Accounts Mode</h3>
                <p className="text-[11px] text-gray-500 font-sans leading-relaxed">
                  The bot uses advanced fractional lot-sizing arithmetic, enabling stable, risk-managed trading on small retail balances down to $5, utilizing 0.01 micro-lots and tight pip protections without blowing accounts.
                </p>
              </div>

              <div className="space-y-1">
                <h3 className="text-slate-200 text-[12px] font-bold">3. Cooldown Locking</h3>
                <p className="text-[11px] text-gray-500 font-sans leading-relaxed">
                  If 2 consecutive trades are hit by Stop Loss within a 30-minute span, the bot enters "Cooldown Active" mode, locking execution for 1 hour to prevent emotional over-trading.
                </p>
              </div>
            </div>
          </div>

          <div className="text-[10px] font-mono text-gray-500 pt-6 border-t border-gray-800/25">
            SmartBlinks Capital Shield active.
          </div>
        </div>
      </section>
    </div>
  );
}
