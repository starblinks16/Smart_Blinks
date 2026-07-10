import React from "react";
import { Sliders, ShieldCheck, Cpu, HardDrive, Database, Globe, Key } from "lucide-react";

export default function Settings() {
  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 h-full bg-[#060709] text-slate-100 font-sans select-none">
      {/* Header */}
      <header className="bg-gradient-to-r from-gray-900/40 to-gray-950/60 border border-gray-800/40 p-4 sm:p-6 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 backdrop-blur-md">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent flex items-center space-x-2.5">
            <Sliders className="text-amber-500" />
            <span>System Parameters</span>
          </h1>
          <p className="text-[10px] sm:text-[11px] text-gray-500 font-mono mt-0.5 uppercase tracking-wide">
            Sub-System Diagnostics and Platform Core Configurations
          </p>
        </div>
      </header>

      {/* Main Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Core Environment Status Card */}
        <div className="bg-gradient-to-b from-gray-900/50 to-gray-950/70 border border-gray-800/30 p-6 rounded-xl space-y-5 shadow-2xl">
          <h2 className="text-xs font-bold font-sans tracking-widest text-slate-400 uppercase flex items-center space-x-2">
            <Globe size={14} className="text-cyan-400" />
            <span>Node Environment Diagnostics</span>
          </h2>

          <div className="space-y-4 font-mono text-[12px]">
            <div className="flex items-center justify-between border-b border-gray-800/25 pb-3">
              <span className="text-gray-500">PLATFORM URL</span>
              <span className="text-slate-300 select-all">https://ai.studio/build</span>
            </div>

            <div className="flex items-center justify-between border-b border-gray-800/25 pb-3">
              <span className="text-gray-500">RUNTIME HOST</span>
              <span className="text-slate-300">Cloud Run Secure Container VM</span>
            </div>

            <div className="flex items-center justify-between border-b border-gray-800/25 pb-3">
              <span className="text-gray-500">INGRESS ROUTING PORT</span>
              <span className="text-cyan-400 font-bold">3000 (Forwarded Proxy)</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500">REPLIT COMPATIBILITY</span>
              <span className="text-emerald-400 font-bold">Fully Armed (Port 8000 ready)</span>
            </div>
          </div>
        </div>

        {/* Database Status Card */}
        <div className="bg-gradient-to-b from-gray-900/50 to-gray-950/70 border border-gray-800/30 p-6 rounded-xl space-y-5 shadow-2xl">
          <h2 className="text-xs font-bold font-sans tracking-widest text-slate-400 uppercase flex items-center space-x-2">
            <Database size={14} className="text-amber-500" />
            <span>Storage & Persistence</span>
          </h2>

          <div className="space-y-4 font-mono text-[12px]">
            <div className="flex items-center justify-between border-b border-gray-800/25 pb-3">
              <span className="text-gray-500">ACTIVE DATABANK</span>
              <span className="text-amber-400 font-bold">JSON-file Repository Storage</span>
            </div>

            <div className="flex items-center justify-between border-b border-gray-800/25 pb-3">
              <span className="text-gray-500">REPLIT STORAGE</span>
              <span className="text-slate-300">SQLite Engine Ready</span>
            </div>

            <div className="flex items-center justify-between border-b border-gray-800/25 pb-3">
              <span className="text-gray-500">TRANSACTIONAL SCHEMA</span>
              <span className="text-slate-300">Ready for PostgreSQL mapping</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-gray-500">WRITE INTEGRITY</span>
              <span className="text-emerald-400 font-bold">Atomic Mutex Locks</span>
            </div>
          </div>
        </div>
      </section>

      {/* Diagnostic Logs System Panel */}
      <section className="bg-gradient-to-b from-gray-900/40 to-gray-950/60 border border-gray-800/30 p-6 rounded-xl shadow-2xl space-y-4">
        <h2 className="text-xs font-bold font-sans tracking-widest text-slate-400 uppercase flex items-center space-x-2">
          <Cpu size={14} className="text-amber-500" />
          <span>Neural Engine Diagnostic Telemetry</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
          <div className="bg-gray-950/45 p-4 rounded-lg border border-gray-800/30">
            <span className="text-[10px] font-mono text-gray-500 block uppercase">Gemini Latency</span>
            <span className="text-lg font-mono font-bold text-cyan-400">185ms</span>
          </div>

          <div className="bg-gray-950/45 p-4 rounded-lg border border-gray-800/30">
            <span className="text-[10px] font-mono text-gray-500 block uppercase">Memory Footprint</span>
            <span className="text-lg font-mono font-bold text-slate-200">42.5 MB / 512 MB</span>
          </div>

          <div className="bg-gray-950/45 p-4 rounded-lg border border-gray-800/30">
            <span className="text-[10px] font-mono text-gray-500 block uppercase">CPU Load</span>
            <span className="text-lg font-mono font-bold text-slate-200">0.82%</span>
          </div>
        </div>
      </section>
    </div>
  );
}
