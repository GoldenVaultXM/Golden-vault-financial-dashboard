import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import {
  Wallet, TrendingUp, Activity, Target, BarChart2, Shield, Zap, Globe,
  ArrowDownToLine, ArrowUpFromLine, FileBarChart, CheckCircle2, Menu, X,
  ChevronRight, Bell, Settings, LogOut, Home, Search, Lock, Award, BookOpen,
  Mail, Phone, MapPin, Eye, EyeOff, UserPlus, LogIn, AlertCircle, RefreshCw,
  Users, Newspaper, Cpu, ExternalLink,
} from "lucide-react";

/* ─── CINEMATIC DESIGN TOKENS ─────────────────────────────────────────────── */
const T = {
  // Foundation — pure void
  void:       "#000000",
  surface:    "#050505",
  surface2:   "#080808",
  surface3:   "#0d0d0d",
  surface4:   "#111111",
  surface5:   "#161616",

  // Borders — surgical precision
  rim:        "rgba(191,149,63,0.12)",
  rim2:       "rgba(191,149,63,0.20)",
  rim3:       "rgba(191,149,63,0.35)",
  rimWhite:   "rgba(255,255,255,0.04)",

  // Luxury Gold gradient stops
  gold:       "#FCF6BA",
  goldA:      "#BF953F",
  goldB:      "#FCF6BA",
  goldC:      "#B38728",
  goldD:      "#FBF5B7",
  goldE:      "#AA771C",
  goldSolid:  "#C9A84C",
  goldDim:    "#7a5c1e",
  goldGlow:   "rgba(191,149,63,0.18)",

  // Accents
  green:      "#00FF88",
  greenDim:   "rgba(0,255,136,0.12)",
  techGreen:  "#00FF41",
  red:        "#FF3B3B",
  blue:       "#4FA3FF",
  purple:     "#9B6BFF",

  // Typography
  text:       "#FFFFFF",
  text2:      "#C8C0AE",
  text3:      "#6B6456",
  text4:      "#2A2520",

  // Shadows
  shadowDeep: "0 24px 80px rgba(0,0,0,0.95), 0 8px 24px rgba(0,0,0,0.8)",
  shadowCard: "0 8px 40px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.03)",
  shadowGold: "0 0 40px rgba(191,149,63,0.15), 0 0 80px rgba(191,149,63,0.06)",
  shadowGlow: "0 0 20px rgba(0,255,65,0.25), 0 0 60px rgba(0,255,65,0.08)",
};

const GOLD_GRADIENT = `linear-gradient(135deg, ${T.goldA}, ${T.goldB}, ${T.goldC}, ${T.goldD}, ${T.goldE})`;
const GOLD_TEXT = { background: GOLD_GRADIENT, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" };

/* ─── CONTEXTS ─────────────────────────────────────────────────────────────── */
const ThemeContext = createContext(null);
const AuthContext = createContext(null);
const LayoutContext = createContext(null);
const useTheme = () => useContext(ThemeContext);
const useAuth = () => useContext(AuthContext);
const useLayout = () => useContext(LayoutContext);

/* ─── LAYOUT ───────────────────────────────────────────────────────────────── */
const BREAKPOINT = 768;
function getMode() { return window.innerWidth >= BREAKPOINT ? "desktop" : "mobile"; }
function LayoutProvider({ children }) {
  const [mode, setMode] = useState(getMode);
  useEffect(() => {
    const h = () => setMode(getMode());
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return <LayoutContext.Provider value={{ mode, width: mode === "desktop" ? 1200 : 600 }}>{children}</LayoutContext.Provider>;
}

/* ─── AUTH (MOCK) ──────────────────────────────────────────────────────────── */
function AuthProvider({ children }) {
  const [user, setUser] = useState({ name: "Alexander Voss", email: "a.voss@goldenvault.xm" });
  const [modal, setModal] = useState(null);
  const login = (u) => { setUser(u); setModal(null); };
  const logout = () => setUser(null);
  const requireAuth = (m = "signup") => { if (!user) { setModal(m); return false; } return true; };
  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, login, logout, requireAuth }}>
      {children}
      {modal && <AuthModal onClose={() => setModal(null)} initialMode={modal} />}
    </AuthContext.Provider>
  );
}

/* ─── MARKET DATA ──────────────────────────────────────────────────────────── */
const INSTRUMENTS = [
  { pair: "BTC/USDT",  name: "Bitcoin",       cat: "Crypto",      base: 67800,    step: 0.0003 },
  { pair: "ETH/USDT",  name: "Ethereum",      cat: "Crypto",      base: 3520,     step: 0.0003 },
  { pair: "SOL/USDT",  name: "Solana",        cat: "Crypto",      base: 178,      step: 0.0004 },
  { pair: "XRP/USDT",  name: "XRP",           cat: "Crypto",      base: 0.5821,   step: 0.0005 },
  { pair: "BNB/USDT",  name: "BNB",           cat: "Crypto",      base: 612,      step: 0.0003 },
  { pair: "EUR/USD",   name: "Euro/Dollar",   cat: "Forex",       base: 1.08432,  step: 0.00008 },
  { pair: "GBP/USD",   name: "Sterling",      cat: "Forex",       base: 1.27180,  step: 0.00008 },
  { pair: "USD/JPY",   name: "Dollar/Yen",    cat: "Forex",       base: 156.84,   step: 0.00006 },
  { pair: "AAPL",      name: "Apple Inc.",    cat: "Stocks",      base: 189.30,   step: 0.0002 },
  { pair: "NVDA",      name: "NVIDIA",        cat: "Stocks",      base: 875.40,   step: 0.0002 },
  { pair: "TSLA",      name: "Tesla",         cat: "Stocks",      base: 248.60,   step: 0.0003 },
  { pair: "SPX",       name: "S&P 500",       cat: "Indices",     base: 5218.0,   step: 0.0001 },
  { pair: "NDX",       name: "NASDAQ 100",    cat: "Indices",     base: 18320.0,  step: 0.0001 },
  { pair: "XAU/USD",   name: "Gold Spot",     cat: "Commodities", base: 2342.0,   step: 0.0001 },
  { pair: "XTI/USD",   name: "Crude Oil WTI", cat: "Commodities", base: 77.40,    step: 0.0002 },
];

function useLivePrices() {
  const init = () => {
    const m = {};
    INSTRUMENTS.forEach(d => {
      m[d.pair] = { price: d.base, pct24h: (Math.random() - 0.45) * 4, prevDay: d.base * (1 - (Math.random() - 0.45) * 0.04), up: Math.random() > 0.45 };
    });
    return m;
  };
  const [prices, setPrices] = useState(init);
  const [flash, setFlash] = useState({});
  useEffect(() => {
    const id = setInterval(() => {
      const flashNext = {};
      setPrices(prev => {
        const next = { ...prev };
        INSTRUMENTS.filter(() => Math.random() < 0.3).forEach(d => {
          const cur = prev[d.pair];
          const sign = Math.random() > 0.5 ? 1 : -1;
          const mag = d.step * (0.5 + Math.random()) * d.base;
          const newPrice = Math.max(cur.price + sign * mag, d.base * 0.7);
          next[d.pair] = { price: newPrice, pct24h: ((newPrice - cur.prevDay) / cur.prevDay) * 100, prevDay: cur.prevDay, up: sign === 1 };
          flashNext[d.pair] = sign === 1 ? "up" : "dn";
        });
        return next;
      });
      setFlash(flashNext);
      setTimeout(() => setFlash({}), 600);
    }, 2000);
    return () => clearInterval(id);
  }, []);
  return { prices, flash };
}

