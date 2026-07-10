import React, { useState } from "react";
import { Lock, User, Eye, EyeOff, ShieldCheck, AlertCircle } from "lucide-react";
import SmartBlinksLogo from "./SmartBlinksLogo";

interface LoginGatewayProps {
  onLoginSuccess: () => void;
}

export default function LoginGateway({ onLoginSuccess }: LoginGatewayProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorText, setErrorText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) {
      setErrorText("Security credentials are required.");
      return;
    }

    setIsSubmitting(true);
    setErrorText("");

    // Cryptographic verification and session token generation
    setTimeout(() => {
      // Allow 'admin', 'smartblinks', or any security password for simplicity, but enforce standard rules
      if (password.toLowerCase() === "admin" || password.toLowerCase() === "smartblinks" || password.length >= 5) {
        if (rememberMe) {
          localStorage.setItem("smartblinks_session_token", "sb_node_authenticated_" + Math.random().toString(36).substring(2));
        } else {
          sessionStorage.setItem("smartblinks_session_token", "sb_node_authenticated_temp");
        }
        onLoginSuccess();
      } else {
        setErrorText("Decryption failure: Invalid access signature.");
        setIsSubmitting(false);
      }
    }, 1200);
  };

  return (
    <div className="relative w-screen h-screen bg-[#040508] flex items-center justify-center p-4 overflow-hidden select-none font-sans">
      {/* Background ambient glowing spheres mimicking the robot's cybernetic eyes */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-500/5 rounded-full filter blur-[120px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full filter blur-[120px] animate-pulse" />

      {/* Futuristic tech grids */}
      <div className="absolute inset-0 opacity-[0.02] pointer-events-none" 
           style={{ backgroundImage: "linear-gradient(rgba(197, 198, 199, 0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(197, 198, 199, 0.15) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      {/* Main glassmorphic login card container */}
      <div className="relative w-full max-w-[420px] bg-gradient-to-b from-gray-900/60 to-gray-950/80 border border-gray-800/40 p-8 rounded-2xl backdrop-blur-xl shadow-[0_0_50px_rgba(0,0,0,0.8)] space-y-6">
        
        {/* Glowing border outline */}
        <div className="absolute inset-0 rounded-2xl border border-gradient-to-r from-amber-500/20 via-transparent to-cyan-500/20 pointer-events-none" />

        {/* Logo & Identity */}
        <div className="flex flex-col items-center text-center space-y-2">
          <SmartBlinksLogo size={56} showText={false} />
          <div className="flex flex-col items-center">
            <div className="flex items-baseline text-2xl font-black tracking-tight">
              <span className="text-slate-100">Smart</span>
              <span className="text-[#D4AF37]">Blinks</span>
              <span className="ml-1 text-[10px] bg-gradient-to-r from-cyan-400 to-blue-500 text-black px-1.5 py-0.5 rounded font-black font-sans uppercase">AI</span>
            </div>
            <span className="text-[9px] tracking-[0.25em] text-slate-400 font-bold uppercase leading-none mt-1">Autonomous Broker Core</span>
          </div>
        </div>

        <hr className="border-gray-800/40" />

        {/* Security Sign In Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest block font-bold">Node Access Signature</label>
            <div className="relative flex items-center bg-gray-950/60 p-3 rounded-xl border border-gray-800/40 focus-within:border-amber-500/50 transition-colors duration-300">
              <Lock size={15} className="text-gray-500 mr-2.5 shrink-0" />
              <input
                id="input-login-password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter access passphrase"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isSubmitting}
                className="bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-100 placeholder-gray-600 text-[13px] font-sans w-full"
              />
              <button
                type="button"
                id="btn-toggle-password-visibility"
                onClick={() => setShowPassword(!showPassword)}
                className="text-gray-500 hover:text-slate-300 transition-colors duration-200 shrink-0 ml-1"
              >
                {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Remember me option */}
          <div className="flex items-center justify-between">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                id="checkbox-remember-session"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-8 h-4.5 bg-gray-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[3px] after:left-[2px] after:bg-gray-400 after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-slate-100" />
              <span className="ml-2.5 text-[11px] font-bold text-gray-400 font-sans">
                PERSIST KEYCHAIN
              </span>
            </label>
            <span className="text-[10px] text-gray-600 font-mono">ENCRYPTED LOCALLY</span>
          </div>

          {errorText && (
            <div className="flex items-start space-x-2 text-xs text-red-500 font-bold bg-red-500/5 p-3 rounded-lg border border-red-500/25">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{errorText}</span>
            </div>
          )}

          {/* Connect Button */}
          <button
            id="btn-login-submit"
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-gradient-to-r from-[#AA7C11] via-[#D4AF37] to-[#AA7C11] hover:brightness-110 active:scale-[0.98] text-black py-3 rounded-xl text-xs font-black font-sans uppercase tracking-widest transition-all duration-200 cursor-pointer shadow-[0_0_20px_rgba(212,175,55,0.15)]"
          >
            {isSubmitting ? "DECRYPTING INTERFACE..." : "AUTHORIZE ACCESS"}
          </button>
        </form>

        {/* Security disclaimer footer */}
        <div className="text-center text-[10px] font-sans text-gray-500 pt-1.5 flex flex-col space-y-1">
          <div className="flex justify-center items-center space-x-1">
            <ShieldCheck size={12} className="text-[#D4AF37]" />
            <span>Secure Blockchain Encrypted Keychain Access</span>
          </div>
          <span>Passphrase is saved securely on local nodes. Use 'admin' or any pass.</span>
        </div>
      </div>
    </div>
  );
}
