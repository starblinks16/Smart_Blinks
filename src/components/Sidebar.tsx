import React from "react";
import {
  LayoutDashboard,
  Brain,
  TrendingUp,
  ShieldAlert,
  Terminal,
  Link,
  Settings as SettingsIcon,
  CircleDot,
  LogOut,
  Sliders,
  X
} from "lucide-react";
import SmartBlinksLogo from "./SmartBlinksLogo";
import { ConnectionStatus } from "../types";

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  connectionStatus: ConnectionStatus;
  isAiTradingActive: boolean;
  onLogout: () => void;
  onNavItemClick?: () => void;
  showCloseButton?: boolean;
  onClose?: () => void;
  account?: any;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  connectionStatus,
  isAiTradingActive,
  onLogout,
  onNavItemClick,
  showCloseButton,
  onClose,
  account
}: SidebarProps) {
  const menuItems = [
    { id: "overview", label: "Core Console", icon: LayoutDashboard },
    { id: "brain", label: "Market Brain", icon: Brain },
    { id: "trading", label: "Autonomous AI", icon: TrendingUp },
    { id: "risk", label: "Risk Shield", icon: ShieldAlert },
    { id: "feed", label: "Execution Feed", icon: Terminal },
    { id: "connections", label: "cTrader Node", icon: Link },
    { id: "settings", label: "Parameters", icon: Sliders }
  ];

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    if (onNavItemClick) {
      onNavItemClick();
    }
  };

  return (
    <aside className="w-full h-full bg-[#08090C] border-r border-gray-800/40 flex flex-col justify-between p-5 z-20">
      {/* Brand Identity */}
      <div className="flex flex-col space-y-6">
        <div className="flex items-center justify-between">
          <SmartBlinksLogo size={44} />
          {showCloseButton && (
            <button
              onClick={onClose}
              id="btn-sidebar-close"
              className="lg:hidden p-2 text-gray-400 hover:text-slate-100 bg-gray-800/25 hover:bg-gray-800/50 rounded-lg transition-all duration-200"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Real-time cTrader Sync Badge */}
        <div className="px-1">
          {account ? (
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-green-500/10 border border-green-500/30 text-green-400 text-[10px] font-bold tracking-widest font-mono rounded-lg uppercase justify-center shadow-[0_0_15px_rgba(34,197,94,0.05)]">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-ping shrink-0" />
              <span>LIVE cTrader Sync Active</span>
            </div>
          ) : (
            <div className="flex items-center space-x-2 px-3 py-1.5 bg-red-500/10 border border-red-500/30 text-red-500 text-[10px] font-bold tracking-widest font-mono rounded-lg uppercase justify-center">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
              <span>Waiting for real cTrader synchronization…</span>
            </div>
          )}
        </div>

        <hr className="border-gray-800/40" />

        {/* Navigation Items */}
        <nav className="flex flex-col space-y-1.5">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`sidebar-tab-${item.id}`}
                onClick={() => handleTabClick(item.id)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-[13px] font-sans font-medium transition-all duration-300 ${
                  isActive
                    ? "bg-gradient-to-r from-amber-500/10 to-cyan-500/5 text-amber-400 border-l-2 border-amber-500 shadow-[0_0_15px_rgba(212,175,55,0.08)]"
                    : "text-gray-400 hover:text-slate-200 hover:bg-gray-800/20"
                }`}
              >
                <Icon
                  size={16}
                  className={`transition-colors ${
                    isActive ? "text-amber-400" : "text-gray-400 group-hover:text-slate-200"
                  }`}
                />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* System Node Telemetry */}
      <div className="flex flex-col space-y-4">
        <div className="bg-gray-900/45 border border-gray-800/50 p-3 rounded-lg space-y-2.5">
          {/* AI Autonomous Core Status */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 font-sans tracking-wide uppercase">AI Core</span>
            <span className={`flex items-center space-x-1 text-[10px] font-mono ${isAiTradingActive ? "text-cyan-400" : "text-amber-500"}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${isAiTradingActive ? "bg-cyan-400 animate-pulse" : "bg-amber-500"}`} />
              <span>{isAiTradingActive ? "ACTIVE" : "STANDBY"}</span>
            </span>
          </div>

          {/* Connection Status */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-gray-500 font-sans tracking-wide uppercase">Broker Link</span>
            <span className={`flex items-center space-x-1 text-[10px] font-mono ${
              connectionStatus === "CONNECTED"
                ? "text-cyan-400"
                : connectionStatus === "CONNECTING"
                ? "text-amber-400 animate-pulse"
                : "text-red-500"
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${
                connectionStatus === "CONNECTED"
                  ? "bg-cyan-400"
                  : connectionStatus === "CONNECTING"
                  ? "bg-amber-400"
                  : "bg-red-500"
              }`} />
              <span>{connectionStatus}</span>
            </span>
          </div>
        </div>

        {/* Logout Control */}
        <button
          onClick={onLogout}
          id="btn-logout"
          className="flex items-center space-x-3 px-4 py-2.5 rounded-lg text-[11px] font-semibold text-gray-500 hover:text-red-400 hover:bg-red-500/5 transition-all duration-300 w-full"
        >
          <LogOut size={14} />
          <span>TERMINATE SESSION</span>
        </button>
      </div>
    </aside>
  );
}