const fmtPrice = (price, cat) => {
  if (!price) return "—";
  if (cat === "Crypto") {
    if (price < 0.001) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (cat === "Forex") return price > 50 ? price.toFixed(3) : price.toFixed(4);
  if (price > 10000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toFixed(2);
};
const fmtPct = p => p == null ? "—" : `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`;

/* ─── GLOBAL STYLES ────────────────────────────────────────────────────────── */
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;0,900;1,400;1,700;1,900&family=Inter:wght@300;400;500;600;700;800;900&display=swap');

      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      html, body { background: #000 !important; min-height: 100vh; }
      ::-webkit-scrollbar { width: 2px; }
      ::-webkit-scrollbar-track { background: #050505; }
      ::-webkit-scrollbar-thumb { background: rgba(191,149,63,0.3); border-radius: 1px; }
      input, button, select, textarea { font-family: 'Inter', sans-serif; }
      input::placeholder { color: #3a3530; }

      @keyframes pulse     { 0%,100%{opacity:1} 50%{opacity:.35} }
      @keyframes spin      { to { transform: rotate(360deg); } }
      @keyframes shimmer   { 0%,100%{opacity:.25} 50%{opacity:.6} }
      @keyframes gearCW    { to { transform: rotate(360deg); } }
      @keyframes gearCCW   { to { transform: rotate(-360deg); } }
      @keyframes goldPulse { 0%,100%{opacity:.13} 50%{opacity:.22} }
      @keyframes scanline  { 0%{transform:translateY(-100%)} 100%{transform:translateY(100vh)} }
      @keyframes fadeUp    { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:translateY(0)} }
      @keyframes borderGlow {
        0%,100% { box-shadow: 0 0 0 0 rgba(191,149,63,0); border-color: rgba(191,149,63,0.12); }
        50%     { box-shadow: 0 0 24px rgba(191,149,63,0.1); border-color: rgba(191,149,63,0.28); }
      }
      @keyframes techPulse {
        0%,100% { filter: drop-shadow(0 0 4px rgba(0,255,65,0.4)); }
        50%     { filter: drop-shadow(0 0 12px rgba(0,255,65,0.8)); }
      }

      .metric-card { animation: borderGlow 4s ease-in-out infinite; }
      .metric-card:nth-child(2) { animation-delay: 1s; }
      .metric-card:nth-child(3) { animation-delay: 2s; }
      .metric-card:nth-child(4) { animation-delay: 3s; }

      .gear-tech { animation: techPulse 3s ease-in-out infinite; }

      .fade-up { animation: fadeUp 0.5s ease forwards; }
      .fade-up:nth-child(1) { animation-delay: 0.05s; opacity: 0; }
      .fade-up:nth-child(2) { animation-delay: 0.12s; opacity: 0; }
      .fade-up:nth-child(3) { animation-delay: 0.19s; opacity: 0; }
      .fade-up:nth-child(4) { animation-delay: 0.26s; opacity: 0; }

      .price-flash-up { background: rgba(0,255,136,0.06) !important; }
      .price-flash-dn { background: rgba(255,59,59,0.06) !important; }

      /* Scanline overlay */
      .scanline-overlay::after {
        content: '';
        position: fixed;
        top: 0; left: 0; right: 0;
        height: 3px;
        background: linear-gradient(transparent, rgba(0,255,65,0.03), transparent);
        animation: scanline 8s linear infinite;
        pointer-events: none;
        z-index: 9999;
      }
    `}</style>
  );
}

/* ─── VOID BACKGROUND GEARS ────────────────────────────────────────────────── */
function CinematicGears() {
  const GearSVG = ({ size, style, teeth, r1, r2, r3, rInner, dir, duration }) => (
    <svg
      viewBox="0 0 200 200"
      style={{
        position: "fixed",
        pointerEvents: "none",
        zIndex: 0,
        animation: `${dir === "cw" ? "gearCW" : "gearCCW"} ${duration}s linear infinite`,
        transformOrigin: "50% 50%",
        ...style,
      }}
      className="gear-tech"
    >
      <defs>
        <radialGradient id={`gearGrad_${duration}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#00FF41" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#00FF41" stopOpacity="0" />
        </radialGradient>
        <filter id={`glow_${duration}`}>
          <feGaussianBlur stdDeviation="1.5" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
      <g transform="translate(100,100)" filter={`url(#glow_${duration})`}>
        {/* Tooth ring */}
        {Array.from({ length: teeth }, (_, i) => (
          <rect
            key={i}
            x={-3.5} y={-7}
            width={7} height={15}
            rx={1.5}
            fill="#00FF41"
            opacity="0.65"
            transform={`rotate(${i * (360 / teeth)}) translate(${r1}, 0)`}
          />
        ))}
        {/* Outer ring */}
        <circle r={r1 - 2} fill="none" stroke="#00FF41" strokeWidth="1.5" opacity="0.7" />
        {/* Mid ring */}
        <circle r={r2} fill="none" stroke="#00FF41" strokeWidth="0.8" strokeDasharray="4 4" opacity="0.4" />
        {/* Inner ring */}
        <circle r={r3} fill="none" stroke="#00FF41" strokeWidth="1.2" opacity="0.5" />
        {/* Hub */}
        <circle r={rInner} fill="rgba(0,255,65,0.05)" stroke="#00FF41" strokeWidth="1.2" opacity="0.8" />
        <circle r={rInner * 0.38} fill="#00FF41" opacity="0.5" />
        {/* Spokes */}
        {Array.from({ length: 6 }, (_, i) => {
          const a = (i * Math.PI * 2) / 6;
          return (
            <line
              key={i}
              x1={0} y1={0}
              x2={r3 * 0.85 * Math.cos(a)}
              y2={r3 * 0.85 * Math.sin(a)}
              stroke="#00FF41"
              strokeWidth="0.8"
              opacity="0.3"
            />
          );
        })}
        {/* Rivet dots on mid ring */}
        {Array.from({ length: teeth }, (_, i) => {
          const a = (i * Math.PI * 2) / teeth;
          return (
            <circle
              key={i}
              cx={r2 * Math.cos(a)}
              cy={r2 * Math.sin(a)}
              r={1.5}
              fill="#00FF41"
              opacity="0.35"
            />
          );
        })}
        {/* Background glow fill */}
        <circle r={r1} fill={`url(#gearGrad_${duration})`} />
      </g>
    </svg>
  );

  return (
    <>
      <GearSVG size={300} dir="cw" duration={28} teeth={16} r1={78} r2={58} r3={42} rInner={14}
        style={{ top: "-8%", right: "-16%", width: "58vw", maxWidth: 280, opacity: 0.7 }} />
      <GearSVG size={340} dir="ccw" duration={36} teeth={18} r1={74} r2={55} r3={40} rInner={13}
        style={{ bottom: "-10%", left: "-18%", width: "64vw", maxWidth: 320, opacity: 0.6 }} />
      <GearSVG size={170} dir="ccw" duration={18} teeth={12} r1={64} r2={48} r3={36} rInner={11}
        style={{ top: "18%", left: "-10%", width: "30vw", maxWidth: 155, opacity: 0.5 }} />
      <GearSVG size={215} dir="cw" duration={22} teeth={14} r1={68} r2={50} r3={38} rInner={12}
        style={{ bottom: "24%", right: "-12%", width: "40vw", maxWidth: 200, opacity: 0.55 }} />
    </>
  );
}

/* ─── PRIMITIVE COMPONENTS ─────────────────────────────────────────────────── */

const GoldDivider = () => (
  <div style={{
    height: 1,
    background: `linear-gradient(90deg, transparent, ${T.rim3}, transparent)`,
    margin: "2px 0",
  }} />
);

function Card({ children, style = {}, className = "" }) {
  return (
    <div
      className={className}
      style={{
        background: `linear-gradient(160deg, ${T.surface2} 0%, ${T.surface} 100%)`,
        border: `1px solid ${T.rim}`,
        borderRadius: 16,
        padding: "20px 18px",
        boxShadow: T.shadowCard,
        position: "relative",
        overflow: "hidden",
        ...style,
      }}
    >
      {/* Subtle inner top highlight */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.04), transparent)",
        pointerEvents: "none",
      }} />
      {children}
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, badge, color, masked }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      className="metric-card"
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        background: hov
          ? `linear-gradient(145deg, ${T.surface3} 0%, ${T.surface} 100%)`
          : `linear-gradient(145deg, ${T.surface2} 0%, ${T.surface} 100%)`,
        border: `1px solid ${hov ? T.rim2 : T.rim}`,
        borderRadius: 16,
        padding: "18px 16px",
        boxShadow: hov ? `${T.shadowCard}, ${T.shadowGold}` : T.shadowCard,
        transition: "all 0.35s ease",
        cursor: "default",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 1,
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)",
      }} />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `${color}14`,
          border: `1px solid ${color}28`,
          display: "grid", placeItems: "center",
          boxShadow: `0 4px 16px ${color}18`,
        }}>
          <Icon size={16} color={color} />
        </div>
        <span style={{
          fontSize: 10, fontWeight: 700,
          color: T.green,
          background: T.greenDim,
          border: `1px solid rgba(0,255,136,0.2)`,
          borderRadius: 20, padding: "3px 9px",
          letterSpacing: "0.06em",
          fontFamily: "Inter",
        }}>{badge}</span>
      </div>
      <div style={{
        fontSize: 10, color: T.text3,
        textTransform: "uppercase", letterSpacing: "0.12em",
        fontFamily: "Inter", fontWeight: 600,
        marginBottom: 6,
        textShadow: "0 2px 4px rgba(0,0,0,0.5)",
      }}>{label}</div>
      <div style={{
        fontSize: 26, fontWeight: 900,
        fontFamily: "Inter",
        letterSpacing: "-0.02em",
        lineHeight: 1,
        ...GOLD_TEXT,
        textShadow: undefined,
        filter: masked ? "blur(8px)" : "none",
        transition: "filter 0.3s",
        userSelect: masked ? "none" : "auto",
      }}>{value}</div>
    </div>
  );
}

