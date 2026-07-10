import React, { useEffect, useRef } from "react";
import { createChart, CandlestickSeries } from "lightweight-charts";
import { Candle, Position } from "../types";

interface ChartProps {
  candles: Candle[];
  positions: Position[];
}

export default function TradingViewChart({ candles, positions }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candlestickSeriesRef = useRef<any>(null);
  const priceLinesRef = useRef<any[]>([]);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Create TradingView lightweight chart with cinematic dark style
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { color: "#0A0B0E" },
        textColor: "#9CA3AF",
        fontFamily: "JetBrains Mono, monospace"
      },
      grid: {
        vertLines: { color: "rgba(31, 41, 55, 0.4)" },
        horzLines: { color: "rgba(31, 41, 55, 0.4)" }
      },
      crosshair: {
        mode: 1, // Normal crosshair
        vertLine: {
          color: "#00E5FF",
          width: 1,
          style: 3 // Dotted
        },
        horzLine: {
          color: "#00E5FF",
          width: 1,
          style: 3
        }
      },
      rightPriceScale: {
        borderColor: "rgba(197, 198, 199, 0.15)",
        scaleMargins: {
          top: 0.15,
          bottom: 0.15
        }
      },
      timeScale: {
        borderColor: "rgba(197, 198, 199, 0.15)",
        timeVisible: true,
        secondsVisible: false
      }
    });

    chartRef.current = chart;

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#00E5FF", // Glowing Cyan for positive bars
      downColor: "#FF4B4B", // Glowing Red for negative bars
      borderUpColor: "#00E5FF",
      borderDownColor: "#FF4B4B",
      wickUpColor: "#00E5FF",
      wickDownColor: "#FF4B4B"
    });

    candlestickSeriesRef.current = candlestickSeries;

    // Auto-resize handler
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries.length === 0 || !entries[0].contentRect) return;
      const { width, height } = entries[0].contentRect;
      chart.applyOptions({ width, height });
    });
    resizeObserver.observe(chartContainerRef.current);

    return () => {
      resizeObserver.disconnect();
      chart.remove();
    };
  }, []);

  // Sync candles
  useEffect(() => {
    if (!candlestickSeriesRef.current || candles.length === 0) return;
    
    // Process candles for TV format (remove duplicates and sort by time)
    const formattedCandles = candles
      .filter((c, idx, arr) => arr.findIndex((x) => x.time === c.time) === idx)
      .map((c) => ({
        time: c.time as any,
        open: c.open,
        high: c.high,
        low: c.low,
        close: c.close
      }))
      .sort((a, b) => a.time - b.time);

    candlestickSeriesRef.current.setData(formattedCandles);
  }, [candles]);

  // Sync position lines on chart
  useEffect(() => {
    const series = candlestickSeriesRef.current;
    if (!series || !chartRef.current) return;

    // Clear previous lines
    priceLinesRef.current.forEach((line) => {
      try {
        series.removePriceLine(line);
      } catch (e) {}
    });
    priceLinesRef.current = [];

    // Draw active positions overlays (Entries, SL, TP)
    positions.forEach((pos) => {
      // 1. Entry Line (Gold)
      const entryLine = series.createPriceLine({
        price: pos.entryPrice,
        color: "#D4AF37",
        lineWidth: 1,
        lineStyle: 0, // Solid
        axisLabelVisible: true,
        title: `${pos.tradeSide} (Entry) ${pos.volume / 100000} Lots`
      });
      priceLinesRef.current.push(entryLine);

      // 2. Stop Loss (Red)
      if (pos.sl) {
        const slLine = series.createPriceLine({
          price: pos.sl,
          color: "#FF4B4B",
          lineWidth: 1,
          lineStyle: 1, // Dashed
          axisLabelVisible: true,
          title: "SL"
        });
        priceLinesRef.current.push(slLine);
      }

      // 3. Take Profit (Cyan)
      if (pos.tp) {
        const tpLine = series.createPriceLine({
          price: pos.tp,
          color: "#00E5FF",
          lineWidth: 1,
          lineStyle: 1, // Dashed
          axisLabelVisible: true,
          title: "TP"
        });
        priceLinesRef.current.push(tpLine);
      }
    });
  }, [positions, candles]);

  return (
    <div id="gold-chart-container" className="relative w-full h-full bg-[#0A0B0E] rounded-xl overflow-hidden border border-gray-800/40">
      {/* Live Badge */}
      <div className="absolute top-4 left-4 z-10 flex items-center space-x-2 bg-black/60 backdrop-blur-md border border-cyan-500/30 px-3 py-1 rounded-full text-[11px] font-mono tracking-wider text-cyan-400 shadow-[0_0_15px_rgba(0,229,255,0.15)]">
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
        </span>
        <span>XAUUSD • SPOT GOLD</span>
      </div>

      {candles.length === 0 && (
        <div className="absolute inset-0 bg-[#0A0B0E]/90 backdrop-blur-md z-20 flex flex-col items-center justify-center space-y-4 px-6 text-center">
          <div className="text-amber-500 text-xs font-mono animate-pulse uppercase tracking-[0.2em]">
            Waiting for real cTrader synchronization...
          </div>
          <p className="text-[10px] text-gray-500 font-sans max-w-xs leading-relaxed">
            Please link your cTrader broker account in the <strong className="text-gray-400">cTrader Node</strong> tab to begin live gold price feed streams.
          </p>
        </div>
      )}

      <div ref={chartContainerRef} className="w-full h-full" />
    </div>
  );
}
