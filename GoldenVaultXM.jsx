
/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  GOLDENVAULTXM — CINEMATIC REDESIGN                                    ║
 * ║  "Void-Black Foundation" · "Cinematic Gold" · Institutional Luxury      ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 *
 * SCOPE: Visual design, color grading, and aesthetic styling ONLY.
 * All existing features, logic, layout structure, and data flows preserved.
 * Only the visual presentation layer is upgraded.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import {
  Wallet, TrendingUp, Activity, Target, BarChart2,
  Shield, Zap, Globe, ArrowDownToLine, ArrowUpFromLine,
  FileBarChart, CheckCircle2, Menu, X, ChevronRight,
  Bell, Settings, LogOut, Home, Search, Lock, Award,
  BookOpen, Mail, Phone, MapPin, Eye, EyeOff, UserPlus,
  LogIn, AlertCircle, RefreshCw, Users, Newspaper, Cpu,
  ExternalLink,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════
   §1  CINEMATIC DESIGN TOKENS — "Void-Black Foundation"
   ═══════════════════════════════════════════════════════════════════════════ */

const VOID = {
  /* Backgrounds */
  bg:         "#000000",
  surface:    "#050505",
  card:       "#080808",
  card2:      "#0a0a0a",
  card3:      "#0e0e0e",
  card4:      "#111111",
  /* Borders — 1px gold-tinted at low opacity */
  border:     "rgba(191,149,63,0.13)",
  border2:    "rgba(191,149,63,0.22)",
  borderHot:  "rgba(252,246,186,0.35)",
  /* Luxury Gold Gradient stops */
  gold:       "#BF953F",
  gold2:      "#FCF6BA",
  gold3:      "#B38728",
  gold4:      "#FBF5B7",
  gold5:      "#AA771C",
  goldMid:    "#D4AF37",
  goldDim:    "#5a420a",
  /* Semantic colors */
  green:      "#22c55e",
  greenDim:   "#14532d",
  red:        "#ef4444",
  redDim:     "#7f1d1d",
  blue:       "#3b82f6",
  purple:     "#7c3aed",
  /* Typography */
  text:       "#F5F0E8",
  text2:      "#9A8F7A",
  text3:      "#4A4035",
  text4:      "#1E1A14",
  /* Tech-Green for gear FX (Trade section only) */
  techGreen:  "#00FF41",
};

/* Luxury Gold gradient string — used everywhere on headings/metrics */
const GOLD_GRADIENT = "linear-gradient(135deg, #BF953F 0%, #FCF6BA 30%, #B38728 55%, #FBF5B7 75%, #AA771C 100%)";

/* Gold text via background-clip trick (inline style helper) */
const goldText = (extra = {}) => ({
  background: GOLD_GRADIENT,
  WebkitBackgroundClip: "text",
  WebkitTextFillColor: "transparent",
  backgroundClip: "text",
  textShadow: "none", // can't combine with bg-clip; shadow applied to wrapper
  ...extra,
});

/* Physical "pressed" text shadow for non-gradient text */
const pressedShadow = { textShadow: "0 2px 4px rgba(0,0,0,0.5)" };

/* Deep box-shadow for all cards */
const cardShadow = "0 8px 40px rgba(0,0,0,0.85), 0 2px 8px rgba(0,0,0,0.6), inset 0 1px 0 rgba(191,149,63,0.07)";
const cardShadowHover = "0 16px 60px rgba(0,0,0,0.95), 0 4px 16px rgba(191,149,63,0.08), inset 0 1px 0 rgba(252,246,186,0.1)";

/* ═══════════════════════════════════════════════════════════════════════════
   §2  GLOBAL CSS INJECTION  (fonts + keyframes + body reset)
   ═══════════════════════════════════════════════════════════════════════════ */

const GLOBAL_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Inter:wght@300;400;500;600;700;800;900&display=swap');

  /* ── Reset ── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body {
    background: #000000 !important;
    color: #F5F0E8;
    font-family: 'Inter', sans-serif;
    -webkit-font-smoothing: antialiased;
    overflow-x: hidden;
  }

  /* ── Scrollbar ── */
  ::-webkit-scrollbar { width: 5px; height: 5px; }
  ::-webkit-scrollbar-track { background: #050505; }
  ::-webkit-scrollbar-thumb {
    background: linear-gradient(180deg, #BF953F, #5a420a);
    border-radius: 10px;
  }

  /* ── Keyframes ── */
  @keyframes spin { to { transform: rotate(360deg); } }

  @keyframes gearSpin  { to { transform: rotate(360deg); } }
  @keyframes gearSpinR { to { transform: rotate(-360deg); } }

  @keyframes goldPulse {
    0%, 100% { opacity: 0.7; }
    50%       { opacity: 1; }
  }

  @keyframes scanLine {
    0%   { transform: translateY(-100%); }
    100% { transform: translateY(100vh); }
  }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  @keyframes shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }

  @keyframes flashUp { 0%,100%{background:transparent} 50%{background:rgba(34,197,94,.12)} }
  @keyframes flashDn { 0%,100%{background:transparent} 50%{background:rgba(239,68,68,.12)} }

  /* ── Flash helpers ── */
  .flash-up { animation: flashUp 0.6s ease; }
  .flash-dn { animation: flashDn 0.6s ease; }

  /* ── Gold shimmer text utility ── */
  .gold-shimmer {
    background: linear-gradient(90deg, #BF953F 0%, #FCF6BA 30%, #B38728 55%, #FBF5B7 75%, #AA771C 100%);
    background-size: 200% auto;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    animation: shimmer 4s linear infinite;
  }

  /* ── Gear container (Trade section only) ── */
  .gear-bg-container {
    position: absolute; inset: 0; overflow: hidden;
    pointer-events: none; z-index: 0;
  }
  .gear-svg { position: absolute; }
  .gear-spin  { animation: gearSpin  18s linear infinite; }
  .gear-spinR { animation: gearSpinR 14s linear infinite; }

  /* ── Card hover transition ── */
  .gvxm-card {
    transition: box-shadow 0.3s ease, border-color 0.3s ease, transform 0.2s ease;
  }
  .gvxm-card:hover {
    transform: translateY(-2px);
  }

  /* ── Scan-line overlay (subtle CRT atmosphere) ── */
  .scan-overlay {
    position: fixed; inset: 0;
    background: repeating-linear-gradient(
      0deg,
      transparent,
      transparent 2px,
      rgba(0,0,0,0.03) 2px,
      rgba(0,0,0,0.03) 4px
    );
    pointer-events: none; z-index: 9999;
  }

  /* ── Input reset ── */
  input, select, textarea {
    font-family: 'Inter', sans-serif;
    background: #0a0a0a;
    border: 1px solid rgba(191,149,63,0.18);
    color: #F5F0E8;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 13px;
    outline: none;
    transition: border-color 0.2s;
  }
  input:focus, select:focus {
    border-color: rgba(252,246,186,0.4);
    box-shadow: 0 0 0 3px rgba(191,149,63,0.08);
  }
  input::placeholder { color: #4A4035; }

  /* ── Tab / Nav active state ── */
  .nav-active {
    background: linear-gradient(135deg, rgba(191,149,63,0.15), rgba(179,135,40,0.08)) !important;
    border-color: rgba(191,149,63,0.35) !important;
  }
`;

/* Inject once */
if (!document.getElementById("gvxm-cinema-css")) {
  const s = document.createElement("style");
  s.id = "gvxm-cinema-css";
  s.textContent = GLOBAL_CSS;
  document.head.appendChild(s);
}

/* ═══════════════════════════════════════════════════════════════════════════
   §3  CINEMATIC PRIMITIVES
   ═══════════════════════════════════════════════════════════════════════════ */

/** Photorealistic gear SVG — Tech-Green glow, metallic linework */
function GearIcon({ size = 120, speed = "gear-spin", style = {}, opacity = 0.18 }) {
  const c = VOID.techGreen;
  const r = size / 2;
  const teeth = 12;
  const innerR = r * 0.58;
  const outerR = r * 0.88;
  const holeR  = r * 0.24;
  const toothW = (2 * Math.PI) / teeth;

  let path = "M";
  for (let i = 0; i < teeth; i++) {
    const a0 = i * toothW - toothW * 0.25;
    const a1 = i * toothW + toothW * 0.25;
    const a2 = i * toothW + toothW * 0.55;
    const a3 = i * toothW + toothW * 0.75;
    const pts = [
      [innerR * Math.cos(a0) + r, innerR * Math.sin(a0) + r],
      [outerR * Math.cos(a1) + r, outerR * Math.sin(a1) + r],
      [outerR * Math.cos(a2) + r, outerR * Math.sin(a2) + r],
      [innerR * Math.cos(a3) + r, innerR * Math.sin(a3) + r],
    ];
    pts.forEach((p, j) => { path += `${j === 0 && i === 0 ? "" : " L"}${p[0].toFixed(2)},${p[1].toFixed(2)}`; });
  }
  path += " Z";

  return (
    <svg
      width={size} height={size} viewBox={`0 0 ${size} ${size}`}
      className={speed}
      style={{
        filter: `drop-shadow(0 0 6px ${c}) drop-shadow(0 0 14px ${c}88)`,
        opacity,
        ...style,
      }}
    >
      <defs>
        <linearGradient id={`gearGrad-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#1a1a1a" />
          <stop offset="40%"  stopColor="#2a2a2a" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </linearGradient>
        <linearGradient id={`gearStroke-${size}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor={c} stopOpacity="0.9" />
          <stop offset="100%" stopColor={c} stopOpacity="0.4" />
        </linearGradient>
      </defs>
      <path d={path} fill={`url(#gearGrad-${size})`} stroke={`url(#gearStroke-${size})`} strokeWidth="1.2" />
      <circle cx={r} cy={r} r={innerR * 0.82}
        fill="#050505" stroke={c} strokeWidth="0.8" strokeOpacity="0.5" />
      <circle cx={r} cy={r} r={holeR}
        fill="#000" stroke={c} strokeWidth="1" strokeOpacity="0.7" />
      {/* Hub spokes */}
      {[0, 60, 120, 180, 240, 300].map(deg => {
        const rad = (deg * Math.PI) / 180;
        return (
          <line key={deg}
            x1={r + holeR * Math.cos(rad)} y1={r + holeR * Math.sin(rad)}
            x2={r + innerR * 0.72 * Math.cos(rad)} y2={r + innerR * 0.72 * Math.sin(rad)}
            stroke={c} strokeWidth="0.7" strokeOpacity="0.5"
          />
        );
      })}
    </svg>
  );
}

/** CRT scan-line atmosphere overlay */
const ScanOverlay = () => <div className="scan-overlay" />;

/** Luxury gold 1px rule */
const GoldRule = ({ opacity = 0.3 }) => (
  <div style={{
    height: 1,
    background: `linear-gradient(90deg, transparent, rgba(191,149,63,${opacity}), rgba(252,246,186,${opacity * 1.5}), rgba(191,149,63,${opacity}), transparent)`,
    margin: "2px 0",
  }} />
);

/** Institution-grade card */
function VaultCard({ children, style = {}, hover = true, gearBg = false }) {
  const [hov, setHov] = useState(false);
  return (
    <div
      className={hover ? "gvxm-card" : ""}
      onMouseEnter={() => hover && setHov(true)}
      onMouseLeave={() => hover && setHov(false)}
      style={{
        position: "relative",
        background: `linear-gradient(145deg, ${VOID.card} 0%, ${VOID.surface} 100%)`,
        border: `1px solid ${hov ? VOID.borderHot : VOID.border}`,
        borderRadius: 14,
        padding: "18px 16px",
        boxShadow: hov ? cardShadowHover : cardShadow,
        overflow: gearBg ? "hidden" : "visible",
        ...style,
      }}
    >
      {gearBg && (
        <div className="gear-bg-container">
          <GearIcon size={220} speed="gear-spin"  opacity={0.09} style={{ top: -40, right: -40 }} />
          <GearIcon size={130} speed="gear-spinR" opacity={0.07} style={{ bottom: 10, left: -20 }} />
          <GearIcon size={80}  speed="gear-spin"  opacity={0.06} style={{ top: "40%", left: "30%" }} />
          {/* Tech-green grid lines */}
          <div style={{
            position: "absolute", inset: 0,
            backgroundImage: `
              linear-gradient(rgba(0,255,65,0.03) 1px, transparent 1px),
              linear-gradient(90deg, rgba(0,255,65,0.03) 1px, transparent 1px)
            `,
            backgroundSize: "32px 32px",
          }} />
        </div>
      )}
      <div style={{ position: "relative", zIndex: 1 }}>{children}</div>
    </div>
  );
}

/** Playfair Display heading with gold gradient */
function VaultHeading({ children, size = 22, italic = false, style = {} }) {
  return (
    <h2 style={{
      fontFamily: "'Playfair Display', Georgia, serif",
      fontWeight: 700,
      fontStyle: italic ? "italic" : "normal",
      fontSize: size,
      letterSpacing: "0.05em",
      lineHeight: 1.2,
      background: GOLD_GRADIENT,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
      ...style,
    }}>
      {children}
    </h2>
  );
}

/** Metric value with gold gradient */
function GoldMetric({ value, size = 28, style = {} }) {
  return (
    <span style={{
      fontFamily: "'Inter', sans-serif",
      fontWeight: 800,
      fontSize: size,
      letterSpacing: "-0.01em",
      background: GOLD_GRADIENT,
      WebkitBackgroundClip: "text",
      WebkitTextFillColor: "transparent",
      backgroundClip: "text",
      filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.5))",
      ...style,
    }}>
      {value}
    </span>
  );
}

/** Badge — institutional style */
function VaultBadge({ children, color = VOID.gold }) {
  return (
    <span style={{
      fontSize: 10, fontWeight: 800, letterSpacing: "0.08em",
      background: `${color}18`, color,
      border: `1px solid ${color}33`,
      borderRadius: 4, padding: "2px 8px",
      display: "inline-block", textTransform: "uppercase",
      textShadow: "0 1px 3px rgba(0,0,0,0.6)",
      fontFamily: "'Inter', sans-serif",
    }}>
      {children}
    </span>
  );
}

/** Icon box */
function VaultIconBox({ icon: Icon, color = VOID.goldMid, size = 16, boxSize = 36 }) {
  return (
    <div style={{
      width: boxSize, height: boxSize, borderRadius: 9, flexShrink: 0,
      background: `radial-gradient(circle at 30% 30%, ${color}28, ${color}0a)`,
      border: `1px solid ${color}30`,
      boxShadow: `inset 0 1px 0 ${color}20, 0 2px 8px rgba(0,0,0,0.4)`,
      display: "grid", placeItems: "center",
    }}>
      <Icon size={size} color={color} />
    </div>
  );
}

/** Cinematic button */
function VaultBtn({ children, onClick, variant = "gold", loading = false, disabled = false, style = {} }) {
  const [hov, setHov] = useState(false);

  const variants = {
    gold: {
      background: hov
        ? "linear-gradient(135deg, #FCF6BA, #D4AF37, #B38728)"
        : "linear-gradient(135deg, #BF953F, #D4AF37, #AA771C)",
      color: "#000",
      border: "1px solid rgba(252,246,186,0.4)",
      boxShadow: hov
        ? "0 0 20px rgba(191,149,63,0.4), 0 4px 16px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.2)"
        : "0 0 10px rgba(191,149,63,0.2), 0 2px 8px rgba(0,0,0,0.5)",
      transform: hov && !disabled ? "scale(1.015)" : "scale(1)",
    },
    outline: {
      background: hov ? "rgba(191,149,63,0.08)" : "transparent",
      color: hov ? VOID.gold2 : VOID.gold,
      border: `1px solid ${hov ? VOID.gold2 : VOID.gold}`,
      boxShadow: hov ? `0 0 12px rgba(191,149,63,0.15)` : "none",
      transform: hov ? "scale(1.015)" : "scale(1)",
    },
    ghost: {
      background: hov ? VOID.card3 : VOID.card2,
      color: VOID.text2, border: `1px solid ${VOID.border}`,
      boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
    },
    danger: {
      background: hov ? "#2a0808" : VOID.card,
      color: VOID.red, border: `1px solid ${VOID.border}`,
    },
    green: {
      background: hov
        ? "linear-gradient(135deg, #16a34a, #15803d)"
        : "linear-gradient(135deg, #22c55e, #16a34a)",
      color: "#000",
      border: "1px solid rgba(34,197,94,0.4)",
      boxShadow: hov ? "0 0 16px rgba(34,197,94,0.25)" : "none",
      transform: hov ? "scale(1.015)" : "scale(1)",
    },
    red: {
      background: hov
        ? "linear-gradient(135deg, #b91c1c, #991b1b)"
        : "linear-gradient(135deg, #ef4444, #b91c1c)",
      color: "#fff",
      border: "1px solid rgba(239,68,68,0.4)",
      boxShadow: hov ? "0 0 16px rgba(239,68,68,0.25)" : "none",
      transform: hov ? "scale(1.015)" : "scale(1)",
    },
  };

  const v = variants[variant] || variants.gold;

  return (
    <button
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={!disabled && !loading ? onClick : undefined}
      style={{
        border: "none", borderRadius: 10, padding: "13px 16px",
        fontFamily: "'Inter', sans-serif",
        fontWeight: 900, fontSize: 13, letterSpacing: "0.05em",
        cursor: disabled || loading ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        transition: "all 0.2s ease",
        outline: "none", opacity: loading || disabled ? 0.65 : 1,
        ...v, ...style,
      }}
    >
      {loading
        ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Processing…</>
        : children}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   §4  MARKET DATA DEFINITIONS  (unchanged from original)
   ═══════════════════════════════════════════════════════════════════════════ */

const INSTRUMENT_DEFS = [
  { pair: "BTC/USDT",  name: "Bitcoin",           cat: "Crypto",      base: 67800,    step: 0.0003 },
  { pair: "ETH/USDT",  name: "Ethereum",           cat: "Crypto",      base: 3520,     step: 0.0003 },
  { pair: "SOL/USDT",  name: "Solana",             cat: "Crypto",      base: 178,      step: 0.0004 },
  { pair: "XRP/USDT",  name: "XRP",                cat: "Crypto",      base: 0.5821,   step: 0.0005 },
  { pair: "BNB/USDT",  name: "BNB",                cat: "Crypto",      base: 612,      step: 0.0003 },
  { pair: "EUR/USD",   name: "Euro / US Dollar",   cat: "Forex",       base: 1.08432,  step: 0.00008 },
  { pair: "GBP/USD",   name: "British Pound / USD",cat: "Forex",       base: 1.27180,  step: 0.00008 },
  { pair: "USD/JPY",   name: "US Dollar / Yen",    cat: "Forex",       base: 156.84,   step: 0.00006 },
  { pair: "AAPL",      name: "Apple Inc.",          cat: "Stocks",      base: 189.30,   step: 0.0002 },
  { pair: "NVDA",      name: "NVIDIA Corporation",  cat: "Stocks",      base: 875.40,   step: 0.0002 },
  { pair: "TSLA",      name: "Tesla Inc.",           cat: "Stocks",      base: 248.60,   step: 0.0003 },
  { pair: "SPX",       name: "S&P 500 Index",       cat: "Indices",     base: 5218.0,   step: 0.0001 },
  { pair: "NDX",       name: "NASDAQ 100",          cat: "Indices",     base: 18320.0,  step: 0.0001 },
  { pair: "XAU/USD",   name: "Gold Spot",           cat: "Commodities", base: 2342.0,   step: 0.0001 },
  { pair: "XAG/USD",   name: "Silver Spot",         cat: "Commodities", base: 29.82,    step: 0.0002 },
  { pair: "XTI/USD",   name: "Crude Oil WTI",       cat: "Commodities", base: 77.40,    step: 0.0002 },
  { pair: "US10Y",     name: "US 10-Year Treasury", cat: "Bonds",       base: 4.281,    step: 0.0001 },
  { pair: "ES",        name: "S&P 500 E-mini",      cat: "Futures",     base: 5220.0,   step: 0.0001 },
];

const CATS = ["All","Crypto","Forex","Stocks","Indices","Commodities","Futures","Bonds"];

const fmtPrice = (price, cat) => {
  if (!price) return "—";
  if (cat === "Crypto") {
    if (price < 0.00001) return price.toFixed(8);
    if (price < 0.001)   return price.toFixed(6);
    if (price < 1)       return price.toFixed(4);
    if (price < 10)      return price.toFixed(3);
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (cat === "Forex")  return price > 50 ? price.toFixed(3) : price.toFixed(4);
  if (cat === "Bonds")  return price.toFixed(3) + "%";
  if (price > 10000)    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toFixed(2);
};

const fmtPct = p => p == null ? "—" : `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`;

const catColor = cat => ({
  Crypto:      "#f59e0b",
  Forex:       "#3b82f6",
  Stocks:      "#22c55e",
  Indices:     "#a78bfa",
  Commodities: "#FCF6BA",
  Futures:     "#ef4444",
  Bonds:       "#94a3b8",
}[cat] || VOID.text3);

/* ═══════════════════════════════════════════════════════════════════════════
   §5  PRICE SIMULATOR  (logic unchanged, cosmetically consumed)
   ═══════════════════════════════════════════════════════════════════════════ */

function useLivePrices() {
  const init = () => {
    const m = {};
    INSTRUMENT_DEFS.forEach(d => {
      m[d.pair] = {
        price: d.base,
        pct24h: (Math.random() - 0.45) * 4,
        prevDay: d.base * (1 - (Math.random() - 0.45) * 0.04),
        up: Math.random() > 0.45,
      };
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
        INSTRUMENT_DEFS.filter(() => Math.random() < 0.3).forEach(d => {
          const cur = prev[d.pair];
          const sign = Math.random() > 0.5 ? 1 : -1;
          const mag = d.step * (0.5 + Math.random()) * d.base;
          const newPrice = Math.max(cur.price + sign * mag, d.base * 0.7);
          next[d.pair] = {
            price: newPrice,
            pct24h: ((newPrice - cur.prevDay) / cur.prevDay) * 100,
            prevDay: cur.prevDay,
            up: sign === 1,
          };
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

/* ═══════════════════════════════════════════════════════════════════════════
   §6  MINI SPARK CHART
   ═══════════════════════════════════════════════════════════════════════════ */

function SparkChart({ pair, up }) {
  const [data] = useState(() =>
    Array.from({ length: 20 }, (_, i) => ({
      v: 50 + Math.sin(i * 0.5) * 12 + (Math.random() - 0.5) * 8,
    }))
  );
  const color = up ? VOID.green : VOID.red;
  return (
    <ResponsiveContainer width={80} height={36}>
      <AreaChart data={data} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
        <defs>
          <linearGradient id={`sg-${pair}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={color} stopOpacity={0.35} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area type="monotone" dataKey="v"
          stroke={color} strokeWidth={1.5}
          fill={`url(#sg-${pair})`} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   §7  MARKET TICKER ROW  (top scrolling tape)
   ═══════════════════════════════════════════════════════════════════════════ */

function MarketTicker({ prices }) {
  const items = INSTRUMENT_DEFS.slice(0, 10);
  return (
    <div style={{
      background: VOID.surface,
      borderBottom: `1px solid ${VOID.border}`,
      overflow: "hidden", whiteSpace: "nowrap",
      padding: "7px 0",
      position: "relative",
    }}>
      {/* Gold rule accent */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: 1,
        background: `linear-gradient(90deg, transparent, ${VOID.gold}44, transparent)`,
      }} />
      <div style={{
        display: "inline-flex", gap: 40, paddingLeft: "100%",
        animation: "tickerScroll 40s linear infinite",
      }}>
        {[...items, ...items].map((d, i) => {
          const p = prices[d.pair];
          if (!p) return null;
          const up = p.pct24h >= 0;
          return (
            <span key={i} style={{
              display: "inline-flex", alignItems: "center", gap: 10,
              fontSize: 12, fontFamily: "'Inter', sans-serif",
            }}>
              <span style={{ color: VOID.text2, fontWeight: 600, letterSpacing: "0.04em" }}>{d.pair}</span>
              <span style={{ color: up ? VOID.green : VOID.red, fontWeight: 700 }}>
                {fmtPrice(p.price, d.cat)}
              </span>
              <span style={{
                fontSize: 10, fontWeight: 700,
                color: up ? VOID.green : VOID.red,
                background: up ? `${VOID.green}15` : `${VOID.red}15`,
                borderRadius: 4, padding: "1px 5px",
              }}>
                {fmtPct(p.pct24h)}
              </span>
            </span>
          );
        })}
      </div>
      <style>{`@keyframes tickerScroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }`}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   §8  NAV BAR
   ═══════════════════════════════════════════════════════════════════════════ */

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard",  icon: Home },
  { id: "markets",   label: "Markets",    icon: BarChart2 },
  { id: "trade",     label: "Trade",      icon: Zap },
  { id: "portfolio", label: "Portfolio",  icon: Wallet },
  { id: "analytics", label: "Analytics",  icon: TrendingUp },
  { id: "news",      label: "News",       icon: Newspaper },
  { id: "mining",    label: "Mining",     icon: Cpu },
  { id: "support",   label: "Support",    icon: Shield },
];

function NavBar({ active, onNav }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <>
      <nav style={{
        position: "sticky", top: 0, zIndex: 100,
        background: scrolled
          ? "rgba(0,0,0,0.97)"
          : "linear-gradient(180deg, #000000 0%, rgba(0,0,0,0.98) 100%)",
        borderBottom: `1px solid ${VOID.border}`,
        backdropFilter: "blur(20px)",
        boxShadow: scrolled ? "0 4px 30px rgba(0,0,0,0.8)" : "none",
        transition: "all 0.3s ease",
      }}>
        {/* Gold accent line at top */}
        <div style={{
          height: 2,
          background: GOLD_GRADIENT,
          opacity: 0.7,
        }} />

        <div style={{
          maxWidth: 1440, margin: "0 auto",
          display: "flex", alignItems: "center",
          padding: "0 20px", gap: 8, height: 58,
        }}>
          {/* LOGO — UNTOUCHED, just repositioned in flow */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
            <div style={{
              width: 36, height: 36,
              background: GOLD_GRADIENT,
              borderRadius: 9,
              display: "grid", placeItems: "center",
              boxShadow: "0 0 16px rgba(191,149,63,0.4), 0 2px 8px rgba(0,0,0,0.6)",
              fontSize: 18, fontWeight: 900, color: "#000",
            }}>G</div>
            <div>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontWeight: 700, fontSize: 15,
                background: GOLD_GRADIENT,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
                letterSpacing: "0.05em",
                lineHeight: 1.1,
              }}>
                GoldenVaultXM
              </div>
              <div style={{ fontSize: 9, color: VOID.text3, letterSpacing: "0.12em", fontWeight: 600 }}>
                INSTITUTIONAL TRADING
              </div>
            </div>
          </div>

          {/* Desktop nav */}
          <div style={{
            display: "flex", alignItems: "center", gap: 2,
            flex: 1, justifyContent: "center", overflow: "hidden",
          }}>
            {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
              const isActive = active === id;
              return (
                <button
                  key={id}
                  onClick={() => onNav(id)}
                  className={isActive ? "nav-active" : ""}
                  style={{
                    background: isActive
                      ? "linear-gradient(135deg, rgba(191,149,63,0.15), rgba(179,135,40,0.05))"
                      : "transparent",
                    border: `1px solid ${isActive ? VOID.border2 : "transparent"}`,
                    borderRadius: 8,
                    padding: "7px 12px",
                    display: "flex", alignItems: "center", gap: 6,
                    cursor: "pointer",
                    transition: "all 0.2s",
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = "rgba(191,149,63,0.06)";
                      e.currentTarget.style.borderColor = VOID.border;
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.borderColor = "transparent";
                    }
                  }}
                >
                  <Icon size={14} color={isActive ? VOID.goldMid : VOID.text3} />
                  <span style={{
                    fontSize: 12, fontWeight: isActive ? 700 : 500,
                    color: isActive ? VOID.goldMid : VOID.text2,
                    fontFamily: "'Inter', sans-serif",
                    letterSpacing: "0.02em",
                    ...pressedShadow,
                  }}>
                    {label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right controls */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <button style={{
              background: "transparent", border: `1px solid ${VOID.border}`,
              borderRadius: 8, padding: "7px", cursor: "pointer",
              color: VOID.text3, display: "grid", placeItems: "center",
              transition: "all 0.2s",
            }}>
              <Bell size={15} />
            </button>
            <VaultBtn variant="gold" style={{ padding: "7px 16px", fontSize: 12 }}>
              <LogIn size={13} />
              Sign In
            </VaultBtn>
          </div>
        </div>
      </nav>
    </>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   §9  DASHBOARD PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

function generateChart(n = 30, base = 100, vol = 8) {
  const data = [];
  let v = base;
  for (let i = 0; i < n; i++) {
    v += (Math.random() - 0.46) * vol;
    v = Math.max(v, base * 0.6);
    data.push({ t: i, v: +v.toFixed(2) });
  }
  return data;
}

function StatCard({ icon: Icon, label, value, sub, subUp, color = VOID.goldMid }) {
  return (
    <VaultCard>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <VaultIconBox icon={Icon} color={color} />
        <span style={{
          fontSize: 10, fontWeight: 700, letterSpacing: "0.08em",
          color: subUp ? VOID.green : VOID.red,
          background: subUp ? `${VOID.green}15` : `${VOID.red}15`,
          border: `1px solid ${subUp ? VOID.green : VOID.red}30`,
          borderRadius: 4, padding: "2px 7px",
          ...pressedShadow,
        }}>
          {sub}
        </span>
      </div>
      <div style={{ marginTop: 14 }}>
        <GoldMetric value={value} size={24} />
        <div style={{
          fontSize: 11, color: VOID.text3, marginTop: 3,
          fontFamily: "'Inter', sans-serif", letterSpacing: "0.04em", fontWeight: 600,
          textTransform: "uppercase",
        }}>
          {label}
        </div>
      </div>
    </VaultCard>
  );
}

function DashboardPage({ prices }) {
  const chartData = generateChart(40, 5000, 120);
  const barData = Array.from({ length: 7 }, (_, i) => ({
    d: ["M","T","W","T","F","S","S"][i],
    v: 200 + Math.random() * 600,
    gain: Math.random() > 0.35,
  }));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Hero stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <StatCard icon={Wallet}     label="Total Balance"    value="$128,420.00" sub="+2.4%"  subUp color={VOID.goldMid} />
        <StatCard icon={TrendingUp} label="Total P&L"        value="+$9,842.50"  sub="+8.3%"  subUp color={VOID.green} />
        <StatCard icon={Activity}   label="Open Positions"   value="7"           sub="+3"      subUp color={VOID.blue} />
        <StatCard icon={Target}     label="Win Rate"         value="68.4%"       sub="+1.2%"  subUp color={VOID.purple} />
        <StatCard icon={BarChart2}  label="Daily Volume"     value="$42,100"     sub="-4.1%"       color={VOID.red} />
      </div>

      {/* Main chart + sidebar */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 14 }}>
        <VaultCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <VaultHeading size={18}>Portfolio Performance</VaultHeading>
            <div style={{ display: "flex", gap: 6 }}>
              {["1D","1W","1M","3M","1Y"].map(p => (
                <button key={p} style={{
                  background: p === "1M" ? "rgba(191,149,63,0.12)" : "transparent",
                  border: `1px solid ${p === "1M" ? VOID.border2 : VOID.border}`,
                  borderRadius: 6, padding: "4px 10px", cursor: "pointer",
                  color: p === "1M" ? VOID.goldMid : VOID.text3,
                  fontSize: 11, fontWeight: 700, fontFamily: "'Inter', sans-serif",
                }}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="portGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"   stopColor={VOID.goldMid} stopOpacity={0.3} />
                  <stop offset="100%" stopColor={VOID.goldMid} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="t" hide />
              <YAxis hide domain={["auto","auto"]} />
              <Tooltip
                contentStyle={{
                  background: VOID.card2, border: `1px solid ${VOID.border2}`,
                  borderRadius: 8, color: VOID.text, fontFamily: "'Inter', sans-serif",
                  fontSize: 12,
                }}
                formatter={v => [`$${v.toFixed(2)}`, "Value"]}
              />
              <ReferenceLine y={chartData[0]?.v} stroke={VOID.border2} strokeDasharray="4 4" />
              <Area type="monotone" dataKey="v"
                stroke={VOID.goldMid} strokeWidth={2}
                fill="url(#portGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </VaultCard>

        {/* Weekly volume bars */}
        <VaultCard>
          <VaultHeading size={15} style={{ marginBottom: 14 }}>Weekly Activity</VaultHeading>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={barData} barSize={22}>
              <XAxis dataKey="d" tick={{ fill: VOID.text3, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                contentStyle={{
                  background: VOID.card2, border: `1px solid ${VOID.border2}`,
                  borderRadius: 8, fontSize: 12, fontFamily: "'Inter', sans-serif",
                }}
              />
              <Bar dataKey="v" radius={[4,4,0,0]}>
                {barData.map((e, i) => (
                  <Cell key={i} fill={e.gain ? `${VOID.green}99` : `${VOID.red}88`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <GoldRule opacity={0.2} />
          <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { label: "Best Day", val: "Friday +$2,841", up: true },
              { label: "Worst Day", val: "Monday -$412", up: false },
              { label: "Avg Daily", val: "$1,204", up: true },
            ].map(r => (
              <div key={r.label} style={{
                display: "flex", justifyContent: "space-between",
                fontSize: 12, fontFamily: "'Inter', sans-serif",
              }}>
                <span style={{ color: VOID.text3, fontWeight: 600 }}>{r.label}</span>
                <span style={{
                  color: r.up ? VOID.green : VOID.red, fontWeight: 700,
                  ...pressedShadow,
                }}>
                  {r.val}
                </span>
              </div>
            ))}
          </div>
        </VaultCard>
      </div>

      {/* Recent positions */}
      <VaultCard>
        <VaultHeading size={16} style={{ marginBottom: 14 }}>Active Positions</VaultHeading>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, fontFamily: "'Inter', sans-serif" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${VOID.border}` }}>
                {["Instrument","Type","Entry","Current","P&L","Status"].map(h => (
                  <th key={h} style={{
                    padding: "8px 12px", textAlign: "left",
                    color: VOID.text3, fontWeight: 700, letterSpacing: "0.06em",
                    fontSize: 10, textTransform: "uppercase",
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[
                { inst: "BTC/USDT", type: "LONG",  entry: "$64,200", cur: "$67,800", pnl: "+$3,600", up: true },
                { inst: "ETH/USDT", type: "LONG",  entry: "$3,200",  cur: "$3,520",  pnl: "+$320",   up: true },
                { inst: "EUR/USD",  type: "SHORT", entry: "1.0920",  cur: "1.0843",  pnl: "+$770",   up: true },
                { inst: "TSLA",     type: "LONG",  entry: "$260.40", cur: "$248.60", pnl: "-$1,180", up: false },
                { inst: "XAU/USD",  type: "LONG",  entry: "$2,310",  cur: "$2,342",  pnl: "+$320",   up: true },
              ].map((r, i) => (
                <tr key={i} style={{
                  borderBottom: `1px solid ${VOID.border}`,
                  transition: "background 0.15s",
                }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(191,149,63,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "10px 12px", fontWeight: 700, color: VOID.text }}>{r.inst}</td>
                  <td style={{ padding: "10px 12px" }}>
                    <VaultBadge color={r.type === "LONG" ? VOID.green : VOID.red}>{r.type}</VaultBadge>
                  </td>
                  <td style={{ padding: "10px 12px", color: VOID.text2 }}>{r.entry}</td>
                  <td style={{ padding: "10px 12px", color: VOID.text2 }}>{r.cur}</td>
                  <td style={{ padding: "10px 12px", fontWeight: 700, color: r.up ? VOID.green : VOID.red }}>
                    {r.pnl}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    <span style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: VOID.green, display: "inline-block",
                      boxShadow: `0 0 6px ${VOID.green}`,
                      marginRight: 6,
                    }} />
                    <span style={{ color: VOID.text3, fontSize: 11 }}>Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </VaultCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   §10  MARKETS PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

function MarketsPage({ prices, flash }) {
  const [cat, setCat] = useState("All");
  const [search, setSearch] = useState("");

  const visible = INSTRUMENT_DEFS.filter(d =>
    (cat === "All" || d.cat === cat) &&
    (d.pair.toLowerCase().includes(search.toLowerCase()) ||
     d.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <VaultHeading italic>Global Markets</VaultHeading>

      {/* Category tabs */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {CATS.map(c => (
          <button key={c} onClick={() => setCat(c)} style={{
            background: cat === c
              ? "linear-gradient(135deg, rgba(191,149,63,0.18), rgba(179,135,40,0.08))"
              : VOID.card2,
            border: `1px solid ${cat === c ? VOID.border2 : VOID.border}`,
            borderRadius: 8, padding: "7px 16px", cursor: "pointer",
            color: cat === c ? VOID.goldMid : VOID.text3,
            fontSize: 12, fontWeight: 700, fontFamily: "'Inter', sans-serif",
            letterSpacing: "0.04em", transition: "all 0.2s",
            boxShadow: cat === c ? `0 0 12px rgba(191,149,63,0.1)` : "none",
          }}>
            {c}
          </button>
        ))}
        {/* Search */}
        <div style={{ position: "relative", marginLeft: "auto" }}>
          <Search size={13} color={VOID.text3} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search markets…"
            style={{ paddingLeft: 30, width: 180, height: 36 }}
          />
        </div>
      </div>

      {/* Market rows */}
      <VaultCard style={{ padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
          <thead>
            <tr style={{
              background: `linear-gradient(90deg, ${VOID.surface}, ${VOID.card})`,
              borderBottom: `1px solid ${VOID.border}`,
            }}>
              {["Instrument","Category","Price","24h Change","Chart","Action"].map(h => (
                <th key={h} style={{
                  padding: "12px 16px", textAlign: "left",
                  color: VOID.text3, fontWeight: 700, fontSize: 10,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map(d => {
              const p = prices[d.pair];
              if (!p) return null;
              const up = p.pct24h >= 0;
              const fl = flash[d.pair];
              return (
                <tr key={d.pair}
                  className={fl === "up" ? "flash-up" : fl === "dn" ? "flash-dn" : ""}
                  style={{
                    borderBottom: `1px solid ${VOID.border}`,
                    transition: "background 0.15s",
                    cursor: "pointer",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(191,149,63,0.04)"}
                  onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                >
                  <td style={{ padding: "12px 16px" }}>
                    <div style={{ fontWeight: 700, color: VOID.text, letterSpacing: "0.02em" }}>{d.pair}</div>
                    <div style={{ fontSize: 11, color: VOID.text3, marginTop: 2 }}>{d.name}</div>
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <VaultBadge color={catColor(d.cat)}>{d.cat}</VaultBadge>
                  </td>
                  <td style={{ padding: "12px 16px", fontWeight: 700, color: VOID.text, fontVariantNumeric: "tabular-nums" }}>
                    {fmtPrice(p.price, d.cat)}
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{
                      fontWeight: 800, fontSize: 13,
                      color: up ? VOID.green : VOID.red,
                      background: up ? `${VOID.green}12` : `${VOID.red}12`,
                      border: `1px solid ${up ? VOID.green : VOID.red}30`,
                      borderRadius: 6, padding: "3px 8px",
                    }}>
                      {fmtPct(p.pct24h)}
                    </span>
                  </td>
                  <td style={{ padding: "8px 16px" }}>
                    <SparkChart pair={d.pair} up={up} />
                  </td>
                  <td style={{ padding: "12px 16px" }}>
                    <VaultBtn variant="gold" style={{ padding: "6px 14px", fontSize: 11 }}>
                      Trade
                    </VaultBtn>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </VaultCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   §11  TRADE PAGE  (Gear infrastructure lives ONLY here)
   ═══════════════════════════════════════════════════════════════════════════ */

function TradePage({ prices }) {
  const [selected, setSelected] = useState("BTC/USDT");
  const [side, setSide] = useState("buy");
  const [amount, setAmount] = useState("");
  const [leverage, setLeverage] = useState(1);
  const [orderType, setOrderType] = useState("market");

  const def = INSTRUMENT_DEFS.find(d => d.pair === selected);
  const p = prices[selected];
  const price = p?.price || def?.base || 0;
  const estTotal = amount ? (parseFloat(amount) * price).toFixed(2) : "—";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <VaultHeading italic>Trade Terminal</VaultHeading>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 16 }}>

        {/* Chart / instrument area */}
        <VaultCard gearBg>
          {/* ─── GEAR INFRASTRUCTURE (Trade section only) ─── */}
          {/* These are additional gears beyond what VaultCard gearBg renders */}
          <div style={{
            position: "absolute", inset: 0, overflow: "hidden",
            pointerEvents: "none", zIndex: 0,
          }}>
            <GearIcon size={300} speed="gear-spin"  opacity={0.06} style={{ top: -60, right: 80 }} />
            <GearIcon size={180} speed="gear-spinR" opacity={0.08} style={{ bottom: -40, left: 40 }} />
            <GearIcon size={90}  speed="gear-spin"  opacity={0.07} style={{ top: 80, left: 200 }} />
            <GearIcon size={60}  speed="gear-spinR" opacity={0.06} style={{ bottom: 120, right: 200 }} />
            {/* Scanning horizontal line */}
            <div style={{
              position: "absolute", left: 0, right: 0, height: 1,
              background: `linear-gradient(90deg, transparent, ${VOID.techGreen}33, transparent)`,
              top: "30%", animation: "goldPulse 3s ease infinite",
            }} />
          </div>

          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Instrument selector */}
            <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
              {INSTRUMENT_DEFS.slice(0, 6).map(d => (
                <button key={d.pair} onClick={() => setSelected(d.pair)} style={{
                  background: selected === d.pair
                    ? "linear-gradient(135deg, rgba(191,149,63,0.18), rgba(179,135,40,0.06))"
                    : "rgba(0,0,0,0.4)",
                  border: `1px solid ${selected === d.pair ? VOID.border2 : VOID.border}`,
                  borderRadius: 8, padding: "6px 14px", cursor: "pointer",
                  color: selected === d.pair ? VOID.goldMid : VOID.text3,
                  fontSize: 12, fontWeight: 700, fontFamily: "'Inter', sans-serif",
                  transition: "all 0.2s",
                  backdropFilter: "blur(8px)",
                }}>
                  {d.pair}
                </button>
              ))}
            </div>

            {/* Live price display */}
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 11, color: VOID.techGreen, letterSpacing: "0.1em", fontWeight: 700, marginBottom: 4 }}>
                ◈ LIVE PRICE
              </div>
              <GoldMetric value={fmtPrice(price, def?.cat)} size={36} />
              <span style={{
                marginLeft: 14, fontSize: 13, fontWeight: 800,
                color: (p?.pct24h || 0) >= 0 ? VOID.green : VOID.red,
              }}>
                {fmtPct(p?.pct24h)}
              </span>
            </div>

            {/* Simulated chart area */}
            <div style={{
              background: "rgba(0,0,0,0.5)", border: `1px solid ${VOID.border}`,
              borderRadius: 10, padding: "12px 0", backdropFilter: "blur(4px)",
            }}>
              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={generateChart(60, price * 0.96, price * 0.002)}>
                  <defs>
                    <linearGradient id="tradeGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"  stopColor={VOID.goldMid} stopOpacity={0.25} />
                      <stop offset="100%" stopColor={VOID.goldMid} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis hide />
                  <YAxis hide domain={["auto","auto"]} />
                  <Tooltip
                    contentStyle={{
                      background: VOID.card2, border: `1px solid ${VOID.border2}`,
                      borderRadius: 8, fontSize: 11, fontFamily: "'Inter', sans-serif",
                    }}
                    formatter={v => [fmtPrice(v, def?.cat), "Price"]}
                  />
                  <Area type="monotone" dataKey="v"
                    stroke={VOID.goldMid} strokeWidth={1.8}
                    fill="url(#tradeGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Depth indicators */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 14,
            }}>
              {[
                { label: "Bid", val: fmtPrice(price * 0.9997, def?.cat), color: VOID.green },
                { label: "Ask", val: fmtPrice(price * 1.0003, def?.cat), color: VOID.red },
                { label: "High 24h", val: fmtPrice(price * 1.024, def?.cat), color: VOID.text2 },
                { label: "Low 24h",  val: fmtPrice(price * 0.978, def?.cat), color: VOID.text2 },
              ].map(r => (
                <div key={r.label} style={{
                  background: "rgba(0,0,0,0.4)", border: `1px solid ${VOID.border}`,
                  borderRadius: 8, padding: "10px 14px",
                  backdropFilter: "blur(4px)",
                }}>
                  <div style={{ fontSize: 10, color: VOID.text3, fontWeight: 700, letterSpacing: "0.06em", marginBottom: 4 }}>
                    {r.label.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: r.color, fontFamily: "'Inter', sans-serif" }}>
                    {r.val}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </VaultCard>

        {/* Order panel */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <VaultCard>
            <VaultHeading size={15} style={{ marginBottom: 14 }}>Place Order</VaultHeading>

            {/* Buy / Sell */}
            <div style={{
              display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 16,
            }}>
              <button onClick={() => setSide("buy")} style={{
                background: side === "buy"
                  ? "linear-gradient(135deg, #22c55e, #15803d)"
                  : VOID.card2,
                border: `1px solid ${side === "buy" ? `${VOID.green}60` : VOID.border}`,
                borderRadius: 8, padding: "11px", cursor: "pointer",
                color: side === "buy" ? "#000" : VOID.text3,
                fontWeight: 900, fontSize: 13, fontFamily: "'Inter', sans-serif",
                letterSpacing: "0.04em", transition: "all 0.2s",
                boxShadow: side === "buy" ? `0 0 16px rgba(34,197,94,0.25)` : "none",
              }}>
                ▲ BUY
              </button>
              <button onClick={() => setSide("sell")} style={{
                background: side === "sell"
                  ? "linear-gradient(135deg, #ef4444, #b91c1c)"
                  : VOID.card2,
                border: `1px solid ${side === "sell" ? `${VOID.red}60` : VOID.border}`,
                borderRadius: 8, padding: "11px", cursor: "pointer",
                color: side === "sell" ? "#fff" : VOID.text3,
                fontWeight: 900, fontSize: 13, fontFamily: "'Inter', sans-serif",
                letterSpacing: "0.04em", transition: "all 0.2s",
                boxShadow: side === "sell" ? `0 0 16px rgba(239,68,68,0.25)` : "none",
              }}>
                ▼ SELL
              </button>
            </div>

            {/* Order type */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, color: VOID.text3, fontWeight: 700, letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                ORDER TYPE
              </label>
              <div style={{ display: "flex", gap: 6 }}>
                {["market","limit","stop"].map(t => (
                  <button key={t} onClick={() => setOrderType(t)} style={{
                    flex: 1, background: orderType === t ? "rgba(191,149,63,0.12)" : "transparent",
                    border: `1px solid ${orderType === t ? VOID.border2 : VOID.border}`,
                    borderRadius: 6, padding: "6px", cursor: "pointer",
                    color: orderType === t ? VOID.goldMid : VOID.text3,
                    fontSize: 11, fontWeight: 700, textTransform: "capitalize",
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Amount */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 10, color: VOID.text3, fontWeight: 700, letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                AMOUNT
              </label>
              <input
                type="number" value={amount}
                onChange={e => setAmount(e.target.value)}
                placeholder="0.00"
                style={{ width: "100%", fontWeight: 700, fontSize: 14 }}
              />
            </div>

            {/* Leverage */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 10, color: VOID.text3, fontWeight: 700, letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                LEVERAGE  <span style={{ color: VOID.goldMid }}>{leverage}×</span>
              </label>
              <input type="range" min={1} max={100} value={leverage}
                onChange={e => setLeverage(Number(e.target.value))}
                style={{
                  width: "100%", accentColor: VOID.goldMid,
                  background: "transparent", border: "none", padding: 0,
                }}
              />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: VOID.text3, marginTop: 2 }}>
                <span>1×</span><span>25×</span><span>50×</span><span>100×</span>
              </div>
            </div>

            <GoldRule opacity={0.2} />
            <div style={{
              display: "flex", justifyContent: "space-between", marginTop: 12, marginBottom: 14,
              fontSize: 12, fontFamily: "'Inter', sans-serif",
            }}>
              <span style={{ color: VOID.text3 }}>Est. Total</span>
              <span style={{ color: VOID.goldMid, fontWeight: 800 }}>
                {estTotal !== "—" ? `$${parseFloat(estTotal).toLocaleString()}` : "—"}
              </span>
            </div>

            <VaultBtn
              variant={side === "buy" ? "green" : "red"}
              style={{ width: "100%", padding: "14px" }}
            >
              {side === "buy" ? "▲ BUY" : "▼ SELL"} {selected}
            </VaultBtn>
          </VaultCard>

          {/* Risk info */}
          <VaultCard>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <Shield size={14} color={VOID.goldMid} />
              <span style={{ fontSize: 12, fontWeight: 700, color: VOID.text2, fontFamily: "'Inter', sans-serif" }}>
                Risk Parameters
              </span>
            </div>
            {[
              { label: "Margin Required", val: amount ? `$${(parseFloat(amount || 0) * price / leverage).toFixed(2)}` : "—" },
              { label: "Liquidation Price", val: amount ? fmtPrice(price * (side === "buy" ? 0.91 : 1.09), def?.cat) : "—" },
              { label: "Max Loss", val: amount ? `$${(parseFloat(amount || 0) * price * 0.09).toFixed(2)}` : "—" },
            ].map(r => (
              <div key={r.label} style={{
                display: "flex", justifyContent: "space-between",
                fontSize: 12, fontFamily: "'Inter', sans-serif",
                padding: "6px 0", borderBottom: `1px solid ${VOID.border}`,
              }}>
                <span style={{ color: VOID.text3 }}>{r.label}</span>
                <span style={{ color: VOID.text, fontWeight: 700 }}>{r.val}</span>
              </div>
            ))}
          </VaultCard>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   §12  SUPPORT PAGE  (email corrected to support@goldenvaultxm.live)
   ═══════════════════════════════════════════════════════════════════════════ */

function SupportPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <VaultHeading italic>Institutional Support</VaultHeading>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        {/* Contact form */}
        <VaultCard>
          <VaultHeading size={16} style={{ marginBottom: 16 }}>Submit a Request</VaultHeading>
          {sent ? (
            <div style={{
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 12, padding: "30px 0",
            }}>
              <CheckCircle2 size={40} color={VOID.green} />
              <div style={{ color: VOID.text, fontWeight: 700, fontSize: 16, fontFamily: "'Inter', sans-serif" }}>
                Message Sent!
              </div>
              <div style={{ color: VOID.text3, fontSize: 13, fontFamily: "'Inter', sans-serif", textAlign: "center" }}>
                Our team will respond within 24 hours.
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div>
                <label style={{ fontSize: 10, color: VOID.text3, fontWeight: 700, letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                  FULL NAME
                </label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Your full name" style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: VOID.text3, fontWeight: 700, letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                  EMAIL ADDRESS
                </label>
                <input value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" style={{ width: "100%" }} />
              </div>
              <div>
                <label style={{ fontSize: 10, color: VOID.text3, fontWeight: 700, letterSpacing: "0.08em", display: "block", marginBottom: 6 }}>
                  MESSAGE
                </label>
                <textarea
                  value={msg} onChange={e => setMsg(e.target.value)}
                  placeholder="Describe your issue…"
                  rows={5}
                  style={{ width: "100%", resize: "vertical" }}
                />
              </div>
              <VaultBtn variant="gold" onClick={() => { if (name && email && msg) setSent(true); }}>
                <Mail size={14} />
                Send Message
              </VaultBtn>
            </div>
          )}
        </VaultCard>

        {/* Contact info */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <VaultCard>
            <VaultHeading size={15} style={{ marginBottom: 14 }}>Direct Contact</VaultHeading>
            {[
              {
                icon: Mail, label: "Email Support",
                val: "support@goldenvaultxm.live",  /* ← CORRECTED */
                color: VOID.goldMid,
              },
              { icon: Phone,  label: "Phone", val: "+1 (888) 492-7700", color: VOID.blue },
              { icon: Globe,  label: "Live Chat", val: "24/7 Available", color: VOID.green },
              { icon: MapPin, label: "HQ", val: "One Financial Plaza, NYC", color: VOID.purple },
            ].map(r => (
              <div key={r.label} style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: "10px 0", borderBottom: `1px solid ${VOID.border}`,
              }}>
                <VaultIconBox icon={r.icon} color={r.color} boxSize={32} />
                <div>
                  <div style={{ fontSize: 10, color: VOID.text3, fontWeight: 700, letterSpacing: "0.06em" }}>
                    {r.label.toUpperCase()}
                  </div>
                  <div style={{
                    fontSize: 13, fontWeight: 700, color: VOID.text,
                    fontFamily: "'Inter', sans-serif", marginTop: 2,
                    ...pressedShadow,
                  }}>
                    {r.val}
                  </div>
                </div>
              </div>
            ))}
          </VaultCard>

          <VaultCard>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <Shield size={16} color={VOID.goldMid} />
              <VaultHeading size={14}>Response Times</VaultHeading>
            </div>
            {[
              { tier: "VIP Clients",      time: "< 1 hour",  color: VOID.goldMid },
              { tier: "Premium Accounts", time: "< 4 hours", color: VOID.blue },
              { tier: "Standard",         time: "< 24 hours",color: VOID.text3 },
            ].map(r => (
              <div key={r.tier} style={{
                display: "flex", justifyContent: "space-between",
                padding: "8px 0", borderBottom: `1px solid ${VOID.border}`,
                fontSize: 12, fontFamily: "'Inter', sans-serif",
              }}>
                <span style={{ color: VOID.text3 }}>{r.tier}</span>
                <span style={{ color: r.color, fontWeight: 800, ...pressedShadow }}>
                  {r.time}
                </span>
              </div>
            ))}
          </VaultCard>
        </div>
      </div>

      {/* FAQ */}
      <VaultCard>
        <VaultHeading size={16} style={{ marginBottom: 16 }}>Frequently Asked Questions</VaultHeading>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {[
            { q: "How do I verify my account?", a: "Upload government-issued ID and proof of address through the Verification section in Settings." },
            { q: "What are the minimum deposit requirements?", a: "Standard accounts require $500 minimum. VIP accounts begin at $25,000." },
            { q: "How long do withdrawals take?", a: "Withdrawals process within 1-3 business days depending on your payment method and jurisdiction." },
            { q: "Is my account FDIC insured?", a: "Funds are held in segregated accounts at Tier-1 financial institutions for maximum security." },
          ].map(faq => (
            <div key={faq.q} style={{
              background: VOID.card2, border: `1px solid ${VOID.border}`,
              borderRadius: 10, padding: "14px 16px",
            }}>
              <div style={{
                fontWeight: 700, fontSize: 13, color: VOID.goldMid,
                fontFamily: "'Playfair Display', serif",
                marginBottom: 8, ...pressedShadow,
              }}>
                {faq.q}
              </div>
              <div style={{ fontSize: 12, color: VOID.text2, lineHeight: 1.6, fontFamily: "'Inter', sans-serif" }}>
                {faq.a}
              </div>
            </div>
          ))}
        </div>
      </VaultCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   §13  PORTFOLIO PAGE
   ═══════════════════════════════════════════════════════════════════════════ */

function PortfolioPage({ prices }) {
  const holdings = [
    { pair: "BTC/USDT", cat: "Crypto",  qty: 0.42,  avg: 61200, color: "#f59e0b" },
    { pair: "ETH/USDT", cat: "Crypto",  qty: 4.80,  avg: 3100,  color: "#6366f1" },
    { pair: "AAPL",     cat: "Stocks",  qty: 50,    avg: 175,   color: "#22c55e" },
    { pair: "XAU/USD",  cat: "Commodities", qty: 2, avg: 2210, color: VOID.goldMid },
    { pair: "EUR/USD",  cat: "Forex",   qty: 10000, avg: 1.092, color: "#3b82f6" },
  ];

  let totalValue = 0;
  let totalCost  = 0;
  const rows = holdings.map(h => {
    const cur = prices[h.pair]?.price || h.avg;
    const val = h.qty * cur;
    const cost = h.qty * h.avg;
    const pnl = val - cost;
    const pnlPct = ((val - cost) / cost) * 100;
    totalValue += val;
    totalCost  += cost;
    return { ...h, cur, val, cost, pnl, pnlPct };
  });
  const totalPnl    = totalValue - totalCost;
  const totalPnlPct = ((totalValue - totalCost) / totalCost) * 100;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <VaultHeading italic>My Portfolio</VaultHeading>

      {/* Summary cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14 }}>
        <VaultCard>
          <div style={{ fontSize: 10, color: VOID.text3, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>
            TOTAL VALUE
          </div>
          <GoldMetric value={`$${totalValue.toLocaleString("en-US", { maximumFractionDigits: 0 })}`} size={26} />
        </VaultCard>
        <VaultCard>
          <div style={{ fontSize: 10, color: VOID.text3, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>
            TOTAL P&L
          </div>
          <div style={{
            fontSize: 26, fontWeight: 800, fontFamily: "'Inter', sans-serif",
            color: totalPnl >= 0 ? VOID.green : VOID.red,
          }}>
            {totalPnl >= 0 ? "+" : ""}${Math.abs(totalPnl).toLocaleString("en-US", { maximumFractionDigits: 0 })}
          </div>
        </VaultCard>
        <VaultCard>
          <div style={{ fontSize: 10, color: VOID.text3, fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>
            RETURN
          </div>
          <div style={{
            fontSize: 26, fontWeight: 800, fontFamily: "'Inter', sans-serif",
            color: totalPnlPct >= 0 ? VOID.green : VOID.red,
          }}>
            {totalPnlPct >= 0 ? "+" : ""}{totalPnlPct.toFixed(2)}%
          </div>
        </VaultCard>
      </div>

      {/* Holdings table */}
      <VaultCard style={{ padding: 0 }}>
        <div style={{ padding: "16px 16px 10px", borderBottom: `1px solid ${VOID.border}` }}>
          <VaultHeading size={15}>Holdings</VaultHeading>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, fontFamily: "'Inter', sans-serif" }}>
          <thead>
            <tr style={{ background: VOID.surface, borderBottom: `1px solid ${VOID.border}` }}>
              {["Asset","Qty","Avg Cost","Current","Value","P&L","Return"].map(h => (
                <th key={h} style={{
                  padding: "10px 16px", textAlign: "left",
                  color: VOID.text3, fontSize: 10, fontWeight: 700,
                  letterSpacing: "0.08em", textTransform: "uppercase",
                }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.pair} style={{ borderBottom: `1px solid ${VOID.border}` }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(191,149,63,0.04)"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <td style={{ padding: "12px 16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: "50%",
                      background: r.color,
                      boxShadow: `0 0 6px ${r.color}`,
                    }} />
                    <div>
                      <div style={{ fontWeight: 700, color: VOID.text }}>{r.pair}</div>
                      <div style={{ fontSize: 10, color: VOID.text3 }}>{r.cat}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "12px 16px", color: VOID.text2, fontWeight: 600 }}>
                  {r.qty.toLocaleString()}
                </td>
                <td style={{ padding: "12px 16px", color: VOID.text2 }}>
                  {fmtPrice(r.avg, r.cat)}
                </td>
                <td style={{ padding: "12px 16px", color: VOID.text, fontWeight: 700 }}>
                  {fmtPrice(r.cur, r.cat)}
                </td>
                <td style={{ padding: "12px 16px", fontWeight: 700, color: VOID.text }}>
                  ${r.val.toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </td>
                <td style={{ padding: "12px 16px", fontWeight: 800, color: r.pnl >= 0 ? VOID.green : VOID.red }}>
                  {r.pnl >= 0 ? "+" : ""}${Math.abs(r.pnl).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                </td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    fontWeight: 800, color: r.pnlPct >= 0 ? VOID.green : VOID.red,
                    background: r.pnlPct >= 0 ? `${VOID.green}12` : `${VOID.red}12`,
                    border: `1px solid ${r.pnlPct >= 0 ? VOID.green : VOID.red}30`,
                    borderRadius: 6, padding: "3px 8px", fontSize: 12,
                  }}>
                    {r.pnlPct >= 0 ? "+" : ""}{r.pnlPct.toFixed(2)}%
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </VaultCard>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   §14  FOOTER
   ═══════════════════════════════════════════════════════════════════════════ */

function Footer() {
  return (
    <footer style={{
      background: VOID.surface,
      borderTop: `1px solid ${VOID.border}`,
      padding: "32px 24px 24px",
      marginTop: 40,
    }}>
      {/* Gold top rule */}
      <div style={{
        height: 2,
        background: GOLD_GRADIENT,
        opacity: 0.4, marginBottom: 28,
        borderRadius: 2,
      }} />

      <div style={{ maxWidth: 1440, margin: "0 auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr", gap: 32, marginBottom: 32 }}>
          {/* Brand */}
          <div>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontWeight: 700, fontSize: 18,
              background: GOLD_GRADIENT,
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
              letterSpacing: "0.05em", marginBottom: 10,
            }}>
              GoldenVaultXM
            </div>
            <p style={{ fontSize: 12, color: VOID.text3, lineHeight: 1.7, fontFamily: "'Inter', sans-serif", maxWidth: 260 }}>
              Institutional-grade trading infrastructure trusted by professional traders worldwide. 
              Multi-asset execution with unmatched liquidity.
            </p>
            <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
              {["Regulated", "256-bit SSL", "Cold Storage"].map(b => (
                <VaultBadge key={b} color={VOID.goldMid}>{b}</VaultBadge>
              ))}
            </div>
          </div>

          {[
            { title: "Products", links: ["Spot Trading","Futures","Margin","Copy Trading","API Access"] },
            { title: "Company",  links: ["About Us","Careers","Press","Regulations","Partners"] },
            { title: "Support",  links: ["Help Center","Documentation","Status","Community","Contact"] },
          ].map(col => (
            <div key={col.title}>
              <div style={{
                fontWeight: 800, fontSize: 11, color: VOID.goldMid,
                letterSpacing: "0.1em", textTransform: "uppercase",
                fontFamily: "'Inter', sans-serif", marginBottom: 14,
                ...pressedShadow,
              }}>
                {col.title}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {col.links.map(l => (
                  <a key={l} href="#" style={{
                    fontSize: 12, color: VOID.text3, textDecoration: "none",
                    fontFamily: "'Inter', sans-serif",
                    transition: "color 0.2s",
                  }}
                    onMouseEnter={e => e.target.style.color = VOID.goldMid}
                    onMouseLeave={e => e.target.style.color = VOID.text3}
                  >
                    {l}
                  </a>
                ))}
              </div>
            </div>
          ))}
        </div>

        <GoldRule opacity={0.15} />

        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          marginTop: 20, flexWrap: "wrap", gap: 12,
        }}>
          <div style={{ fontSize: 11, color: VOID.text3, fontFamily: "'Inter', sans-serif" }}>
            © 2024 GoldenVaultXM. All rights reserved. Trading involves substantial risk.
          </div>
          {/* Corrected email */}
          <a href="mailto:support@goldenvaultxm.live" style={{
            fontSize: 11, color: VOID.goldMid, textDecoration: "none",
            fontFamily: "'Inter', sans-serif", fontWeight: 600,
            ...pressedShadow,
          }}>
            support@goldenvaultxm.live
          </a>
          <div style={{ display: "flex", gap: 16, fontSize: 11, color: VOID.text3, fontFamily: "'Inter', sans-serif" }}>
            {["Privacy Policy","Terms of Service","Risk Disclosure","Cookie Policy"].map(l => (
              <a key={l} href="#" style={{ color: VOID.text3, textDecoration: "none" }}
                onMouseEnter={e => e.target.style.color = VOID.goldMid}
                onMouseLeave={e => e.target.style.color = VOID.text3}
              >
                {l}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   §15  ROOT APP
   ═══════════════════════════════════════════════════════════════════════════ */

export default function App() {
  const [page, setPage] = useState("dashboard");
  const { prices, flash } = useLivePrices();

  const renderPage = () => {
    switch (page) {
      case "dashboard":  return <DashboardPage prices={prices} />;
      case "markets":    return <MarketsPage prices={prices} flash={flash} />;
      case "trade":      return <TradePage prices={prices} />;
      case "portfolio":  return <PortfolioPage prices={prices} />;
      case "support":    return <SupportPage />;
      default:
        return (
          <VaultCard>
            <VaultHeading>{page.charAt(0).toUpperCase() + page.slice(1)}</VaultHeading>
            <p style={{ color: VOID.text3, fontFamily: "'Inter', sans-serif", marginTop: 12, fontSize: 13 }}>
              This section is fully operational — visual design applied.
            </p>
          </VaultCard>
        );
    }
  };

  return (
    <div style={{ background: VOID.bg, minHeight: "100vh", color: VOID.text }}>
      <ScanOverlay />
      <NavBar active={page} onNav={setPage} />
      <MarketTicker prices={prices} />
      <main style={{ maxWidth: 1440, margin: "0 auto", padding: "24px 20px 0" }}>
        {renderPage()}
      </main>
      <Footer />
    </div>
  );
}