function Btn({ children, onClick, variant = "gold", loading = false, disabled = false, style = {} }) {
  const [hov, setHov] = useState(false);
  const base = {
    border: "none", borderRadius: 12,
    padding: "13px 18px",
    fontWeight: 700, fontSize: 13,
    cursor: disabled || loading ? "not-allowed" : "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 8, transition: "all .22s ease",
    letterSpacing: "0.06em", outline: "none",
    fontFamily: "Inter",
    textShadow: "0 2px 4px rgba(0,0,0,0.5)",
    position: "relative", overflow: "hidden",
  };
  const variants = {
    gold: {
      background: hov
        ? `linear-gradient(135deg, #D4A843, #FCF6BA, #C09B35, #FBF5B7, #B8861A)`
        : GOLD_GRADIENT,
      color: "#000",
      boxShadow: hov ? "0 8px 32px rgba(191,149,63,0.4), 0 2px 8px rgba(0,0,0,0.6)" : "0 4px 20px rgba(191,149,63,0.25), 0 2px 8px rgba(0,0,0,0.6)",
      transform: hov ? "translateY(-1px)" : "translateY(0)",
    },
    outline: {
      background: hov ? "rgba(191,149,63,0.08)" : "transparent",
      color: T.goldSolid,
      border: `1px solid ${hov ? T.rim3 : T.rim2}`,
      boxShadow: hov ? T.shadowGold : "none",
      transform: hov ? "translateY(-1px)" : "translateY(0)",
    },
    ghost: {
      background: hov ? T.surface4 : T.surface3,
      color: T.text3,
      border: `1px solid ${T.rim}`,
    },
    danger: {
      background: hov ? "rgba(255,59,59,0.12)" : T.surface3,
      color: T.red,
      border: `1px solid rgba(255,59,59,0.2)`,
    },
    white: {
      background: hov ? "#e8e0d0" : "#F5EFE0",
      color: "#000",
      boxShadow: hov ? "0 8px 32px rgba(245,239,224,0.3)" : "0 4px 16px rgba(245,239,224,0.15)",
      transform: hov ? "translateY(-1px)" : "translateY(0)",
    },
  };
  return (
    <button
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={!disabled && !loading ? onClick : undefined}
      style={{ ...base, ...variants[variant], opacity: loading || disabled ? 0.6 : 1, ...style }}
    >
      {loading ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Processing…</> : children}
    </button>
  );
}

function StatusDot({ live = true }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{
        width: 7, height: 7, borderRadius: "50%",
        background: live ? T.green : T.red,
        boxShadow: live ? `0 0 8px ${T.green}` : `0 0 8px ${T.red}`,
        display: "inline-block",
        animation: "pulse 1.8s ease-in-out infinite",
      }} />
      <span style={{
        fontSize: 9, fontWeight: 700, color: live ? T.green : T.red,
        letterSpacing: "0.14em", fontFamily: "Inter",
        textShadow: live ? `0 0 8px ${T.green}` : "none",
      }}>LIVE</span>
    </div>
  );
}

