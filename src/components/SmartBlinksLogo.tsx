import React from "react";

interface LogoProps {
  className?: string;
  size?: number;
  showText?: boolean;
}

export default function SmartBlinksLogo({ className = "", size = 48, showText = true }: LogoProps) {
  return (
    <div className={`flex items-center space-x-3 select-none ${className}`}>
      {/* Cinematic Logo Graphic */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="drop-shadow-[0_0_15px_rgba(0,229,255,0.25)] filter"
      >
        {/* Golden outer crescent circle */}
        <path
          d="M 100,20 A 80,80 0 1,0 180,100"
          stroke="url(#goldGradient)"
          strokeWidth="8"
          strokeLinecap="round"
          fill="none"
        />
        
        {/* Golden Arrow Trendline overlay */}
        <path
          d="M 75,150 L 105,120 L 125,140 L 165,95 L 150,95 M 165,95 L 165,110"
          stroke="url(#goldGradient)"
          strokeWidth="6"
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
        />

        {/* Gold Candlestick Columns */}
        {/* Candlestick 1 */}
        <line x1="145" y1="65" x2="145" y2="105" stroke="url(#goldGradient)" strokeWidth="3" />
        <rect x="142" y="73" width="6" height="22" fill="url(#goldGradient)" rx="1.5" />

        {/* Candlestick 2 */}
        <line x1="125" y1="80" x2="125" y2="125" stroke="url(#goldGradient)" strokeWidth="3" />
        <rect x="122" y="88" width="6" height="24" fill="url(#goldGradient)" rx="1.5" />

        {/* Candlestick 3 */}
        <line x1="105" y1="105" x2="105" y2="140" stroke="url(#goldGradient)" strokeWidth="3" />
        <rect x="102" y="112" width="6" height="18" fill="url(#goldGradient)" rx="1.5" />

        {/* Cybernetic AI Bot Head */}
        <g transform="translate(60, 48)">
          {/* Main helmet shape */}
          <path
            d="M 40,10 C 15,10 5,30 5,55 C 5,75 15,90 35,92 C 40,93 45,91 50,88 L 65,92 C 67,92 68,90 67,88 L 65,75 C 72,68 75,58 75,50 C 75,25 60,10 40,10 Z"
            fill="#0F111A"
            stroke="url(#silverGradient)"
            strokeWidth="5"
          />

          {/* Golden Head Earplate detail */}
          <circle cx="65" cy="55" r="14" fill="#141923" stroke="url(#goldGradient)" strokeWidth="3" />
          {/* Inner earplate lines representing financial chart */}
          <rect x="58" y="52" width="3" height="10" fill="url(#goldGradient)" />
          <rect x="63" y="48" width="3" height="14" fill="url(#goldGradient)" />
          <rect x="68" y="54" width="3" height="8" fill="url(#goldGradient)" />

          {/* Gold crown stripe details on helm */}
          <path
            d="M 40,10 C 25,12 20,25 22,35 M 40,10 C 45,20 48,32 45,45"
            stroke="url(#goldGradient)"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />

          {/* Sleek visor mask */}
          <path
            d="M 12,42 C 12,38 25,35 48,35 C 55,35 63,38 65,42 C 67,46 64,62 58,64 C 48,66 22,66 14,64 C 10,62 12,46 12,42 Z"
            fill="#08090E"
            stroke="url(#silverGradient)"
            strokeWidth="2.5"
          />

          {/* Visor glowing cybernetic eyes */}
          <ellipse cx="24" cy="50" rx="7" ry="3.5" fill="#00E5FF" className="animate-pulse" />
          <ellipse cx="48" cy="50" rx="7" ry="3.5" fill="#00E5FF" className="animate-pulse" />

          {/* Sleek silver chin cover */}
          <path
            d="M 22,80 L 35,91 L 48,82 C 48,82 30,83 22,80 Z"
            fill="url(#silverGradient)"
          />
        </g>

        {/* Color gradients definition */}
        <defs>
          <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFF2B2" />
            <stop offset="30%" stopColor="#D4AF37" />
            <stop offset="70%" stopColor="#AA7C11" />
            <stop offset="100%" stopColor="#FDF0A6" />
          </linearGradient>
          <linearGradient id="silverGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="50%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>
        </defs>
      </svg>

      {/* Brand Text styling */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-baseline">
            <span className="font-sans font-extrabold text-2xl tracking-tight text-slate-100">Smart</span>
            <span className="font-sans font-bold text-2xl tracking-tight text-[#D4AF37]">Blinks</span>
            <span className="ml-1 text-[10px] bg-gradient-to-r from-cyan-400 to-blue-500 text-black px-1.5 py-0.5 rounded font-black font-sans uppercase">AI</span>
          </div>
          <span className="text-[9px] tracking-[0.25em] text-slate-400 font-sans font-bold uppercase leading-none mt-0.5">Autonomous Broker Core</span>
        </div>
      )}
    </div>
  );
}
