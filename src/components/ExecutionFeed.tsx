import React, { useState } from "react";
import { Terminal, Search, Trash2, Filter, AlertTriangle } from "lucide-react";
import { ExecutionLog } from "../types";

interface ExecutionFeedProps {
  executionFeed: ExecutionLog[];
  onClearLogs: () => void;
}

export default function ExecutionFeed({ executionFeed, onClearLogs }: ExecutionFeedProps) {
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");

  const filteredLogs = executionFeed.filter((log) => {
    const matchesSearch =
      log.title.toLowerCase().includes(search.toLowerCase()) ||
      log.message.toLowerCase().includes(search.toLowerCase());
    
    if (filterType === "ALL") return matchesSearch;
    if (filterType === "TRADES") return matchesSearch && log.type.startsWith("TRADE");
    return matchesSearch && log.type === filterType;
  });

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6 h-full bg-[#060709] text-slate-100 font-sans select-none">
      {/* Header */}
      <header className="bg-gradient-to-r from-gray-900/40 to-gray-950/60 border border-gray-800/40 p-4 sm:p-6 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 backdrop-blur-md">
        <div>
          <h1 className="text-lg sm:text-xl font-bold tracking-tight bg-gradient-to-r from-amber-400 to-amber-200 bg-clip-text text-transparent flex items-center space-x-2.5">
            <Terminal className="text-amber-500 animate-pulse" />
            <span>Autonomous Execution Feed</span>
          </h1>
          <p className="text-[10px] sm:text-[11px] text-gray-500 font-mono mt-0.5 uppercase tracking-wide">
            Real-Time Audit Logs of Neural Strategy Decisions & Broker Transmissions
          </p>
        </div>
      </header>

      {/* Control Actions (Search & Filter) */}
      <section className="bg-gray-900/20 border border-gray-800/35 p-4 rounded-xl flex flex-col md:flex-row justify-between items-center gap-4">
        {/* Search Input */}
        <div className="flex items-center space-x-2 bg-gray-950/60 border border-gray-800/40 px-3 py-2 rounded-lg w-full md:w-80 font-mono text-[12px]">
          <Search size={14} className="text-gray-500" />
          <input
            id="input-log-search"
            type="text"
            placeholder="Search executions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-100 placeholder-gray-500 w-full"
          />
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center mr-1">
            <Filter size={14} className="text-gray-500 mr-1.5" />
          </div>
          {["ALL", "TRADES", "INFO", "WARNING"].map((type) => (
            <button
              key={type}
              id={`btn-filter-log-${type}`}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded text-[11px] font-bold transition-all duration-200 uppercase font-sans ${
                filterType === type
                  ? "bg-amber-500/10 text-amber-400 border border-amber-500/25"
                  : "bg-gray-950/40 text-gray-400 hover:text-slate-200 border border-transparent"
              }`}
            >
              {type}
            </button>
          ))}

          <button
            onClick={onClearLogs}
            id="btn-clear-logs"
            className="p-1.5 rounded text-gray-500 hover:text-red-400 hover:bg-red-500/5 border border-transparent transition-all duration-200 ml-2 cursor-pointer"
            title="Clear Feed History"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </section>

      {/* Terminal View */}
      <section className="bg-gradient-to-b from-gray-950/90 to-gray-950 border border-gray-800/30 rounded-xl overflow-hidden shadow-2xl relative">
        <div className="bg-gray-950/90 px-5 py-3 border-b border-gray-800/40 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
          </div>
          <span className="text-[10px] font-mono text-gray-500">smartblinks-node-1 • sh</span>
        </div>

        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-gray-500 font-mono text-xs">
            No executions matched the active filters or search string.
          </div>
        ) : (
          <div className="p-5 space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {filteredLogs.map((log) => {
              const isTradeOpen = log.type === "TRADE_OPEN";
              const isTradeClose = log.type === "TRADE_CLOSE";
              const isWarning = log.type === "WARNING" || log.type === "SL_HIT";
              const isTpHit = log.type === "TP_HIT";

              let indicatorColor = "text-amber-500";
              if (isTradeOpen || isTpHit) indicatorColor = "text-cyan-400";
              else if (isTradeClose || isWarning) indicatorColor = "text-red-500";

              return (
                <div key={log.id} className="text-[12px] font-mono border-b border-gray-800/10 pb-3 last:border-0 last:pb-0 space-y-1">
                  <div className="flex justify-between items-center text-gray-600 text-[10px]">
                    <div className="flex items-center space-x-2">
                      <span className={`font-black ${indicatorColor}`}>[{log.type}]</span>
                      <span>•</span>
                      <span>STRATEGY: {log.strategy || "CONTINUATION"}</span>
                    </div>
                    <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                  </div>

                  <div className="font-bold text-slate-100 flex items-center space-x-1.5">
                    {isWarning && <AlertTriangle size={13} className="text-red-500 shrink-0" />}
                    <span>{log.title}</span>
                  </div>
                  
                  <div className="text-gray-400 leading-relaxed font-sans">{log.message}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