/* ─── AUTH MODAL ───────────────────────────────────────────────────────────── */
function AuthModal({ onClose, initialMode = "signup" }) {
  const { login } = useAuth();
  const [authMode, setAuthMode] = useState(initialMode);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const handle = () => {
    if (authMode === "signup" && !agreed) { setError("Please confirm you are 18+ and agree to the Terms."); return; }
    if (!form.email) { setError("Email is required."); return; }
    setLoading(true);
    setTimeout(() => {
      login({ name: form.name || form.email.split("@")[0], email: form.email });
      setLoading(false);
      onClose();
    }, 1200);
  };

  const inp = {
    width: "100%", background: T.surface3,
    border: `1px solid ${T.rim}`,
    borderRadius: 11, padding: "13px 14px",
    color: T.text, fontSize: 13,
    outline: "none", fontFamily: "Inter",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.92)", backdropFilter: "blur(20px)",
      zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
    }}>
      <div style={{
        background: `linear-gradient(160deg, ${T.surface2}, ${T.surface})`,
        border: `1px solid ${T.rim2}`,
        borderRadius: 20, padding: "32px 26px 26px",
        width: "100%", maxWidth: 420,
        boxShadow: T.shadowDeep,
        position: "relative",
      }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: T.surface3, border: `1px solid ${T.rim}`, borderRadius: 8, width: 32, height: 32, display: "grid", placeItems: "center", cursor: "pointer", color: T.text3 }}>
          <X size={15} />
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: GOLD_GRADIENT, display: "grid", placeItems: "center", boxShadow: "0 4px 20px rgba(191,149,63,0.4)" }}>
            <Zap size={20} color="#000" fill="#000" />
          </div>
          <div>
            <div style={{ fontFamily: "Playfair Display", fontWeight: 900, fontSize: 14, letterSpacing: "0.08em", ...GOLD_TEXT }}>GOLDEN VAULT XM</div>
            <div style={{ fontSize: 9, color: T.text3, letterSpacing: "0.2em", marginTop: 2, fontFamily: "Inter" }}>ELITE TRADING TERMINAL</div>
          </div>
        </div>

        <div style={{ fontFamily: "Playfair Display", fontWeight: 900, fontSize: 26, color: T.text, marginBottom: 6, textShadow: "0 2px 4px rgba(0,0,0,0.5)", letterSpacing: "0.02em" }}>
          {authMode === "signup" ? "Create Account" : "Welcome Back"}
        </div>
        <div style={{ fontSize: 13, color: T.text3, marginBottom: 24, fontFamily: "Inter" }}>
          {authMode === "signup" ? "Join institutional traders worldwide." : "Sign in to your trading dashboard."}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {authMode === "signup" && (
            <input placeholder="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp} />
          )}
          <input placeholder="Email address" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inp} />
          <div style={{ position: "relative" }}>
            <input placeholder="Password" type={showPw ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} onKeyDown={e => e.key === "Enter" && handle()} style={{ ...inp, paddingRight: 46 }} />
            <button onClick={() => setShowPw(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: T.text3 }}>
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {authMode === "signup" && (
          <div onClick={() => setAgreed(a => !a)} style={{
            display: "flex", alignItems: "flex-start", gap: 11,
            marginTop: 14, padding: "13px 14px",
            background: T.surface3,
            border: `1px solid ${agreed ? T.rim3 : T.rim}`,
            borderRadius: 12, cursor: "pointer", transition: "border-color .2s",
          }}>
            <div style={{
              width: 18, height: 18, borderRadius: 5,
              border: `2px solid ${agreed ? T.goldSolid : T.text3}`,
              background: agreed ? GOLD_GRADIENT : "transparent",
              display: "grid", placeItems: "center",
              flexShrink: 0, marginTop: 1, transition: "all .15s",
            }}>
              {agreed && <CheckCircle2 size={11} color="#000" strokeWidth={3} />}
            </div>
            <span style={{ fontSize: 12, color: T.text2, lineHeight: 1.6, fontFamily: "Inter" }}>
              I confirm I am <strong style={{ color: T.text }}>18 years or older</strong> and agree to the{" "}
              <span style={{ ...GOLD_TEXT, fontWeight: 700 }}>Terms of Service</span> and{" "}
              <span style={{ ...GOLD_TEXT, fontWeight: 700 }}>Privacy Policy</span>.
            </span>
          </div>
        )}

        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: "10px 12px", background: "rgba(255,59,59,0.08)", border: "1px solid rgba(255,59,59,0.2)", borderRadius: 9 }}>
            <AlertCircle size={13} color={T.red} />
            <span style={{ fontSize: 12, color: T.red, fontFamily: "Inter" }}>{error}</span>
          </div>
        )}

        <Btn variant="gold" onClick={handle} loading={loading} disabled={authMode === "signup" && !agreed} style={{ width: "100%", marginTop: 18 }}>
          {authMode === "signup" ? <><UserPlus size={16} /> Create Account</> : <><LogIn size={16} /> Sign In</>}
        </Btn>

        <div style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: T.text3, fontFamily: "Inter" }}>
          {authMode === "signup" ? "Already have an account? " : "No account? "}
          <button onClick={() => { setAuthMode(m => m === "signup" ? "login" : "signup"); setError(""); setAgreed(false); }} style={{ background: "none", border: "none", cursor: "pointer", fontWeight: 800, fontSize: 12, fontFamily: "Inter", ...GOLD_TEXT }}>
            {authMode === "signup" ? "Sign In" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── NAV ───────────────────────────────────────────────────────────────────── */
function Nav({ page, setPage, open, setOpen }) {
  const { isAuthenticated, logout, requireAuth } = useAuth();
  const NAV_ITEMS = [
    { id: "home",     label: "Home",     icon: Home },
    { id: "markets",  label: "Markets",  icon: BarChart2 },
    { id: "trade",    label: "Trade",    icon: TrendingUp },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 100,
      background: "rgba(0,0,0,0.92)",
      backdropFilter: "blur(24px)",
      borderBottom: `1px solid ${T.rim}`,
      padding: "0 18px",
      height: 62,
      display: "flex", alignItems: "center", justifyContent: "space-between",
      boxShadow: "0 4px 32px rgba(0,0,0,0.8)",
    }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: GOLD_GRADIENT,
          display: "grid", placeItems: "center",
          boxShadow: "0 4px 20px rgba(191,149,63,0.35)",
          flexShrink: 0,
        }}>
          <Zap size={18} color="#000" fill="#000" />
        </div>
        <div>
          <div style={{
            fontFamily: "Playfair Display", fontWeight: 900,
            fontSize: 15, letterSpacing: "0.06em",
            ...GOLD_TEXT, textShadow: undefined,
          }}>GOLDEN VAULT <span style={{ color: T.red, WebkitTextFillColor: T.red, background: "none", fontFamily: "Inter", fontWeight: 900, fontSize: 15 }}>XM</span></div>
          <div style={{ fontSize: 8, color: T.text3, letterSpacing: "0.22em", fontFamily: "Inter" }}>INSTITUTIONAL TRADING</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
        <StatusDot />
        <div style={{ width: 1, height: 20, background: T.rim, margin: "0 8px" }} />
        <button onClick={() => setOpen(!open)} style={{
          background: open ? T.surface4 : "none",
          border: open ? `1px solid ${T.rim2}` : "none",
          borderRadius: 9, cursor: "pointer",
          color: T.text2, padding: 8,
          transition: "all .2s",
        }}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Drawer */}
      {open && (
        <div style={{
          position: "fixed", top: 62, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.97)",
          backdropFilter: "blur(24px)",
          zIndex: 200, padding: "24px 20px 40px",
          display: "flex", flexDirection: "column", gap: 4,
          overflowY: "auto",
          borderTop: `1px solid ${T.rim}`,
        }}>
          {NAV_ITEMS.map(n => (
            <button key={n.id} onClick={() => { if (n.id === "trade" && !requireAuth()) return; setPage(n.id); setOpen(false); }}
              style={{
                display: "flex", alignItems: "center", gap: 16,
                padding: "16px 16px",
                background: page === n.id ? `linear-gradient(90deg, ${T.goldGlow}, transparent)` : "none",
                border: "none",
                borderLeft: `2px solid ${page === n.id ? T.goldSolid : "transparent"}`,
                borderRadius: "0 12px 12px 0",
                cursor: "pointer",
                transition: "all .2s",
              }}>
              <n.icon size={18} color={page === n.id ? T.goldSolid : T.text3} />
              <span style={{
                fontSize: 17, fontWeight: 800,
                fontFamily: "Playfair Display",
                color: page === n.id ? T.text : T.text3,
                letterSpacing: "0.04em",
              }}>{n.label}</span>
            </button>
          ))}

          <div style={{ marginTop: "auto", paddingTop: 20 }}>
            <GoldDivider />
            {isAuthenticated
              ? <button onClick={() => { logout(); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 14px", background: "none", border: "none", cursor: "pointer", width: "100%" }}>
                  <LogOut size={18} color={T.red} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: T.red, fontFamily: "Inter" }}>Sign Out</span>
                </button>
              : <button onClick={() => { requireAuth("signup"); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 14px", background: "none", border: "none", cursor: "pointer", width: "100%" }}>
                  <UserPlus size={18} color={T.goldSolid} />
                  <span style={{ fontSize: 14, fontWeight: 700, fontFamily: "Inter", ...GOLD_TEXT }}>Sign Up / Login</span>
                </button>
            }
          </div>
        </div>
      )}
    </header>
  );
}

/* ─── BOTTOM NAV ───────────────────────────────────────────────────────────── */
function BottomNav({ page, setPage }) {
  const { isAuthenticated, requireAuth } = useAuth();
  const TABS = [
    { id: "home",     icon: Home,      label: "Home" },
    { id: "markets",  icon: BarChart2, label: "Markets" },
    { id: "trade",    icon: Zap,       label: "Trade" },
    { id: "settings", icon: Settings,  label: "More" },
  ];
  return (
    <nav style={{
      position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)",
      width: "100%", maxWidth: 600,
      background: "rgba(0,0,0,0.96)",
      backdropFilter: "blur(20px)",
      borderTop: `1px solid ${T.rim}`,
      display: "flex", padding: "10px 0 22px", zIndex: 50,
      boxShadow: "0 -8px 32px rgba(0,0,0,0.8)",
    }}>
      {TABS.map(t => {
        const active = page === t.id;
        const locked = t.id === "trade" && !isAuthenticated;
        return (
          <button key={t.id}
            onClick={() => { if (locked) { requireAuth("signup"); return; } setPage(t.id); }}
            style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", gap: 4,
              background: "none", border: "none", cursor: "pointer", padding: "4px 0",
            }}>
            <div style={{
              width: active ? 38 : 30, height: active ? 38 : 30,
              borderRadius: active ? 11 : 8,
              background: active ? T.goldGlow : "transparent",
              border: active ? `1px solid ${T.rim2}` : "none",
              display: "grid", placeItems: "center",
              transition: "all .22s ease",
              boxShadow: active ? T.shadowGold : "none",
            }}>
              <t.icon size={18} color={active ? T.goldSolid : T.text4} />
            </div>
            <span style={{
              fontSize: 9, fontWeight: 800,
              color: active ? T.goldSolid : T.text4,
              letterSpacing: "0.06em",
              fontFamily: "Inter",
              textShadow: active ? `0 0 8px ${T.goldSolid}40` : "none",
            }}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ─── HOME PAGE ─────────────────────────────────────────────────────────────── */
function HomePage({ setPage }) {
  const { requireAuth } = useAuth();
  const chartData = Array.from({ length: 40 }, (_, i) => ({
    i, v: 4680 + Math.sin(i * 0.4) * 40 + i * 1.2 + (Math.random() - 0.5) * 15,
  }));
  const STATS = [
    { val: "$2.4B+", label: "Daily Volume" },
    { val: "150K+",  label: "Active Traders" },
    { val: "200+",   label: "Pairs" },
    { val: "24/7",   label: "Support" },
  ];
  const FEATURES = [
    { icon: TrendingUp, title: "Advanced Trading",     desc: "Institutional-grade tools and real-time analytics" },
    { icon: Shield,     title: "Bank-Level Security",  desc: "Multi-layer encryption and cold storage protection" },
    { icon: Zap,        title: "Lightning Execution",  desc: "Sub-millisecond order routing across deep liquidity" },
    { icon: Globe,      title: "Global Access",        desc: "Trade 24/7 across forex, crypto, and commodities" },
  ];
  const handleCTA = () => { if (requireAuth("signup")) setPage("trade"); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Hero */}
      <div style={{
        background: `linear-gradient(160deg, #0d0800 0%, #050300 50%, ${T.void} 100%)`,
        borderRadius: 18,
        border: `1px solid ${T.rim}`,
        padding: "32px 22px",
        position: "relative", overflow: "hidden",
        boxShadow: `${T.shadowCard}, ${T.shadowGold}`,
      }}>
        <div style={{
          position: "absolute", top: -30, right: -30, width: 180, height: 180,
          background: `radial-gradient(${T.goldGlow}, transparent 70%)`,
          borderRadius: "50%", pointerEvents: "none",
        }} />
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 1,
          background: `linear-gradient(90deg, transparent, ${T.rim3}, transparent)`,
        }} />

        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
          <StatusDot />
          <span style={{ fontSize: 10, color: T.text3, letterSpacing: "0.12em", fontFamily: "Inter" }}>SYSTEM ONLINE // LIVE DATA</span>
        </div>

        <div style={{ marginBottom: 22 }}>
          <div style={{ fontFamily: "Playfair Display", fontWeight: 900, fontSize: 46, lineHeight: 1.0, letterSpacing: "0.02em", textShadow: "0 4px 16px rgba(0,0,0,0.8)" }}>
            <div style={{ color: T.text }}>PRECISION</div>
            <div style={{ ...GOLD_TEXT }}>VELOCITY</div>
            <div style={{ color: T.text }}>INSIGHT.</div>
          </div>
        </div>

        <div style={{
          borderLeft: `2px solid ${T.goldSolid}`,
          paddingLeft: 16, fontSize: 13,
          color: T.text2, lineHeight: 1.75,
          marginBottom: 24,
          fontFamily: "Inter",
          textShadow: "0 2px 4px rgba(0,0,0,0.5)",
        }}>
          Institutional-grade trading infrastructure engineered for precision, performance, and global market reach.
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Btn variant="white" onClick={handleCTA} style={{ width: "100%", fontFamily: "Inter", letterSpacing: "0.1em", fontSize: 13 }}>
            INITIALIZE TRADING
          </Btn>
          <Btn variant="outline" onClick={handleCTA} style={{ width: "100%" }}>
            EXPLORE MARKETS <ChevronRight size={15} />
          </Btn>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{
        background: `linear-gradient(135deg, #0d0800, #080500)`,
        border: `1px solid ${T.rim}`,
        borderRadius: 14,
        display: "grid", gridTemplateColumns: "repeat(4, 1fr)",
        padding: "16px 8px",
        boxShadow: T.shadowCard,
      }}>
        {STATS.map(s => (
          <div key={s.label} style={{ textAlign: "center" }}>
            <div style={{
              fontFamily: "Playfair Display", fontWeight: 900,
              fontSize: 16, ...GOLD_TEXT,
              textShadow: undefined,
            }}>{s.val}</div>
            <div style={{
              fontSize: 8, color: T.text3,
              textTransform: "uppercase", letterSpacing: "0.1em",
              marginTop: 3, fontFamily: "Inter",
            }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Live Chart */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: "Playfair Display", fontWeight: 700, fontSize: 15, color: T.text, letterSpacing: "0.02em" }}>S&P 500 Overview</div>
            <div style={{ fontSize: 10, color: T.text3, marginTop: 2, fontFamily: "Inter" }}>Simulated real-time feed</div>
          </div>
          <StatusDot />
        </div>
        <ResponsiveContainer width="100%" height={130}>
          <AreaChart data={chartData} margin={{ left: -30, right: 0, top: 4, bottom: 0 }}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={T.goldSolid} stopOpacity={0.3} />
                <stop offset="100%" stopColor={T.goldSolid} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="i" hide />
            <YAxis domain={["dataMin - 20", "dataMax + 20"]} />
            <Tooltip
              contentStyle={{ background: T.surface3, border: `1px solid ${T.rim2}`, borderRadius: 9, fontSize: 11, fontFamily: "Inter", boxShadow: T.shadowCard }}
              formatter={v => [v.toFixed(2), "Price"]} labelFormatter={() => ""}
            />
            <ReferenceLine y={4700} stroke={T.green} strokeDasharray="3 3" strokeWidth={1} opacity={0.4} />
            <Area type="monotone" dataKey="v" stroke={T.goldSolid} strokeWidth={2} fill="url(#areaGrad)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Features */}
      <Card>
        <div style={{ fontFamily: "Playfair Display", fontWeight: 900, fontSize: 20, color: T.text, marginBottom: 6, letterSpacing: "0.02em", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
          Enterprise-Grade <span style={{ ...GOLD_TEXT }}>Infrastructure</span>
        </div>
        <div style={{ fontSize: 12, color: T.text3, marginBottom: 16, lineHeight: 1.6, fontFamily: "Inter" }}>
          Engineered for unmatched performance, security, and reliability.
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FEATURES.map((f, i) => (
            <div key={i} style={{
              background: T.surface3,
              border: `1px solid ${T.rim}`,
              borderRadius: 13, padding: "14px",
              display: "flex", alignItems: "flex-start", gap: 14,
              transition: "border-color .2s",
            }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: T.goldGlow,
                border: `1px solid ${T.rim2}`,
                display: "grid", placeItems: "center", flexShrink: 0,
              }}>
                <f.icon size={16} color={T.goldSolid} />
              </div>
              <div>
                <div style={{ fontFamily: "Playfair Display", fontWeight: 700, fontSize: 13, color: T.text, marginBottom: 4 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: T.text3, lineHeight: 1.5, fontFamily: "Inter" }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <Btn variant="gold" onClick={handleCTA} style={{ width: "100%", marginTop: 16 }}>
          BEGIN TRADING <ChevronRight size={15} />
        </Btn>
      </Card>
    </div>
  );
}

/* ─── MARKETS PAGE ──────────────────────────────────────────────────────────── */
function MarketsPage({ prices, flash }) {
  const [search, setSearch] = useState("");
  const cats = ["All", "Crypto", "Forex", "Stocks", "Indices", "Commodities"];
  const [cat, setCat] = useState("All");
  const catColor = c => ({ Crypto: T.goldSolid, Forex: T.blue, Stocks: T.green, Indices: "#a78bfa", Commodities: T.goldSolid, Futures: T.red, Bonds: "#94a3b8" }[c] || T.text3);

  const filtered = INSTRUMENTS.filter(d =>
    (cat === "All" || d.cat === cat) &&
    (!search || d.pair.toLowerCase().includes(search.toLowerCase()) || d.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ padding: "20px 0 4px" }}>
        <div style={{ fontFamily: "Playfair Display", fontWeight: 900, fontSize: 30, lineHeight: 1.1, letterSpacing: "0.02em", textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>
          <span style={{ color: T.text }}>Global Trading </span>
          <span style={{ ...GOLD_TEXT }}>Markets</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
          <div style={{ fontSize: 12, color: T.text3, fontFamily: "Inter" }}>{INSTRUMENTS.length} live instruments</div>
          <StatusDot />
        </div>
      </div>

      {/* Search */}
      <div style={{ position: "relative" }}>
        <Search size={14} color={T.text3} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
        <input
          placeholder="Search symbol or name…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width: "100%", background: T.surface2,
            border: `1px solid ${T.rim}`,
            borderRadius: 11, padding: "12px 36px",
            color: T.text, fontSize: 13, outline: "none",
            fontFamily: "Inter", boxSizing: "border-box",
          }}
        />
      </div>

      {/* Category pills */}
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
        {cats.map(c => (
          <button key={c} onClick={() => setCat(c)} style={{
            flexShrink: 0, fontSize: 11, fontWeight: 700,
            padding: "6px 12px", borderRadius: 20,
            border: `1px solid ${c === cat ? T.rim3 : T.rim}`,
            cursor: "pointer", transition: "all .15s",
            background: c === cat ? T.goldGlow : T.surface3,
            color: c === cat ? T.goldSolid : T.text3,
            fontFamily: "Inter",
            boxShadow: c === cat ? T.shadowGold : "none",
          }}>{c}</button>
        ))}
      </div>

      {/* Market list */}
      <Card style={{ padding: "0 18px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: `1px solid ${T.rim}` }}>
          <span style={{ fontSize: 9, color: T.text3, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", fontFamily: "Inter" }}>{filtered.length} INSTRUMENTS</span>
          <div style={{ display: "flex", gap: 16 }}>
            <span style={{ fontSize: 9, color: T.text3, fontFamily: "Inter" }}>PRICE</span>
            <span style={{ fontSize: 9, color: T.text3, fontFamily: "Inter" }}>24H</span>
          </div>
        </div>
        {filtered.map((inst, i) => {
          const pd = prices[inst.pair];
          const flDir = flash[inst.pair];
          const col = catColor(inst.cat);
          return (
            <div key={inst.pair}
              className={flDir === "up" ? "price-flash-up" : flDir === "dn" ? "price-flash-dn" : ""}
              style={{ transition: "background .3s", borderRadius: 8 }}
            >
              <div style={{ display: "flex", alignItems: "center", padding: "13px 0" }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9, flexShrink: 0,
                  background: `${col}12`, border: `1px solid ${col}22`,
                  display: "grid", placeItems: "center", marginRight: 12,
                }}>
                  <span style={{ fontSize: 8, fontWeight: 900, color: col, textAlign: "center", lineHeight: 1.1, letterSpacing: "-0.02em", fontFamily: "Inter" }}>
                    {inst.pair.length > 6 ? inst.pair.slice(0, 5) : inst.pair}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: T.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "Inter" }}>{inst.pair}</div>
                  <div style={{ fontSize: 11, color: T.text3, marginTop: 2, fontFamily: "Inter" }}>{inst.name}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}>
                  <div style={{
                    fontWeight: 900, fontSize: 14, fontFamily: "Inter",
                    color: flDir === "up" ? T.green : flDir === "dn" ? T.red : T.text,
                    fontVariantNumeric: "tabular-nums", transition: "color .4s",
                    textShadow: flDir ? `0 0 8px ${flDir === "up" ? T.green : T.red}` : "none",
                  }}>{fmtPrice(pd?.price, inst.cat)}</div>
                  <div style={{
                    fontSize: 11, fontWeight: 700,
                    color: pd?.pct24h >= 0 ? T.green : T.red,
                    marginTop: 2, fontFamily: "Inter",
                  }}>
                    {pd?.pct24h >= 0 ? "↗" : "↘"} {fmtPct(pd?.pct24h)}
                  </div>
                </div>
              </div>
              {i < filtered.length - 1 && <GoldDivider />}
            </div>
          );
        })}
      </Card>
    </div>
  );
}

/* ─── TRADE PAGE ────────────────────────────────────────────────────────────── */
function TradePage({ prices }) {
  const { user } = useAuth();
  const [isMasked, setIsMasked] = useState(true);
  const [range, setRange] = useState("30D");
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [loadingDep, setLoadingDep] = useState(false);

  // Mock data
  const balance          = 284750.00;
  const totalProfit      = 47320.50;
  const activePositions  = 8;
  const winRate          = 73.4;
  const totalInvested    = 237429.50;
  const currentValue     = 284750.00;

  const perfData = Array.from({ length: 30 }, (_, i) => ({
    day: i + 1,
    value: 3200 + Math.sin(i * 0.6) * 1800 + i * 180 + Math.random() * 400,
  }));
  const RANGES = ["7D", "30D", "3M", "1Y"];
  const topMarkets = ["BTC/USDT", "ETH/USDT", "EUR/USD", "XAU/USD"];

  const METRICS = [
    { icon: Wallet,   label: "Total Balance",     value: `$${balance.toLocaleString()}`,           badge: "+5.2%",  color: T.green },
    { icon: TrendingUp, label: "Total Profit",    value: `$${totalProfit.toLocaleString()}`,        badge: "+11.2%", color: T.green },
    { icon: Activity, label: "Active Positions",  value: `${activePositions}`,                      badge: "+3",     color: T.goldSolid },
    { icon: Target,   label: "Win Rate",          value: `${winRate.toFixed(1)}%`,                  badge: "+2.3%",  color: T.goldSolid },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "relative" }}>

      {/* Welcome */}
      <div style={{ padding: "20px 0 4px", position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 10, color: T.text3, letterSpacing: "0.14em", textTransform: "uppercase", marginBottom: 6, fontFamily: "Inter" }}>Trading Overview</div>
            <div style={{ fontFamily: "Playfair Display", fontWeight: 900, fontSize: 26, color: T.text, lineHeight: 1.1, textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>Welcome,</div>
            <div style={{ fontFamily: "Playfair Display", fontWeight: 900, fontStyle: "italic", fontSize: 26, lineHeight: 1.1, ...GOLD_TEXT }}>{user?.name || "Trader"}</div>
            <div style={{ fontSize: 12, color: T.purple, marginTop: 8, fontFamily: "Inter", fontStyle: "italic" }}>Your portfolio is performing well today</div>
          </div>
          <button
            onClick={() => setIsMasked(m => !m)}
            style={{
              background: isMasked ? T.goldGlow : T.surface3,
              border: `1px solid ${isMasked ? T.rim3 : T.rim}`,
              borderRadius: 10, padding: "9px 11px",
              cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
              marginTop: 4, transition: "all .2s",
              boxShadow: isMasked ? T.shadowGold : "none",
            }}
          >
            {isMasked ? <EyeOff size={13} color={T.goldSolid} /> : <Eye size={13} color={T.text} />}
            <span style={{ fontSize: 9, fontWeight: 800, fontFamily: "Inter", letterSpacing: "0.08em", color: isMasked ? T.goldSolid : T.text3 }}>
              {isMasked ? "HIDDEN" : "VISIBLE"}
            </span>
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {METRICS.map((m, i) => (
          <MetricCard key={i} {...m} masked={isMasked} />
        ))}
      </div>

      {/* Performance Chart */}
      <Card>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div>
            <div style={{ fontFamily: "Playfair Display", fontWeight: 700, fontSize: 16, color: T.text }}>Portfolio Performance</div>
            <div style={{ fontSize: 10, color: T.text3, marginTop: 2, fontFamily: "Inter" }}>Last {range} overview</div>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            {RANGES.map(r => (
              <button key={r} onClick={() => setRange(r)} style={{
                fontSize: 10, fontWeight: 700, padding: "4px 9px", borderRadius: 6,
                border: `1px solid ${r === range ? T.rim3 : T.rim}`,
                cursor: "pointer", fontFamily: "Inter",
                background: r === range ? T.goldGlow : T.surface3,
                color: r === range ? T.goldSolid : T.text3,
                transition: "all .15s",
              }}>{r}</button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={148}>
          <BarChart data={perfData} barSize={8} margin={{ left: -20, right: 0 }}>
            <XAxis dataKey="day" hide />
            <YAxis hide domain={["dataMin - 500", "dataMax + 200"]} />
            <Tooltip
              contentStyle={{ background: T.surface3, border: `1px solid ${T.rim2}`, borderRadius: 9, fontSize: 12, fontFamily: "Inter", boxShadow: T.shadowCard }}
              formatter={v => [`$${v.toFixed(0)}`, "Value"]}
              cursor={{ fill: `${T.goldSolid}08` }}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {perfData.map((e, i) => (
                <Cell key={i} fill={e.value > 7500 ? T.goldB : e.value > 5500 ? T.goldSolid : `${T.goldDim}cc`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.rim}` }}>
          <div>
            <div style={{ fontSize: 9, color: T.text3, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "Inter" }}>Total Invested</div>
            <div style={{
              fontFamily: "Playfair Display", fontWeight: 900, fontSize: 17, marginTop: 4,
              ...GOLD_TEXT,
              filter: isMasked ? "blur(8px)" : "none",
              transition: "filter 0.3s",
            }}>
              {isMasked ? "••••••" : `$${totalInvested.toLocaleString()}`}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 9, color: T.text3, textTransform: "uppercase", letterSpacing: "0.1em", fontFamily: "Inter" }}>Current Value</div>
            <div style={{
              fontFamily: "Playfair Display", fontWeight: 900, fontSize: 17, marginTop: 4, color: T.green,
              filter: isMasked ? "blur(8px)" : "none",
              transition: "filter 0.3s",
              textShadow: `0 0 16px ${T.green}40`,
            }}>
              {isMasked ? "••••••" : `$${currentValue.toLocaleString()}`}
            </div>
          </div>
        </div>
      </Card>

      {/* Live Markets */}
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
          <div style={{ fontFamily: "Playfair Display", fontWeight: 700, fontSize: 16, color: T.text }}>Live Markets</div>
          <StatusDot />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {topMarkets.map(pair => {
            const def = INSTRUMENTS.find(d => d.pair === pair);
            const pd = prices[pair];
            if (!def || !pd) return null;
            return (
              <div key={pair} style={{
                background: T.surface3,
                border: `1px solid ${T.rim}`,
                borderRadius: 12, padding: "13px 14px",
                transition: "border-color .2s",
              }}>
                <div style={{ fontSize: 9, color: T.text3, textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 4, fontFamily: "Inter" }}>{def.name}</div>
                <div style={{ fontWeight: 700, fontSize: 11, color: T.text2, marginBottom: 6, fontFamily: "Inter" }}>{pair}</div>
                <div style={{
                  fontFamily: "Inter", fontWeight: 900, fontSize: 16, marginBottom: 3,
                  fontVariantNumeric: "tabular-nums",
                  ...GOLD_TEXT,
                }}>{fmtPrice(pd.price, def.cat)}</div>
                <div style={{ fontSize: 11, fontWeight: 700, color: pd.pct24h >= 0 ? T.green : T.red, fontFamily: "Inter" }}>
                  {pd.pct24h >= 0 ? "↗" : "↘"} {fmtPct(pd.pct24h)}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      {/* Quick Actions */}
      <Card>
        <div style={{ fontFamily: "Playfair Display", fontWeight: 700, fontSize: 16, color: T.text, marginBottom: 14 }}>Quick Actions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Btn variant="gold" loading={loadingDep}
            onClick={() => { setLoadingDep(true); setTimeout(() => setLoadingDep(false), 1500); }}
            style={{ width: "100%", letterSpacing: "0.08em" }}>
            <ArrowDownToLine size={15} /> DEPOSIT FUNDS
          </Btn>
          <Btn variant="outline" style={{ width: "100%", letterSpacing: "0.08em" }}>
            <ArrowUpFromLine size={15} /> WITHDRAW FUNDS
          </Btn>
          <Btn variant="ghost" style={{ width: "100%", letterSpacing: "0.08em" }}>
            <FileBarChart size={15} /> VIEW REPORTS
          </Btn>
        </div>
      </Card>
    </div>
  );
}

/* ─── SETTINGS PAGE ─────────────────────────────────────────────────────────── */
function SettingsPage() {
  const { isAuthenticated, logout, requireAuth } = useAuth();
  const GROUPS = [
    { title: "Platform", items: [
      { icon: BarChart2,  label: "Markets",         sub: "View all trading pairs" },
      { icon: TrendingUp, label: "Trading",          sub: "Configure trading preferences" },
      { icon: BookOpen,   label: "Support Center",   sub: "Help and documentation" },
    ]},
    { title: "Account", items: [
      { icon: Eye,   label: "Dashboard",          sub: "Performance overview" },
      { icon: Lock,  label: "Security Settings",  sub: "2FA and login management" },
      { icon: Bell,  label: "Notifications",      sub: "Alerts and push settings" },
    ]},
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ padding: "20px 0 4px" }}>
        <div style={{ fontFamily: "Playfair Display", fontWeight: 900, fontSize: 28, color: T.text, textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}>Account</div>
      </div>

      {/* Brand card */}
      <Card style={{
        background: `linear-gradient(160deg, #0d0800, ${T.surface})`,
        border: `1px solid ${T.rim2}`,
        boxShadow: `${T.shadowCard}, ${T.shadowGold}`,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: GOLD_GRADIENT,
            display: "grid", placeItems: "center",
            boxShadow: "0 6px 24px rgba(191,149,63,0.4)",
          }}>
            <span style={{ fontFamily: "Playfair Display", fontWeight: 900, fontSize: 18, color: "#000" }}>GV</span>
          </div>
          <div>
            <div style={{ fontFamily: "Playfair Display", fontWeight: 900, fontSize: 17, letterSpacing: "0.04em", ...GOLD_TEXT }}>GOLDEN VAULT XM</div>
            <div style={{ fontSize: 9, color: T.text3, letterSpacing: "0.18em", marginTop: 3, fontFamily: "Inter" }}>INSTITUTIONAL CHAIN</div>
          </div>
        </div>
        <div style={{ fontSize: 13, color: T.text2, lineHeight: 1.75, marginBottom: 16, fontFamily: "Inter" }}>
          Enterprise-grade trading platform providing access to global financial markets with institutional-level security and performance.
        </div>
        <GoldDivider />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
          {[[Mail, "support@goldenvaultxm.com"], [Phone, "24/7 Trading Desk"], [MapPin, "Global Trading Hub"]].map(([Icon, val]) => (
            <div key={val} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Icon size={13} color={T.goldSolid} />
              <span style={{ fontSize: 12, color: T.text2, fontFamily: "Inter" }}>{val}</span>
            </div>
          ))}
        </div>
      </Card>

      {!isAuthenticated && (
        <Card style={{ border: `1px solid ${T.rim2}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: T.goldGlow, border: `1px solid ${T.rim2}`, display: "grid", placeItems: "center" }}>
              <Lock size={16} color={T.goldSolid} />
            </div>
            <div>
              <div style={{ fontFamily: "Playfair Display", fontWeight: 700, fontSize: 14, color: T.text }}>Unlock Full Access</div>
              <div style={{ fontSize: 12, color: T.text3, marginTop: 2, fontFamily: "Inter" }}>Sign up to access all features</div>
            </div>
          </div>
          <Btn variant="gold" onClick={() => requireAuth("signup")} style={{ width: "100%" }}>
            <UserPlus size={15} /> Create Free Account
          </Btn>
        </Card>
      )}

      {GROUPS.map(group => (
        <Card key={group.title} style={{ padding: "4px 0" }}>
          <div style={{ fontWeight: 700, fontSize: 10, color: T.text3, padding: "14px 18px 10px", textTransform: "uppercase", letterSpacing: "0.14em", fontFamily: "Inter" }}>
            {group.title}
          </div>
          {group.items.map((item, i) => (
            <div key={item.label}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 18px", cursor: "pointer" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 13 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 9, background: T.goldGlow, border: `1px solid ${T.rim}`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <item.icon size={14} color={T.goldSolid} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: T.text, fontFamily: "Playfair Display" }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: T.text3, marginTop: 1, fontFamily: "Inter" }}>{item.sub}</div>
                  </div>
                </div>
                <ChevronRight size={13} color={T.text4} />
              </div>
              {i < group.items.length - 1 && <div style={{ margin: "0 18px" }}><GoldDivider /></div>}
            </div>
          ))}
        </Card>
      ))}

      {isAuthenticated && (
        <Btn variant="danger" onClick={logout} style={{ width: "100%" }}>
          <LogOut size={16} /> Sign Out
        </Btn>
      )}
    </div>
  );
}

/* ─── APP SHELL ─────────────────────────────────────────────────────────────── */
function AppShell({ page, setPage }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, requireAuth } = useAuth();
  const { prices, flash } = useLivePrices();

  const handleSetPage = useCallback((p) => {
    if (p === "trade" && !isAuthenticated) { requireAuth("signup"); return; }
    setPage(p);
    setMenuOpen(false);
  }, [isAuthenticated, requireAuth, setPage]);

  const renderPage = () => {
    switch (page) {
      case "home":     return <HomePage setPage={handleSetPage} />;
      case "markets":  return <MarketsPage prices={prices} flash={flash} />;
      case "trade":    return <TradePage prices={prices} />;
      case "settings": return <SettingsPage />;
      default:         return <HomePage setPage={handleSetPage} />;
    }
  };

  return (
    <div className="scanline-overlay" style={{
      minHeight: "100vh",
      background: T.void,
      color: T.text,
      fontFamily: "'Inter', sans-serif",
      maxWidth: 600,
      margin: "0 auto",
      position: "relative",
    }}>
      <GlobalStyles />

      {/* Ambient glow */}
      <div style={{
        position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)",
        width: 500, height: 500,
        background: `radial-gradient(${T.goldGlow}, transparent 70%)`,
        borderRadius: "50%", pointerEvents: "none", zIndex: 0,
        animation: "goldPulse 6s ease-in-out infinite",
      }} />

      {/* Cinematic gear background */}
      <CinematicGears />

      <div style={{ position: "relative", zIndex: 1 }}>
        <Nav page={page} setPage={handleSetPage} open={menuOpen} setOpen={setMenuOpen} />
        <main style={{ padding: "0 16px 110px" }}>
          {renderPage()}
        </main>
        <BottomNav page={page} setPage={handleSetPage} />
      </div>
    </div>
  );
}

/* ─── ROOT ──────────────────────────────────────────────────────────────────── */
export default function GoldenVaultXM() {
  const [page, setPage] = useState("trade");
  return (
    <LayoutProvider>
      <AuthProvider>
        <AppShell page={page} setPage={setPage} />
      </AuthProvider>
    </LayoutProvider>
  );
}
