import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, } from "recharts";
import { Wallet, TrendingUp, Activity, Target, BarChart2, Shield, Zap, Globe, ArrowDownToLine, ArrowUpFromLine, FileBarChart, CheckCircle2, Menu, X, ChevronRight, Bell, Settings, LogOut, Home, Search, Lock, Award, BookOpen, Mail, Phone, MapPin, Eye, EyeOff, UserPlus, LogIn, AlertCircle, RefreshCw, Users, Newspaper, Cpu, ExternalLink, } from "lucide-react";
import Mining from "./Mining";
import { supabase } from './supabaseClient';
import ProfilePage from './ProfilePage';
import { createPortal } from "react-dom";
/* ─── Design Tokens ──────────────────────────────────────────────────────── */
const DARK_TOKENS = {
  bg: "#080808", card: "#0f0f0f", card2: "#141414", card3: "#1a1a1a",
  border: "#222222", border2: "#2a2a2a",
  gold: "#d97706", gold2: "#f59e0b", gold3: "#fbbf24", goldDim: "#92400e",
  green: "#22c55e", red: "#ef4444", purple: "#7c3aed", blue: "#3b82f6",
  text: "#ffffff", text2: "#a3a3a3", text3: "#525252", text4: "#303030",
};
const LIGHT_TOKENS = {
  bg: "#f5f1ea", card: "#ffffff", card2: "#faf7f2", card3: "#f0ebe0",
  border: "#e2d9c8", border2: "#d4c9b4",
  gold: "#b45309", gold2: "#d97706", gold3: "#f59e0b", goldDim: "#92400e",
  green: "#15803d", red: "#dc2626", purple: "#6d28d9", blue: "#1d4ed8",
  text: "#1a1008", text2: "#44403c", text3: "#78716c", text4: "#c8bfaf",
};
const C = { ...DARK_TOKENS };
const ThemeContext = createContext(null);
const useTheme = () => useContext(ThemeContext);

/* ─── Auth Context ───────────────────────────────────────────────────────── */
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

/* ─── Layout Context ─────────────────────────────────────────────────────── */
/*
 * Responds automatically to the browser's built-in "Desktop site / Mobile site"
 * toggle. When the browser switches to desktop mode it removes viewport
 * shrink-to-fit and reports a wide window.innerWidth (typically 980px+).
 * When it switches back to mobile it reports the real device pixel width.
 *
 * Rules:
 *  • "desktop" when window.innerWidth >= 768 (browser desktop-site mode)
 *  • "mobile"  when window.innerWidth <  768 (browser mobile-site mode)
 *  • Recalculated on every resize event so the switch is instant.
 *  • No localStorage, no manual toggle — the browser switch is the ONLY trigger.
 */
const LAYOUT_BREAKPOINT = 768;
const LAYOUT_WIDTHS = { mobile: 600, desktop: 1920 };

const LayoutContext = createContext(null);
const useLayout = () => useContext(LayoutContext);

function getMode() {
  return window.innerWidth >= LAYOUT_BREAKPOINT ? "desktop" : "mobile";
}

function LayoutProvider({ children }) {
  const [mode, setMode] = useState(getMode);

  useEffect(() => {
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const next = getMode();
        setMode(prev => (prev !== next ? next : prev));
      });
    };
    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  useEffect(() => {
    applyLayoutCSS(mode);
  }, [mode]);

  const width = LAYOUT_WIDTHS[mode];
  return (
    <LayoutContext.Provider value={{ mode, width }}>
      {children}
    </LayoutContext.Provider>
  );
}
function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("gvxm-theme") || "dark"; } catch { return "dark"; }
  });
  const [, tick] = useState(0);
  const { mode } = useLayout();

  useEffect(() => {
    const tokens = theme === "light" ? LIGHT_TOKENS : DARK_TOKENS;
    Object.assign(C, tokens);
    applyLayoutCSS(mode, theme);
    try { localStorage.setItem("gvxm-theme", theme); } catch {}
    tick(n => n + 1);
  }, [theme, mode]);

  const toggle = useCallback(() => setTheme(t => t === "dark" ? "light" : "dark"), []);
  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const [hov, setHov] = useState(false);
  return (
    <button
      onClick={toggle}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      title={theme === "dark" ? "Switch to Light" : "Switch to Dark"}
      style={{
        background: hov ? C.card3 : C.card2,
        border: `1.5px solid ${C.border2}`,
        borderRadius: 20,
        padding: "6px 12px",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
        transition: "all .18s",
        flexShrink: 0,
      }}
    >
      <span style={{ fontSize: 15 }}>{theme === "dark" ? "☀️" : "🌒"}</span>
      <span style={{ fontSize: 11, fontWeight: 700, color: C.text2, letterSpacing: "0.03em" }}>
        {theme === "dark" ? "Light" : "Dark"}
      </span>
    </button>
  );
}
/* ─── Viewport + Base CSS — SYNCHRONOUS module-level execution ───────────────
 *
 * WHY THIS MUST RUN AT MODULE LOAD (not in useEffect):
 *   The browser calculates the initial viewport scale BEFORE React hydrates.
 *   If <meta viewport> is missing or wrong at parse time, the browser zooms
 *   the page to fit a "desktop" width onto the phone screen — and that zoom
 *   is locked in for the first paint. A useEffect fix arrives too late.
 *
 *   Solution: call both functions synchronously here, at the top level of the
 *   module. They run the moment the JS bundle is evaluated — before the first
 *   ReactDOM.render / createRoot call, before any component mounts.
 * ─────────────────────────────────────────────────────────────────────────── */

function ensureViewportMeta() {
  /* Find or create the <meta name="viewport"> tag */
  let meta = document.querySelector('meta[name="viewport"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "viewport";
    /* Prepend to <head> so it takes effect before any stylesheet */
    document.head.insertBefore(meta, document.head.firstChild);
  }
  /*
   * width=device-width  → use real phone pixel width, no shrink-to-fit
   * initial-scale=1.0   → start at 1:1, never zoomed in on load
   */
  meta.content = "width=device-width, initial-scale=1.0";
}

function applyLayoutCSS(mode, theme = "dark") {
  const w = LAYOUT_WIDTHS[mode];
  const bg = theme === "light" ? "#f5f1ea" : "#080808";
  const id = "gvxm-layout-lock";
  let tag = document.getElementById(id);
  if (!tag) {
    tag = document.createElement("style");
    tag.id = id;
    document.head.insertBefore(tag, document.head.firstChild);
  }
  tag.textContent = `
    html { background: ${bg} !important; overflow-x: clip !important; }
    body {
      background: ${bg} !important; margin: 0 !important; padding: 0 !important;
      width: 100% !important; min-width: 0 !important; max-width: 100% !important;
      overflow-x: clip !important;
      -webkit-text-size-adjust: 100% !important; text-size-adjust: 100% !important;
    }
    .gvxm-shell {
      width: 100% !important; max-width: ${w}px !important; min-width: 0 !important;
      margin: 0 auto !important; overflow-x: clip !important; box-sizing: border-box !important;
    }
    #gvxm-root { width: 100% !important; max-width: 100% !important; overflow-x: clip !important; }
  `;
}
/* ── Run SYNCHRONOUSLY at module evaluation time ── */
ensureViewportMeta();
applyLayoutCSS(window.innerWidth >= LAYOUT_BREAKPOINT ? "desktop" : "mobile");

/* ─── Market Instrument Definitions ─────────────────────────────────────── */
const INSTRUMENT_DEFS = [
  { pair: "BTC/USDT", name: "Bitcoin", cat: "Crypto", base: 67800, step: 0.0003 },
  { pair: "ETH/USDT", name: "Ethereum", cat: "Crypto", base: 3520, step: 0.0003 },
  { pair: "SOL/USDT", name: "Solana", cat: "Crypto", base: 178, step: 0.0004 },
  { pair: "XRP/USDT", name: "XRP", cat: "Crypto", base: 0.5821, step: 0.0005 },
  { pair: "BNB/USDT", name: "BNB", cat: "Crypto", base: 612, step: 0.0003 },
  { pair: "ADA/USDT", name: "Cardano", cat: "Crypto", base: 0.4412, step: 0.0004 },
  { pair: "AVAX/USDT", name: "Avalanche", cat: "Crypto", base: 38.5, step: 0.0004 },
  { pair: "DOGE/USDT", name: "Dogecoin", cat: "Crypto", base: 0.1634, step: 0.0005 },
  { pair: "MATIC/USDT", name: "Polygon", cat: "Crypto", base: 0.8821, step: 0.0004 },
  { pair: "LINK/USDT", name: "Chainlink", cat: "Crypto", base: 18.42, step: 0.0004 },
  { pair: "UNI/USDT", name: "Uniswap", cat: "Crypto", base: 10.34, step: 0.0004 },
  { pair: "LTC/USDT", name: "Litecoin", cat: "Crypto", base: 86.5, step: 0.0003 },
  { pair: "DOT/USDT", name: "Polkadot", cat: "Crypto", base: 7.82, step: 0.0004 },
  { pair: "SHIB/USDT", name: "Shiba Inu", cat: "Crypto", base: 0.0000248, step: 0.0005 },
  { pair: "ATOM/USDT", name: "Cosmos", cat: "Crypto", base: 9.41, step: 0.0004 },
  { pair: "EUR/USD", name: "Euro / US Dollar", cat: "Forex", base: 1.08432, step: 0.00008 },
  { pair: "GBP/USD", name: "British Pound / USD", cat: "Forex", base: 1.27180, step: 0.00008 },
  { pair: "USD/JPY", name: "US Dollar / Japanese Yen", cat: "Forex", base: 156.84, step: 0.00006 },
  { pair: "AUD/USD", name: "Australian Dollar / USD", cat: "Forex", base: 0.65820, step: 0.00007 },
  { pair: "USD/CHF", name: "US Dollar / Swiss Franc", cat: "Forex", base: 0.91240, step: 0.00007 },
  { pair: "USD/CAD", name: "US Dollar / Canadian Dollar", cat: "Forex", base: 1.36420, step: 0.00007 },
  { pair: "NZD/USD", name: "New Zealand Dollar / USD", cat: "Forex", base: 0.60150, step: 0.00008 },
  { pair: "EUR/GBP", name: "Euro / British Pound", cat: "Forex", base: 0.85210, step: 0.00006 },
  { pair: "EUR/JPY", name: "Euro / Japanese Yen", cat: "Forex", base: 169.82, step: 0.00006 },
  { pair: "GBP/JPY", name: "British Pound / Yen", cat: "Forex", base: 199.41, step: 0.00006 },
  { pair: "EUR/CHF", name: "Euro / Swiss Franc", cat: "Forex", base: 0.98740, step: 0.00007 },
  { pair: "AUD/JPY", name: "Australian Dollar / Yen", cat: "Forex", base: 103.21, step: 0.00006 },
  { pair: "USD/MXN", name: "US Dollar / Mexican Peso", cat: "Forex", base: 17.2410, step: 0.00007 },
  { pair: "USD/SGD", name: "US Dollar / Singapore Dollar", cat: "Forex", base: 1.3562, step: 0.00007 },
  { pair: "USD/ZAR", name: "US Dollar / South African Rand", cat: "Forex", base: 18.621, step: 0.00007 },
  { pair: "AAPL", name: "Apple Inc.", cat: "Stocks", base: 189.30, step: 0.0002 },
  { pair: "NVDA", name: "NVIDIA Corporation", cat: "Stocks", base: 875.40, step: 0.0002 },
  { pair: "TSLA", name: "Tesla Inc.", cat: "Stocks", base: 248.60, step: 0.0003 },
  { pair: "AMZN", name: "Amazon.com Inc.", cat: "Stocks", base: 186.80, step: 0.0002 },
  { pair: "MSFT", name: "Microsoft Corporation", cat: "Stocks", base: 420.50, step: 0.0002 },
  { pair: "GOOGL", name: "Alphabet Inc.", cat: "Stocks", base: 175.20, step: 0.0002 },
  { pair: "META", name: "Meta Platforms Inc.", cat: "Stocks", base: 508.40, step: 0.0002 },
  { pair: "JPM", name: "JPMorgan Chase", cat: "Stocks", base: 199.60, step: 0.0002 },
  { pair: "V", name: "Visa Inc.", cat: "Stocks", base: 278.30, step: 0.0002 },
  { pair: "WMT", name: "Walmart Inc.", cat: "Stocks", base: 67.82, step: 0.0002 },
  { pair: "NFLX", name: "Netflix Inc.", cat: "Stocks", base: 627.40, step: 0.0003 },
  { pair: "AMD", name: "Advanced Micro Devices", cat: "Stocks", base: 162.80, step: 0.0003 },
  { pair: "COIN", name: "Coinbase Global", cat: "Stocks", base: 214.30, step: 0.0003 },
  { pair: "PLTR", name: "Palantir Technologies", cat: "Stocks", base: 22.40, step: 0.0003 },
  { pair: "SPX", name: "S&P 500 Index", cat: "Indices", base: 5218.0, step: 0.0001 },
  { pair: "NDX", name: "NASDAQ 100", cat: "Indices", base: 18320.0, step: 0.0001 },
  { pair: "DJIA", name: "Dow Jones Industrial", cat: "Indices", base: 39200.0, step: 0.0001 },
  { pair: "RUT", name: "Russell 2000", cat: "Indices", base: 2082.0, step: 0.0001 },
  { pair: "VIX", name: "CBOE Volatility Index", cat: "Indices", base: 14.82, step: 0.0002 },
  { pair: "FTSE", name: "FTSE 100", cat: "Indices", base: 8180.0, step: 0.0001 },
  { pair: "DAX", name: "DAX 40", cat: "Indices", base: 18640.0, step: 0.0001 },
  { pair: "N225", name: "Nikkei 225", cat: "Indices", base: 38820.0, step: 0.0001 },
  { pair: "XAU/USD", name: "Gold Spot", cat: "Commodities", base: 2342.0, step: 0.0001 },
  { pair: "XAG/USD", name: "Silver Spot", cat: "Commodities", base: 29.82, step: 0.0002 },
  { pair: "XTI/USD", name: "Crude Oil WTI", cat: "Commodities", base: 77.40, step: 0.0002 },
  { pair: "BRENT", name: "Crude Oil Brent", cat: "Commodities", base: 81.60, step: 0.0002 },
  { pair: "NATGAS", name: "Natural Gas", cat: "Commodities", base: 2.418, step: 0.0003 },
  { pair: "COPPER", name: "Copper", cat: "Commodities", base: 4.612, step: 0.0002 },
  { pair: "ES", name: "S&P 500 E-mini Futures", cat: "Futures", base: 5220.0, step: 0.0001 },
  { pair: "NQ", name: "NASDAQ 100 Futures", cat: "Futures", base: 18340.0, step: 0.0001 },
  { pair: "YM", name: "Dow Jones Futures", cat: "Futures", base: 39180.0, step: 0.0001 },
  { pair: "GC", name: "Gold Futures", cat: "Futures", base: 2350.0, step: 0.0001 },
  { pair: "CL", name: "Crude Oil Futures", cat: "Futures", base: 77.60, step: 0.0002 },
  { pair: "ZN", name: "10-Year T-Note Futures", cat: "Futures", base: 109.12, step: 0.0001 },
  { pair: "US02Y", name: "US 2-Year Treasury", cat: "Bonds", base: 4.921, step: 0.0001 },
  { pair: "US05Y", name: "US 5-Year Treasury", cat: "Bonds", base: 4.412, step: 0.0001 },
  { pair: "US10Y", name: "US 10-Year Treasury", cat: "Bonds", base: 4.281, step: 0.0001 },
  { pair: "US30Y", name: "US 30-Year Treasury", cat: "Bonds", base: 4.480, step: 0.0001 },
  { pair: "TLT", name: "20+ Year T-Bond ETF", cat: "Bonds", base: 91.42, step: 0.0001 },
];
const CATS = ["All", "Crypto", "Forex", "Stocks", "Indices", "Commodities", "Futures", "Bonds"];

/* ─── Price simulator hook ───────────────────────────────────────────────── */
function useLivePrices() {
  const initPrices = () => {
    const m = {};
    INSTRUMENT_DEFS.forEach(d => {
      m[d.pair] = { price: d.base, pct24h: (Math.random() - 0.45) * 4, prevDay: d.base * (1 - (Math.random() - 0.45) * 0.04), up: Math.random() > 0.45, };
    });
    return m;
  };
  const [prices, setPrices] = useState(initPrices);
  const [flash, setFlash] = useState({});
  useEffect(() => {
    const interval = setInterval(() => {
      // BUG 1 FIX: flashNext collected outside the updater so setFlash is
      // never called from inside another setState updater (React anti-pattern).
      const flashNext = {};
      setPrices(prev => {
        const next = { ...prev };
        const toUpdate = INSTRUMENT_DEFS.filter(() => Math.random() < 0.30).map(d => d.pair);
        toUpdate.forEach(pair => {
          const def = INSTRUMENT_DEFS.find(d => d.pair === pair);
          const cur = prev[pair];
          const sign = Math.random() > 0.5 ? 1 : -1;
          const mag = def.step * (0.5 + Math.random()) * def.base;
          const newPrice = Math.max(cur.price + sign * mag, def.base * 0.7);
          const newPct24h = ((newPrice - cur.prevDay) / cur.prevDay) * 100;
          next[pair] = { price: newPrice, pct24h: newPct24h, prevDay: cur.prevDay, up: sign === 1, };
          flashNext[pair] = sign === 1 ? "up" : "dn";
        });
        return next;
      });
      // setFlash called AFTER setPrices, never inside its updater
      setFlash(flashNext);
      setTimeout(() => setFlash({}), 600);
    }, 2000);
    return () => clearInterval(interval);
  }, []);
  return { prices, flash };
}

/* ─── Price formatting ───────────────────────────────────────────────────── */
const fmtPrice = (price, cat) => {
  if (!price) return "—";
  if (cat === "Crypto") {
    if (price < 0.00001) return price.toFixed(8);
    if (price < 0.001) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    if (price < 10) return price.toFixed(3);
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (cat === "Forex") return price > 50 ? price.toFixed(3) : price.toFixed(4);
  if (cat === "Bonds") return price.toFixed(3) + "%";
  if (price > 10000) return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toFixed(2);
};
const fmtPct = p => p == null ? "—" : `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`;
const catColor = cat => ({ Crypto: "#f59e0b", Forex: "#3b82f6", Stocks: "#22c55e", Indices: "#a78bfa", Commodities: "#fbbf24", Futures: "#ef4444", Bonds: "#94a3b8" }[cat] || C.text3);

/* ─── Shared UI Primitives ───────────────────────────────────────────────── */
const GoldLine = () => (<div style={{ height: 1, background: `linear-gradient(90deg,transparent,${C.gold}33,transparent)` }} />);
const Card = ({ children, style = {} }) => (<div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 16px", ...style }}> {children} </div>);
const Badge = ({ children, color }) => (<span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.06em", background: `${color}20`, color, borderRadius: 4, padding: "2px 7px", display: "inline-block", textTransform: "uppercase", }}>{children}</span>);
const IconBox = ({ icon: Icon, color = C.gold, size = 16, boxSize = 36 }) => (<div style={{ width: boxSize, height: boxSize, borderRadius: 9, background: `${color}18`, display: "grid", placeItems: "center", flexShrink: 0 }}> <Icon size={size} color={color} /> </div>);

/* ─── Hover-aware button ─────────────────────────────────────────────────── */
function Btn({ children, onClick, variant = "gold", loading = false, disabled = false, style = {} }) {
  const [hov, setHov] = useState(false);
  const base = { border: "none", borderRadius: 10, padding: "13px 16px", fontWeight: 900, fontSize: 13, cursor: disabled || loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all .18s", letterSpacing: "0.04em", outline: "none", };
  const variants = {
    gold: { background: disabled ? C.goldDim : hov ? C.gold2 : C.gold, color: "#000", transform: hov && !disabled ? "scale(1.01)" : "scale(1)" },
    outline: { background: "transparent", color: hov ? C.gold2 : C.gold, border: `1.5px solid ${hov ? C.gold2 : C.gold}`, transform: hov ? "scale(1.01)" : "scale(1)" },
    ghost: { background: hov ? C.card3 : C.card2, color: C.text3, border: `1px solid ${C.border}` },
    danger: { background: hov ? "#b91c1c" : C.card, color: C.red, border: `1px solid ${C.border}` },
    purple: { background: hov ? "#6d28d9" : C.purple, color: "#fff", transform: hov ? "scale(1.01)" : "scale(1)" },
    white: { background: hov ? "#e5e7eb" : C.text, color: "#000", transform: hov ? "scale(1.01)" : "scale(1)" },
  };
  return (<button onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} onClick={!disabled && !loading ? onClick : undefined} style={{ ...base, ...variants[variant], opacity: loading || disabled ? 0.7 : 1, ...style }} > {loading ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Processing…</> : children} </button>);
}

/* ─── Auth Context / Modals / Nav / ... (Remained same) ──────────────────── */
/* ── Google "G" SVG logo ─────────────────────────────────────────────────── */
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
);

/* ─── Crypto Deposit Modal ───────────────────────────────────────────────── */
const CRYPTO_WALLETS = [
  {
    symbol: "BTC",
    name: "Bitcoin",
    address: "bc1q5quw6afn6y4050mysfjycj04f0hdzq83u4gpmw",
    color: "#F7931A",
    logo: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill="#F7931A"/>
        <path d="M22.1 13.8c.3-2-1.2-3.1-3.3-3.8l.7-2.7-1.6-.4-.7 2.6-1.3-.3.7-2.6-1.6-.4-.7 2.7-1-.3-2.2-.5-.4 1.7s1.2.3 1.1.3c.6.2.7.6.7.9l-1.7 6.8c-.1.2-.3.5-.8.4 0 0-1.1-.3-1.1-.3l-.8 1.9 2.1.5 1.1.3-.7 2.7 1.6.4.7-2.7 1.3.3-.7 2.7 1.6.4.7-2.7c2.8.5 4.8.3 5.7-2.2.7-2-.03-3.2-1.5-3.9 1.1-.25 1.9-1 2.1-2.4zm-3.8 5.3c-.5 2-3.9.9-5 .6l.9-3.5c1.1.3 4.7.9 4.1 2.9zm.5-5.3c-.5 1.8-3.3.9-4.2.7l.8-3.2c.9.2 3.9.7 3.4 2.5z" fill="white"/>
      </svg>
    ),
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    address: "0xBecefd477aDC233d96f9c06F029a25B43d995139",
    color: "#627EEA",
    logo: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill="#627EEA"/>
        <path d="M16 5.5L9.5 16.3 16 19.8l6.5-3.5L16 5.5z" fill="white" opacity="0.8"/>
        <path d="M9.5 16.3L16 19.8v-7.3L9.5 16.3z" fill="white" opacity="0.6"/>
        <path d="M16 12.5v7.3l6.5-3.5L16 12.5z" fill="white"/>
        <path d="M16 21.2l-6.5-3.6L16 26.5l6.5-8.9L16 21.2z" fill="white" opacity="0.6"/>
        <path d="M16 21.2v5.3l6.5-8.9L16 21.2z" fill="white" opacity="0.8"/>
      </svg>
    ),
  },
  {
    symbol: "USDT",
    name: "USDT (ERC-20)",
    address: "0xBecefd477aDC233d96f9c06F029a25B43d995139",
    color: "#26A17B",
    logo: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill="#26A17B"/>
        <path d="M17.8 17.3v-.02c-.1.01-1 .06-2 .06-1 0-1.9-.05-2-.06v.02c-3.5-.15-6.1-.77-6.1-1.52 0-.74 2.6-1.36 6.1-1.51v2.4c.1.01 1 .07 2.02.07 1.23 0 1.85-.07 1.98-.07v-2.4c3.5.15 6.1.77 6.1 1.51 0 .75-2.6 1.37-6.1 1.52zm0-3.29v-2.14h4.88V9.5H9.32v2.37H14.2v2.14c-4 .18-7 .97-7 1.91s3 1.73 7 1.91v6.42h3.6v-6.42c4-.18 7-.97 7-1.91s-3-1.73-7-1.91z" fill="white"/>
      </svg>
    ),
  },
  {
    symbol: "BNB",
    name: "BNB",
    address: "0x704A9F1CabaFD3AFdF1963A890F580D477d5870E",
    color: "#F3BA2F",
    logo: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill="#F3BA2F"/>
        <path d="M12.1 16l-1.8-1.8-1.8 1.8 1.8 1.8L12.1 16zm3.9-3.9l3.2 3.2 1.8-1.8L16 9.3l-5 5 1.8 1.8L16 12.1zm5.7 2.1L20 15.9l1.8 1.8 1.7-1.7-1.8-1.8zm-5.7 5.7l-3.2-3.2-1.8 1.8 5 5 5-5-1.8-1.8-3.2 3.2zM16 17.8L14.2 16l1.8-1.8 1.8 1.8L16 17.8z" fill="white"/>
      </svg>
    ),
  },
  {
    symbol: "TRX",
    name: "Tron",
    address: "TM9FGDVqFV6zsZwNPRxtEnBY1tZKtV89d4",
    color: "#EF0027",
    logo: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill="#EF0027"/>
        <path d="M22.8 12.2L9.5 8l3.8 13.8 3.4-4.6 4.2 4.3 1.9-9.3zm-6 7.1l-2.6-2.7-1.6 2.1-1.7-6.3 7.8 2.3-1.9 4.6z" fill="white"/>
      </svg>
    ),
  },
  {
    symbol: "BCH",
    name: "Bitcoin Cash",
    address: "qr95lcna5t6vdghe5dm00kzkewekljjlgsayd0yj5n",
    color: "#8DC351",
    logo: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill="#8DC351"/>
        <path d="M20.5 14.2c.2-1.5-1-2.3-2.6-2.8l.5-2.1-1.3-.3-.5 2-1-.3.5-2-1.3-.3-.5 2.1-.8-.2-1.7-.4-.3 1.4s.9.2.9.2c.5.1.6.5.5.7l-1.3 5.3c-.1.2-.2.4-.6.3 0 0-.9-.2-.9-.2l-.6 1.5 1.6.4.9.2-.5 2.1 1.3.3.5-2.1 1 .3-.5 2.1 1.3.3.5-2.1c2.2.4 3.8.2 4.4-1.7.5-1.5 0-2.4-1.1-3 .8-.2 1.5-.8 1.6-1.9zm-3 4.1c-.4 1.6-3 .7-3.9.5l.7-2.7c.9.2 3.7.7 3.2 2.2zm.4-4.1c-.3 1.4-2.5.7-3.2.5l.6-2.5c.8.2 3.1.5 2.6 2z" fill="white"/>
      </svg>
    ),
  },
  {
    symbol: "ZEC",
    name: "Zcash",
    address: "t1fkc3qALWZ52Jq7cnupWeRdcZ9Y9CHj74p",
    color: "#F4B728",
    logo: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill="#F4B728"/>
        <path d="M16 6C10.5 6 6 10.5 6 16s4.5 10 10 10 10-4.5 10-10S21.5 6 16 6zm4.5 14.5h-9v-2.2l5.4-6.8h-5.1V9.5h8.7v2.2l-5.4 6.8h5.4v2z" fill="white"/>
      </svg>
    ),
  },
  {
    symbol: "LTC",
    name: "Litecoin",
    address: "ltc1qak6tptl3t5zh9u96gcwtrp874qrqr8nyy0w957",
    color: "#345D9D",
    logo: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill="#345D9D"/>
        <path d="M16.5 7.5l-3.8 9.2-1.5.5.5 1.8 1-.3-1 2.3H21l.7-2.6H14l.8-2 1.5-.5-.5-1.8-1 .3 2.5-6.9h-1z" fill="white"/>
      </svg>
    ),
  },
  {
    symbol: "XRP",
    name: "XRP",
    address: "rBSziSwqzGkJgp6bQ7DXVTq5k2vkvxZLJ6",
    color: "#346AA9",
    logo: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill="#346AA9"/>
        <path d="M22 8h2.4l-5.3 5.1c-1.7 1.6-4.5 1.6-6.2 0L7.6 8H10l4 3.9c1.1 1 2.9 1 4 0L22 8zM10 24H7.6l5.3-5.1c1.7-1.6 4.5-1.6 6.2 0L24.4 24H22l-4-3.9c-1.1-1-2.9-1-4 0L10 24z" fill="white"/>
      </svg>
    ),
  },
  {
    symbol: "SOL",
    name: "Solana",
    address: "ESSb8XzPu7SpJGwdFssup6Cjy1F2E3WhNLo1SfRiULN",
    color: "#9945FF",
    logo: (
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
        <circle cx="16" cy="16" r="16" fill="#9945FF"/>
        <path d="M10 20.5h12.5l-2 2H8l2-2zm0-5.5h12.5l-2 2H8l2-2zm10.5-7.5L18.5 9.5H8l2-2h10.5z" fill="white"/>
      </svg>
    ),
  },
];

function DepositModal({ onClose }) {
  const [copied, setCopied] = useState(null);

  const handleCopy = (address, symbol) => {
    navigator.clipboard?.writeText(address).catch(() => {});
    setCopied(symbol);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div style={{
      position: "fixed", inset: 0,
      background: "rgba(0,0,0,0.85)",
      backdropFilter: "blur(12px)",
      zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }}>
      <div style={{
        background: "#000000",
        border: "1px solid #222",
        borderRadius: 20,
        width: "100%", maxWidth: 440,
        maxHeight: "88vh",
        display: "flex", flexDirection: "column",
        boxShadow: "0 40px 120px rgba(0,0,0,0.9)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 20px 16px",
          borderBottom: "1px solid #1a1a1a",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 17, color: "#fff", letterSpacing: "-0.01em" }}>
              Deposit Crypto
            </div>
            <div style={{ fontSize: 12, color: "#555", marginTop: 3 }}>
              Select a wallet to copy address
            </div>
          </div>
          <button onClick={onClose} style={{
            background: "#111", border: "1px solid #2a2a2a", borderRadius: 8,
            width: 32, height: 32, display: "grid", placeItems: "center",
            cursor: "pointer", color: "#666",
          }}>
            <X size={15} />
          </button>
        </div>

        {/* Scrollable wallet list */}
        <div style={{
          overflowY: "auto", padding: "12px 16px 20px",
          display: "flex", flexDirection: "column", gap: 10,
        }}>
          {CRYPTO_WALLETS.map((w) => (
            <div key={w.symbol} style={{
              background: "#0a0a0a",
              border: "1px solid #1c1c1c",
              borderRadius: 14,
              padding: "14px 16px",
            }}>
              {/* Coin header row */}
              <div style={{
                display: "flex", alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 11,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ flexShrink: 0, borderRadius: "50%", overflow: "hidden" }}>
                    {w.logo}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>{w.name}</div>
                  </div>
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 800,
                  background: `${w.color}22`,
                  color: w.color,
                  borderRadius: 5,
                  padding: "3px 8px",
                  letterSpacing: "0.06em",
                }}>
                  {w.symbol}
                </span>
              </div>

              {/* Address row */}
              <div style={{
                background: "#111",
                border: "1px solid #222",
                borderRadius: 10,
                padding: "11px 12px",
                display: "flex", alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}>
                <span style={{
                  fontSize: 12, color: "#555",
                  fontFamily: "monospace",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  flex: 1,
                }}>
                  {w.address}
                </span>
                <button
                  onClick={() => handleCopy(w.address, w.symbol)}
                  style={{
                    flexShrink: 0,
                    background: copied === w.symbol ? `${w.color}22` : "#1a1a1a",
                    border: `1px solid ${copied === w.symbol ? w.color + "55" : "#2a2a2a"}`,
                    borderRadius: 8,
                    padding: "7px 13px",
                    cursor: "pointer",
                    color: copied === w.symbol ? w.color : "#888",
                    fontSize: 12, fontWeight: 700,
                    display: "flex", alignItems: "center", gap: 5,
                    transition: "all .2s",
                  }}
                >
                  <Globe size={12} />
                  {copied === w.symbol ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          borderTop: "1px solid #1a1a1a",
          padding: "12px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          flexShrink: 0,
          background: "#050505",
        }}>
          <span style={{ fontSize: 11, color: "#444" }}>
            Need help?{" "}
            <span style={{ color: C.gold, fontWeight: 700 }}>support@goldenvaultxm.com</span>
          </span>
          <button onClick={onClose} style={{
            background: "#111", border: "1px solid #2a2a2a",
            borderRadius: 8, padding: "8px 16px",
            color: "#888", fontSize: 12, fontWeight: 700,
            cursor: "pointer",
          }}>Close</button>
        </div>
      </div>
    </div>
  );
}

function AuthModal({ onClose, initialMode = "signup" }) {
  const { login } = useAuth();
  // BUG 3 FIX: renamed `mode`→`authMode` to avoid shadowing LayoutProvider's `mode`
  const [authMode, setAuthMode] = useState(initialMode);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  /* ── Google OAuth ── */
  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    // BUG 2 FIX: subscribe BEFORE calling signInWithOAuth so the listener
    // exists when the browser returns from the OAuth redirect. Subscribing
    // after the call means the component unmounts on redirect, destroying
    // the listener before it can ever fire.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
        subscription.unsubscribe();
        login({ name: session.user.user_metadata?.full_name || session.user.email.split("@")[0], email: session.user.email });
        setGoogleLoading(false);
        onClose();
      }
    });
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (oauthError) {
      subscription.unsubscribe(); // clean up if the OAuth call itself failed
      setError(oauthError.message);
      setGoogleLoading(false);
    }
  };

  /* ── Email / password ── */
  const handle = async () => {
    setError("");
    if (authMode === "signup" && !agreed) { setError("Please confirm you are 18 or older and agree to the Terms."); return; }
    setLoading(true);
    let authError = null;
    if (authMode === "signup") {
      const { error } = await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { name: form.name } } });
      authError = error;
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
      authError = error;
    }
    if (authError) { setError(authError.message); setLoading(false); return; }
    login({ name: form.name || form.email.split("@")[0], email: form.email });
    setLoading(false);
    onClose();
  };

  const inp = { width: "100%", background: C.card2, border: `1px solid ${C.border2}`, borderRadius: 12, padding: "13px 14px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", backdropFilter: "blur(14px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "28px 24px 24px", width: "100%", maxWidth: 420, position: "relative", boxShadow: "0 32px 96px #000c" }}>

        {/* Close */}
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: C.text3, padding: 4 }}><X size={18} /></button>

        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: `linear-gradient(135deg,${C.gold},${C.goldDim})`, display: "grid", placeItems: "center" }}><Zap size={20} color="#000" fill="#000" /></div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 13, color: C.gold, letterSpacing: "0.12em" }}>GOLDEN VAULT XM</div>
            <div style={{ fontSize: 9, color: C.text3, letterSpacing: "0.2em", marginTop: 1 }}>ELITE TRADING</div>
          </div>
        </div>

        {/* Heading */}
        <div style={{ fontWeight: 900, fontSize: 24, color: C.text, marginBottom: 4 }}>{authMode === "signup" ? "Create Account" : "Welcome Back"}</div>
        <div style={{ fontSize: 13, color: C.text3, marginBottom: 22, lineHeight: 1.5 }}>{authMode === "signup" ? "Join thousands of institutional traders worldwide." : "Sign in to access your trading dashboard."}</div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {authMode === "signup" && (
            <input placeholder="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp} />
          )}
          <input placeholder="Email address" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inp} />
          <div style={{ position: "relative" }}>
            <input placeholder="Password" type={showPw ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} onKeyDown={e => e.key === "Enter" && handle()} style={{ ...inp, paddingRight: 46 }} />
            <button onClick={() => setShowPw(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.text3 }}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </div>
        </div>

        {/* Age + Terms checkbox (signup only) */}
        {authMode === "signup" && (
          <div
            onClick={() => setAgreed(a => !a)}
            style={{ display: "flex", alignItems: "flex-start", gap: 11, marginTop: 14, padding: "13px 14px", background: C.card2, border: `1px solid ${agreed ? C.gold + "55" : C.border2}`, borderRadius: 12, cursor: "pointer", transition: "border-color .2s" }}
          >
            {/* Custom checkbox */}
            <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${agreed ? C.gold : C.text3}`, background: agreed ? C.gold : "transparent", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1, transition: "all .15s" }}>
              {agreed && <CheckCircle2 size={11} color="#000" strokeWidth={3} />}
            </div>
            <span style={{ fontSize: 12, color: C.text2, lineHeight: 1.6 }}>
              I confirm I am <strong style={{ color: C.text }}>18 years of age or older</strong>, and I agree to the{" "}
              <span style={{ color: C.gold, fontWeight: 700 }}>Terms of Service</span>,{" "}
              <span style={{ color: C.gold, fontWeight: 700 }}>Acceptable Use Policy</span>, and{" "}
              <span style={{ color: C.gold, fontWeight: 700 }}>Privacy Policy</span> of Golden Vault XM.
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: "10px 12px", background: `${C.red}14`, border: `1px solid ${C.red}33`, borderRadius: 9 }}>
            <AlertCircle size={13} color={C.red} /><span style={{ fontSize: 12, color: C.red }}>{error}</span>
          </div>
        )}

        {/* Submit */}
        <Btn variant="gold" onClick={handle} loading={loading} disabled={authMode === "signup" && !agreed} style={{ width: "100%", marginTop: 16, borderRadius: 12, padding: "14px 16px", fontSize: 15 }}>
          {authMode === "signup" ? <><UserPlus size={16} /> Create Account</> : <><LogIn size={16} /> Sign In</>}
        </Btn>

        {/* Trust badges (signup only) */}
        {authMode === "signup" && (
          <div style={{ display: "flex", justifyContent: "center", gap: 20, marginTop: 14 }}>
            {[["🔒", "Encrypted"], ["✅", "Regulated"], ["🌐", "24/7 Support"]].map(([em, lbl]) => (
              <div key={lbl} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 16 }}>{em}</div>
                <div style={{ fontSize: 9, color: C.text3, marginTop: 3, letterSpacing: "0.04em" }}>{lbl}</div>
              </div>
            ))}
          </div>
        )}

        {/* Switch mode */}
        <div style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: C.text3 }}>
          {authMode === "signup" ? "Already have an account? " : "Don't have an account? "}
          <button onClick={() => { setAuthMode(m => m === "signup" ? "login" : "signup"); setError(""); setAgreed(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.gold, fontWeight: 800, fontSize: 12 }}>
            {authMode === "signup" ? "Sign In" : "Create Account"}
          </button>
        </div>

      </div>
    </div>
  );
}

function AuthProvider({ children, onLogin }) {
  const [user, setUser] = useState(null);
  const [modal, setModal] = useState(null);
  const isAuthenticated = !!user;

  // Pick up session on mount (covers Google OAuth redirect-back)
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({ name: session.user.user_metadata?.full_name || session.user.email.split("@")[0], email: session.user.email });
        if (onLogin) onLogin();
      }
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUser({ name: session.user.user_metadata?.full_name || session.user.email.split("@")[0], email: session.user.email });
        setModal(null);
        if (onLogin) onLogin();
      }
      if (event === "SIGNED_OUT") setUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const login = (u) => { setUser(u); setModal(null); if (onLogin) onLogin(); };
  const logout = async () => { await supabase.auth.signOut(); setUser(null); };
  const requireAuth = (mode = "signup") => { if (!isAuthenticated) { setModal(mode); return false; } return true; };
  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, requireAuth }}>
      {children}
      {modal && <AuthModal onClose={() => setModal(null)} initialMode={modal} />}
    </AuthContext.Provider>
  );
}

function useNotifications() {
  const { user, isAuthenticated } = useAuth();
  const [notes, setNotes] = useState([]);

  useEffect(() => {
    if (!isAuthenticated || !user?.email) return;
    const fetchNotes = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id, title, body, read, created_at')
        .eq('recipient_email', user.email)
        .order('created_at', { ascending: false })
        .limit(30);
      if (data) setNotes(data);
    };
    fetchNotes();
    const channel = supabase
      .channel('notifications-live')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_email=eq.${user.email}` },
        payload => setNotes(prev => [payload.new, ...prev])
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [isAuthenticated, user?.email]);

  const markAllRead = async () => {
    const unreadIds = notes.filter(n => !n.read).map(n => n.id);
    if (!unreadIds.length) return;
    await supabase.from('notifications').update({ read: true }).in('id', unreadIds);
    setNotes(prev => prev.map(n => ({ ...n, read: true })));
  };

  const unreadCount = notes.filter(n => !n.read).length;
  return { notes, unreadCount, markAllRead };
}

function Nav({ page, setPage, open, setOpen, openDeposit }) {
  const { isAuthenticated, logout, requireAuth, user } = useAuth();
  const { notes, unreadCount, markAllRead } = useNotifications();
  const [bellOpen, setBellOpen] = useState(false);

  const MENU_ITEMS = [
    { icon: Settings,        label: "Profile",           color: C.gold,    onClick: () => { setPage("profile");  setOpen(false); } },
    { icon: ArrowDownToLine, label: "Deposit",           color: C.green,   onClick: () => { setOpen(false); openDeposit && openDeposit(); } },
    { icon: ArrowUpFromLine, label: "Withdraw",          color: "#f59e0b", onClick: () => { setPage("trade");    setOpen(false); } },
    { icon: BarChart2,       label: "Markets",           color: C.blue,    onClick: () => { setPage("markets");  setOpen(false); } },
    { icon: Lock,            label: "Settings & Privacy",color: C.purple,  onClick: () => { setPage("settings"); setOpen(false); } },
    { icon: Mail,            label: "Support",           color: C.gold,    onClick: () => { setPage("support");  setOpen(false); } },
    { icon: Cpu,             label: "Mining",            color: C.green,   onClick: () => { setPage("mining");   setOpen(false); } },
  ];

  return (
  <>
    <div style={{ height: 59 }} />
    <header style={{ position: "fixed", top: 0, left: 0, right: 0, margin: "0 auto", width: "100%", maxWidth: 1920, boxSizing: "border-box", zIndex: 100, background: C.bg, borderBottom: `1px solid ${C.border}`, padding: "0 16px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img src="/IMG_20260512_072009_2.webp.webp" alt="Golden Vault XM" style={{ height: 40, width: "auto", display: "block", flexShrink: 0 }} />
        <div style={{ fontFamily: "'Inter','Roboto','Arial',sans-serif", fontWeight: 700, fontSize: 16 }}>
          <span style={{ color: C.text }}>GOLDEN VAULT </span><span style={{ color: "#ef4444" }}>XM</span>
        </div>
     </div>
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>

        {/* Bell */}
        <div style={{ position: "relative" }}>
          <button onClick={() => { setBellOpen(b => !b); setOpen(false); if (!bellOpen) markAllRead(); }} style={{ background: "none", border: "none", cursor: "pointer", color: unreadCount > 0 ? C.gold : C.text3, padding: 8, position: "relative" }}>
            <Bell size={17} />
            {unreadCount > 0 && (
              <span style={{ position: "absolute", top: 4, right: 4, width: 16, height: 16, borderRadius: "50%", background: C.red, color: "#fff", fontSize: 9, fontWeight: 900, display: "grid", placeItems: "center" }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          {bellOpen && (
            <div style={{ position: "fixed", top: 58, right: 0, width: "min(340px, 96vw)", maxHeight: "70vh", overflowY: "auto", background: C.card, border: `1px solid ${C.border2}`, borderRadius: "0 0 14px 14px", boxShadow: "0 16px 48px #000a", zIndex: 400 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px 10px", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontWeight: 800, fontSize: 14, color: C.text }}>Notifications</span>
                <button onClick={() => setBellOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.text3 }}><X size={16} /></button>
              </div>
              {notes.length === 0 ? (
                <div style={{ padding: "32px 16px", textAlign: "center", color: C.text3, fontSize: 13 }}>No notifications yet</div>
              ) : (
                notes.map((n, i) => (
                  <div key={n.id} style={{ padding: "13px 16px", borderBottom: i < notes.length - 1 ? `1px solid ${C.border}` : "none", background: n.read ? "transparent" : `${C.gold}08` }}>
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: n.read ? C.text4 : C.gold, flexShrink: 0, marginTop: 4 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: C.text, marginBottom: 3 }}>{n.title}</div>
                        <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.5 }}>{n.body}</div>
                        <div style={{ fontSize: 10, color: C.text3, marginTop: 5 }}>{new Date(n.created_at).toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Hamburger */}
        <button onClick={() => { setOpen(!open); setBellOpen(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.text2, padding: 8 }}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Bell backdrop */}
      {bellOpen && <div onClick={() => setBellOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 399 }} />}

      {/* ── Compact right-side dropdown menu ── */}
      {open && (
        <>
          {/* Backdrop */}
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 298 }} />

          {/* Dropdown panel — anchored to top-right, always fully visible */}
          <div style={{
            position: "fixed",
            top: 62,
            right: 12,
            width: 220,
            zIndex: 299,
            background: C.card,
            border: `1px solid ${C.border2}`,
            borderRadius: 16,
            boxShadow: "0 8px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(217,119,6,0.1)",
            overflow: "hidden",
          }}>
            {/* User info header */}
            <div style={{ padding: "14px 16px 12px", borderBottom: `1px solid ${C.border}`, background: `${C.gold}08` }}>
              <div style={{ fontSize: 12, fontWeight: 800, color: C.text }}>{user?.email?.split("@")[0] || "Guest"}</div>
              <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>{isAuthenticated ? "Verified Account" : "Not logged in"}</div>
            </div>

            {/* All 6 menu items */}
            {MENU_ITEMS.map((item, i) => (
              <button
                key={i}
                onClick={item.onClick}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  width: "100%",
                  padding: "12px 16px",
                  background: "none",
                  border: "none",
                  borderBottom: i < MENU_ITEMS.length - 1 ? `1px solid ${C.border}` : "none",
                  cursor: "pointer",
                  textAlign: "left",
                  boxSizing: "border-box",
                }}
                onMouseEnter={e => e.currentTarget.style.background = `${item.color}10`}
                onMouseLeave={e => e.currentTarget.style.background = "none"}
              >
                <div style={{ width: 28, height: 28, borderRadius: 8, background: `${item.color}18`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <item.icon size={13} color={item.color} />
                </div>
                <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{item.label}</span>
              </button>
            ))}

            {/* Sign out / in */}
            <div style={{ borderTop: `1px solid ${C.border}` }}>
              {isAuthenticated
                ? <button onClick={() => { logout(); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = `${C.red}10`}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${C.red}18`, display: "grid", placeItems: "center" }}><LogOut size={13} color={C.red} /></div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.red }}>Sign Out</span>
                  </button>
                : <button onClick={() => { requireAuth("signup"); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 16px", background: "none", border: "none", cursor: "pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background = `${C.gold}10`}
                    onMouseLeave={e => e.currentTarget.style.background = "none"}>
                    <div style={{ width: 28, height: 28, borderRadius: 8, background: `${C.gold}18`, display: "grid", placeItems: "center" }}><UserPlus size={13} color={C.gold} /></div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: C.gold }}>Sign Up / Login</span>
                  </button>
              }
            </div>
          </div>
        </>
      )}
    </header>
    </>
  );
}

function BottomNav({ page, setPage, newsCount }) {
  const { isAuthenticated, requireAuth } = useAuth();
  const { width, mode } = useLayout();
  if (mode === "desktop") return null;
  const TABS = [{ id: "home", icon: Home, label: "Home" }, { id: "markets", icon: BarChart2, label: "Markets" }, { id: "trade", icon: Zap, label: "Trade" }, { id: "news", icon: Newspaper, label: "News" }, { id: "settings", icon: Settings, label: "More" },];  return (
    <nav className="gvxm-shell" style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: width, minWidth: 0, background: `${C.bg}f2`, backdropFilter: "blur(16px)", borderTop: `1px solid ${C.border}`, display: "flex", padding: "8px 0 20px", zIndex: 50 }}>
      {TABS.map(t => {
        const active = page === t.id; const locked = t.id === "trade" && !isAuthenticated;
        return (
          <button key={t.id} onClick={() => { if (locked) { requireAuth("signup"); return; } setPage(t.id); }} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "4px 0", }}>
            <div style={{ width: active ? 36 : 28, height: active ? 36 : 28, borderRadius: active ? 10 : 8, background: active ? `${C.gold}22` : "transparent", display: "grid", placeItems: "center", transition: "all .2s", position: "relative" }}><t.icon size={18} color={active ? C.gold : C.text4} /> {locked && (<div style={{ position: "absolute", top: -2, right: -2, width: 10, height: 10, background: C.card, borderRadius: "50%", display: "grid", placeItems: "center" }}><Lock size={6} color={C.text3} /></div>)}</div>
            <span style={{ fontSize: 10, fontWeight: 800, color: active ? C.gold : C.text4, letterSpacing: "0.04em" }}>{t.label}</span>
          {t.id === "news" && newsCount > 0 && (
  <span style={{ position: "absolute", top: 2, right: 2, width: 8, height: 8, borderRadius: "50%", background: C.gold }} />
)}
          </button>
        );
      })}
    </nav>
  );
}

/* ─── PAGES (Modified TradePage) ────────────────────────────────────────── */
function useSlideIn(direction = "left") {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  const style = {
    opacity: visible ? 1 : 0,
    transform: visible ? "translateX(0)" : direction === "left" ? "translateX(-60px)" : "translateX(60px)",
    transition: "opacity 0.6s ease, transform 0.6s ease",
  };
  return [ref, style];
}

function SlideIn({ direction = "left", delay = 0, children }) {
  const ref = useRef(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.12 });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? "translateX(0)" : direction === "left" ? "translateX(-70px)" : "translateX(70px)",
      transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
    }}>
      {children}
    </div>
  );
}
const INVEST_OPTIONS = [
  { title: "Forex Trading", desc: "Trade global currencies 24/5.", icon: "💱", color: "#3b82f6" },
  { title: "Cryptocurrency", desc: "Invest in top digital assets.", icon: "₿", color: "#22c55e" },
  { title: "Gold & Precious Metals", desc: "Stable value, long-term wealth.", icon: "🥇", color: "#f59e0b" },
  { title: "Stocks & ETFs", desc: "Own shares in top companies.", icon: "📈", color: "#06b6d4" },
  { title: "Real Estate", desc: "Build wealth through property.", icon: "🏠", color: "#f97316" },
  { title: "Agriculture & Farming", desc: "Invest in food security and growth.", icon: "🌱", color: "#22c55e" },
  { title: "Oil & Commodities", desc: "Profit from global demand.", icon: "🛢️", color: "#a3a3a3" },
  { title: "Mining", desc: "Tap into natural resources.", icon: "⛏️", color: "#7c3aed" },
  { title: "AI / Automated Trading", desc: "Smarter trades, better results.", icon: "🤖", color: "#3b82f6" },
  { title: "Bonds & Fixed Income", desc: "Stable returns, lower risk.", icon: "📄", color: "#60a5fa" },
  { title: "Business Funding", desc: "Support businesses, get returns.", icon: "🤝", color: "#f59e0b" },
  { title: "Renewable Energy", desc: "Invest in a cleaner, brighter future.", icon: "☀️", color: "#10b981" },
];

function InvestmentSection({ onExplore }) {
  const ACCENT = "#1de9b6";
  return (
    <div
      style={{
        marginTop: 14,
        padding: "22px 0 14px",
        background: `linear-gradient(180deg,rgba(8,12,20,0.78) 0%,rgba(8,12,20,0.88) 100%), url(./investment-bg.jpg) center top/cover no-repeat`,
        borderRadius: 16,
        border: "1px solid #14202e",
        overflow: "hidden",
      }}
    >
      <style>{`.inv-scroll::-webkit-scrollbar{display:none}`}</style>

      {/* Header */}
      <div style={{ padding: "0 18px" }}>
        <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.2em", color: "#22d3ee", textTransform: "uppercase" }}>
          More ways to grow
        </div>
        <div style={{ fontSize: 38, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.02em", marginTop: 10, color: "#fff" }}>
          Investment
          <br />
          <span style={{ color: ACCENT }}>Opportunities</span>
        </div>
        <div style={{ fontSize: 13, color: "#d4d8e0", lineHeight: 1.55, marginTop: 14, maxWidth: 320 }}>
          Explore a wide range of investment options with high potential returns and multiple income streams.
        </div>
        <button
          onClick={onExplore}
          style={{
            marginTop: 18,
            background: ACCENT,
            color: "#04130f",
            border: "none",
            borderRadius: 999,
            padding: "13px 24px",
            fontWeight: 800,
            fontSize: 14,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          Explore All Options <span style={{ fontSize: 16 }}>→</span>
        </button>
      </div>

      {/* Sliding cards: 3 rows, scrolls sideways */}
      <div
        className="inv-scroll"
        style={{
          marginTop: 20,
          display: "grid",
          gridTemplateRows: "repeat(3, auto)",
          gridAutoFlow: "column",
          gridAutoColumns: "230px",
          gap: 10,
          overflowX: "auto",
          scrollSnapType: "x proximity",
          WebkitOverflowScrolling: "touch",
          scrollbarWidth: "none",
          padding: "4px 18px 10px",
        }}
      >
        {INVEST_OPTIONS.map(o => (
          <div
            key={o.title}
            onClick={onExplore}
            style={{
              scrollSnapAlign: "start",
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 14px",
              borderRadius: 14,
              cursor: "pointer",
              background: `linear-gradient(145deg, ${o.color}26, #0a1020 65%)`,
              border: `1px solid ${o.color}77`,
              boxSizing: "border-box",
              position: "relative",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                flexShrink: 0,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontSize: 26,
                background: `radial-gradient(circle, ${o.color}44, transparent 70%)`,
              }}
            >
              {o.icon}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: 13, color: "#fff", lineHeight: 1.2 }}>{o.title}</div>
              <div style={{ fontSize: 11, color: "#9aa3b2", lineHeight: 1.4, marginTop: 4 }}>{o.desc}</div>
            </div>
            <div style={{ position: "absolute", right: 12, bottom: 8, color: o.color, fontWeight: 800, fontSize: 14 }}>→</div>
          </div>
        ))}
      </div>
    </div>
  );
}
/* ── Business Sectors ─────────────────────────────────────────────
 * Paste this ABOVE `function HomePage` in GoldenVaultXM.jsx.
 * Images go in your /public/sectors/ folder (see file names below).
 */
const SECTORS = [
  { name: "Real Estate Development", img: "/sectors/real-estate.jpg",   icon: "🏢", color: "#22d3ee" },
  { name: "Agriculture",             img: "/sectors/agriculture.jpg",   icon: "🌱", color: "#22c55e" },
  { name: "Poultry Farming",         img: "/sectors/poultry.jpg",       icon: "🐔", color: "#fbbf24" },
  { name: "Oil & Gas",               img: "/sectors/oil-gas.jpg",       icon: "🛢️", color: "#ec4899" },
  { name: "Mining",                  img: "/sectors/mining.jpg",        icon: "⛏️", color: "#f59e0b" },
  { name: "Logistics & Transportation", img: "/sectors/logistics.jpg",  icon: "🚚", color: "#22d3ee" },
  { name: "Technology",              img: "/sectors/technology.jpg",    icon: "💻", color: "#3b82f6" },
  { name: "E-commerce",              img: "/sectors/ecommerce.jpg",     icon: "🛍️", color: "#ec4899" },
  { name: "Manufacturing",           img: "/sectors/manufacturing.jpg", icon: "🏭", color: "#3b82f6" },
  { name: "Renewable Energy",        img: "/sectors/renewable.jpg",     icon: "☀️", color: "#10b981" },
  { name: "Food & Hospitality",      img: "/sectors/food.jpg",          icon: "🍽️", color: "#f59e0b" },
  { name: "Construction",            img: "/sectors/construction.jpg",  icon: "🏗️", color: "#a3a3a3" },
  { name: "Import / Export",         img: "/sectors/import-export.jpg", icon: "🚢", color: "#3b82f6" },
  { name: "Healthcare",              img: "/sectors/healthcare.jpg",    icon: "🏥", color: "#60a5fa" },
];

function BusinessSectors({ onViewAll }) {
  const PURPLE = "#8b3cf7";
  return (
    <div
      style={{
        marginTop: 14,
        padding: "26px 0 20px",
        background: "transparent",
border: "none",
borderRadius: 0,
        overflow: "hidden",
        fontFamily: "'Inter','Segoe UI',Roboto,Arial,sans-serif",
      }}
    >
      <style>{`.sector-scroll::-webkit-scrollbar{display:none}`}</style>

      {/* Left panel: heading + button */}
      <div style={{ padding: "0 18px" }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.12em", color: "#22d3ee", textTransform: "uppercase" }}>
          Real projects. Real impact.
        </div>
        <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.05, letterSpacing: "-0.02em", marginTop: 10, color: "#fff" }}>
          Business <span style={{ color: PURPLE }}>Sectors</span>
        </div>
        <div style={{ fontSize: 14, color: "#d4d8e0", lineHeight: 1.55, marginTop: 14, maxWidth: 320 }}>
          Invest in growing industries and be part of real-world success stories.
        </div>
        <button
          onClick={onViewAll}
          style={{
            marginTop: 18,
            background: PURPLE,
            color: "#fff",
            border: "none",
            borderRadius: 999,
            padding: "13px 24px",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          View All Sections <span style={{ fontSize: 16 }}>→</span>
        </button>
      </div>

      {/* Sideways-scrolling cards: 3 rows, scrolls horizontally */}
      <div
        className="sector-scroll"
        style={{
          marginTop: 22,
          display: "grid",
          gridTemplateRows: "repeat(3, auto)",
          gridAutoFlow: "column",
          gridAutoColumns: "158px",
          gap: 10,
          overflowX: "auto",
          padding: "0 18px 6px",
          scrollSnapType: "x proximity",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {SECTORS.map((s) => (
          <div
            key={s.name}
            onClick={onViewAll}
            style={{
              scrollSnapAlign: "start",
              borderRadius: 12,
              overflow: "hidden",
              cursor: "pointer",
              background: "#0a1226",
              border: "1px solid rgba(96,165,250,0.35)",
              boxShadow: "0 0 12px rgba(59,130,246,0.12)",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {/* Real-life photo */}
            <img
              src={s.img.replace(".jpg", "-1.jpg")}
              alt={s.name}
              loading="lazy"
              style={{ width: "100%", height: 84, objectFit: "cover", display: "block" }}
            />
            {/* Icon + name under the photo */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 10px",
                minHeight: 46,
                background: "linear-gradient(180deg,#0c1630,#08101f)",
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  flexShrink: 0,
                  borderRadius: 7,
                  display: "grid",
                  placeItems: "center",
                  fontSize: 13,
                  background: `${s.color}28`,
                }}
              >
                {s.icon}
              </div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#fff", lineHeight: 1.2 }}>{s.name}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
/* ── SECTOR DETAILS (long version) ────────────────────────────
 * Replaces the earlier SECTOR_INFO + SectorDetails.
 * Each sector has three parts: what it is, how it works, why it matters.
 * ------------------------------------------------------------ */

const SECTOR_INFO = {
  "Real Estate Development": {
    what: "Real estate development turns land into finished places: apartment blocks, offices, retail centres and gated communities. Developers buy or lease land, secure permits, design the project, build it, then sell or rent the units.",
    how: "Capital funds each stage, from land and architects to materials and contractors. Projects are delivered in phases, so completed units can be sold or leased while later phases are still being built.",
    why: "Cities keep growing and people always need homes and workplaces. Property is a physical asset with lasting value, though timelines, permits and local demand all affect results.",
  },
  "Agriculture": {
    what: "Agriculture covers growing crops such as grains, vegetables and fruit, and supplying them to processors, wholesalers and retailers. Modern farms use irrigation, quality seed, fertiliser and machinery to raise the yield of every hectare.",
    how: "Funds pay for seed, land preparation, labour, equipment and storage. Each season runs from planting to harvest, and the crop is sold into local and regional markets.",
    why: "Food demand is constant and grows with the population. Weather, pests and market prices can swing a season's outcome, which is why good planning and storage matter.",
  },
  "Poultry Farming": {
    what: "Poultry farms raise chickens for eggs and meat. Birds live in managed sheds with controlled feed, water, temperature and vaccination programmes.",
    how: "Investment covers housing, chicks, feed, veterinary care and distribution. Broilers reach market weight within weeks and laying hens produce eggs every day, so income arrives in short, repeating cycles.",
    why: "Chicken and eggs are among the most affordable proteins, so demand is steady. Feed prices and disease control are the main risks, and strong management keeps both in check.",
  },
  "Oil & Gas": {
    what: "Oil and gas companies find, extract, refine and distribute fuels, along with the raw materials used in plastics, fertiliser and chemicals. The work spans exploration, drilling, processing and supply.",
    how: "It is capital-heavy: surveys, rigs, pipelines and refineries cost a lot, and revenue comes from selling output at market prices.",
    why: "Transport, power and industry still run largely on these fuels, so global demand is large. Prices move with supply, politics and the energy transition, so this sector can be volatile.",
  },
  "Mining": {
    what: "Mining extracts minerals and metals such as gold, copper, iron ore and coal from the earth. Operations include surveying, excavation, crushing, processing and shipping.",
    how: "Funds pay for equipment, labour, permits and site safety. Output is sold to smelters, manufacturers and traders at commodity prices.",
    why: "Phones, cars, buildings and power grids all depend on mined materials. Commodity prices and regulation drive results, so costs and site quality matter.",
  },
  "Logistics & Transportation": {
    what: "Logistics moves goods from where they are made to where they are needed, using trucks, rail, ships, aircraft, warehouses and tracking software.",
    how: "Investment goes into vehicles, drivers, fuel, storage space and routing technology. Revenue comes from freight and delivery contracts, which often repeat month after month.",
    why: "Every product in a shop or at your door travelled through this chain. Growing online shopping and trade keep demand high, while fuel costs and vehicle use shape margins.",
  },
  "Technology": {
    what: "Technology businesses build software, apps, cloud services, hardware and data tools that other companies and consumers pay to use.",
    how: "Funds cover engineers, product design, servers, security and marketing. Many products earn recurring subscription income, and one product can serve many customers at low extra cost.",
    why: "Almost every industry now depends on digital tools. Competition is intense and products must keep improving, so execution and customer retention are what count.",
  },
  "E-commerce": {
    what: "E-commerce sells products through websites and apps, either from its own stock or through a marketplace of independent sellers.",
    how: "Money goes into inventory, site and payments technology, marketing, warehousing and delivery. Revenue comes from each sale, and repeat buyers lower the cost of winning customers.",
    why: "Shopping keeps moving online, and a store can reach customers well beyond one town. Margins depend on logistics, returns and advertising costs.",
  },
  "Manufacturing": {
    what: "Manufacturers turn raw materials into finished goods: packaged food, drinks, clothing, building materials, electronics and machinery.",
    how: "Capital buys machinery, factory space, materials and skilled workers. Output is sold to retailers, distributors and other businesses, and scale lowers the cost of each unit.",
    why: "Local production creates jobs and supplies markets reliably. Success depends on quality control, a steady supply of inputs and efficient production lines.",
  },
  "Renewable Energy": {
    what: "Renewable energy projects generate power from sunlight, wind, water and other sources that renew naturally, such as solar farms and wind turbines.",
    how: "Most of the cost comes upfront, for panels, turbines, land and grid connection. After that, running costs are low and electricity is sold to the grid or to businesses, often under long contracts.",
    why: "Governments and companies are shifting toward cleaner power, and demand for electricity keeps rising. Policy changes and project permits are the main factors to watch.",
  },
  "Food & Hospitality": {
    what: "This sector covers restaurants, cafés, hotels, catering and event venues: any business that feeds, hosts and entertains people.",
    how: "Funds pay for premises, kitchens, furnishing, staff, supplies and marketing. Income comes from daily sales, bookings and events, so busy locations earn steadily.",
    why: "People eat out and travel all year, and strong brands build loyal customers. Location, service quality and food costs decide how well a venue performs.",
  },
  "Construction": {
    what: "Construction companies build roads, bridges, housing, offices and public facilities, managing design, materials, labour and safety on each site.",
    how: "Projects are funded in stages: site preparation, materials, equipment hire and wages. Payment follows milestones as the work is completed and approved.",
    why: "Growing populations and ageing infrastructure create steady demand for new building and repair. Cost control and on-time delivery protect margins.",
  },
  "Import / Export": {
    what: "Import and export businesses buy goods in one country and sell them in another, handling sourcing, shipping, customs paperwork and delivery.",
    how: "Capital buys stock, pays freight and insurance, and covers duties. Profit comes from the gap between purchase price and resale price, so reliable suppliers and buyers are key.",
    why: "No country produces everything it needs, so trade is constant. Exchange rates, tariffs and shipping delays can affect results.",
  },
  "Healthcare": {
    what: "Healthcare businesses run clinics, laboratories, diagnostic centres, pharmacies and medical services that help people stay well and recover.",
    how: "Funds pay for premises, medical equipment, qualified staff, licences and supplies. Revenue comes from consultations, tests, treatments and pharmacy sales.",
    why: "Demand for care is steady in every economy and rises as populations age. Licensing, quality standards and skilled staff are central to running it well.",
  },
};

const SECTOR_PARTS = [
  ["what", "What it is"],
  ["how", "How it works"],
  ["why", "Why it matters"],
];

function SectorDetails({ onViewAll }) {
  return (
    <div style={{ padding: "34px 18px 10px" }}>
      <div style={{ fontSize: 30, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", color: "#fff" }}>
        Every sector, explained
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.55, color: "#d4d8e0", marginTop: 10, maxWidth: 560 }}>
        See what each industry does, how it earns, and why it matters.
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
          gap: 18,
          marginTop: 24,
        }}
      >
        {SECTORS.map((s) => {
          const info = SECTOR_INFO[s.name] || {};
          return (
            <div
              key={s.name}
              style={{
                borderRadius: 18,
                overflow: "hidden",
                background: "#0a1226",
                border: `1px solid ${s.color}66`,
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  height: 170,
                  backgroundImage: `linear-gradient(180deg, rgba(8,8,8,0) 40%, rgba(10,18,38,1) 100%), url(${s.img.replace(".jpg", "-1.jpg")})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
              <div style={{ padding: "6px 20px 22px", display: "flex", flexDirection: "column", gap: 14, flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 40, height: 40, flexShrink: 0, borderRadius: 10,
                      display: "grid", placeItems: "center", fontSize: 21,
                      background: `${s.color}28`,
                    }}
                  >
                    {s.icon}
                  </div>
                  <div style={{ fontSize: 21, fontWeight: 900, lineHeight: 1.2, color: "#fff" }}>{s.name}</div>
                </div>

                {SECTOR_PARTS.map(([key, label]) => (
                  <div key={key}>
                    <div style={{ fontSize: 14, fontWeight: 900, color: s.color, marginBottom: 4 }}>{label}</div>
                    <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.65, color: "#c3c9d6" }}>{info[key]}</div>
                  </div>
                ))}

                <button
                  onClick={onViewAll}
                  style={{
                    alignSelf: "flex-start", marginTop: 4,
                    background: "transparent", color: s.color,
                    border: `1.5px solid ${s.color}`, borderRadius: 999,
                    padding: "10px 20px", fontSize: 13, fontWeight: 800, cursor: "pointer",
                  }}
                >
                  Invest in this sector
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.5, color: "#7d8596", marginTop: 20 }}>
        Returns are backed by a transparent investment structure, with your account protected by industry-standard security and encryption. Invest with confidence and join a trusted community focused on sustainable growth🎖️.
      </div>
    </div>
  );
}
function SectorsPage({ setPage }) {
  const { requireAuth } = useAuth();
  const go = () => { if (requireAuth("signup")) setPage("trade"); };
  useEffect(() => { window.scrollTo(0, 0); }, []);
  return (
    <div style={{ paddingTop: 20 }}>
      <button
        onClick={() => setPage("home")}
        style={{ background: "none", border: "none", color: C.gold3, fontSize: 15, fontWeight: 800, cursor: "pointer", padding: "0 18px" }}
      >
        ← Back to home
      </button>
      <SectorDetails onViewAll={go} />
    </div>
  );
}
/* ── Then, inside HomePage, right after the InvestmentSection block
 * (the </SlideIn> on ~line 1221), add:
 *
 *   <SlideIn direction="left" delay={0}>
 *     <BusinessSectors onViewAll={handleCTA} />
 *   </SlideIn>
 */
/* ── DESKTOP HOME ─────────────────────────────────────────────
 * Replaces the old `function DesktopHome` (lines 1348–1384) in GoldenVaultXM.jsx.
 * Uses only things that already exist in that file:
 *   C, Btn, SlideIn, useAuth, INVEST_OPTIONS, SECTORS,
 *   and the lucide icons Shield, Zap, Globe, TrendingUp, Activity, Target.
 * ------------------------------------------------------------ */

const DH_PLANS = [
  { name: "Juvenile", range: "$400 – $1,999", color: "#93c5fd",
    feats: ["Live trading bot", "96 hours of mining", "Net Profit / Growth %300"] },
  { name: "Standard", range: "$2,000 – $9,999", color: "#ffb703",
    feats: ["Live trading bot", "120 hours of mining", "Net Profit / Growth %500", "Personal account manager"] },
  { name: "Premium", range: "$10,000 – $49,999", color: "#f9a8d4",
    feats: ["Live trading bot", "168 hours of mining", "Net Profit / Growth %800", "Personal account manager"] },
  { name: "Ultra", range: "$50,000 – $1,000,000", color: "#7dd3fc", top: true,
    feats: ["Live trading bot", "Unlimited mining (priority)", "Net Profit / Growth %1,500+", "Dedicated account manager"] },
];

const DH_STEPS = [
  { t: "Register", d: "Create your secure account in minutes." },
  { t: "Verify", d: "Confirm your identity and protect your funds." },
  { t: "Fund", d: "Deposit crypto to your wallet." },
  { t: "Trade", d: "Open positions and watch them grow." },
];

const DH_CSS = `
  .dh-lift { transition: transform .25s ease, box-shadow .25s ease; }
  .dh-lift:hover { transform: translateY(-6px); box-shadow: 0 24px 60px rgba(0,0,0,.55); }
  .dh-btn { transition: transform .2s ease, filter .2s ease; }
  .dh-btn:hover { transform: translateY(-2px); filter: brightness(1.08); }
  .dh-btn:focus-visible, .dh-lift:focus-visible { outline: 3px solid #fbbf24; outline-offset: 3px; }
  @media (prefers-reduced-motion: reduce) {
    .dh-lift, .dh-btn { transition: none; }
    .dh-lift:hover, .dh-btn:hover { transform: none; }
  }
`;

function DhHead({ title, accent, sub }) {
  return (
    <div style={{ maxWidth: 760, marginBottom: 48 }}>
      <div style={{ fontSize: "clamp(36px, 4vw, 60px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.03em", color: C.text }}>
        {title} <span style={{ color: C.gold3 }}>{accent}</span>
      </div>
      {sub && (
        <div style={{ fontSize: 19, fontWeight: 700, lineHeight: 1.55, color: C.text2, marginTop: 18 }}>
          {sub}
        </div>
      )}
    </div>
  );
}

function DesktopHome({ setPage }) {
  const { requireAuth } = useAuth();
  const go = () => { if (requireAuth("signup")) setPage("trade"); };

  const FONT = "'Inter','Segoe UI',Roboto,Arial,sans-serif";
  const wrap = { maxWidth: 1600, margin: "0 auto", padding: "0 56px", boxSizing: "border-box", width: "100%" };
  const section = { padding: "96px 0", borderTop: `1px solid ${C.border}` };
  const gold = `linear-gradient(90deg, ${C.gold3}, ${C.gold2} 50%, ${C.gold})`;

  const stats = [
    ["$2.4B+", "Daily volume"],
    ["150K+", "Active traders"],
    ["200+", "Instruments"],
    ["24/7", "Support"],
  ];

  const why = [
    { icon: TrendingUp, t: "Advanced trading", d: "Institutional-grade tools and real-time analytics on every pair." },
    { icon: Shield, t: "Protected accounts", d: "Encrypted, verified and monitored around the clock." },
    { icon: Zap, t: "Instant execution", d: "Orders reach the market in milliseconds, not minutes." },
    { icon: Globe, t: "Global markets", d: "Forex, crypto, stocks, indices, commodities, futures and bonds." },
  ];

  return (
    <div style={{ width: "100%", fontFamily: FONT, color: C.text }}>
      <style>{DH_CSS}</style>

      {/* HERO */}
      <section
        style={{
          background: `linear-gradient(90deg, rgba(8,8,8,0.94) 0%, rgba(8,8,8,0.62) 100%), url(./hero-bg.jpg) center/cover no-repeat`,
          padding: "120px 0 110px",
        }}
      >
        <div style={{ ...wrap, display: "grid", gridTemplateColumns: "1.25fr 0.75fr", gap: 72, alignItems: "center" }}>
          <div>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 10, fontSize: 15, fontWeight: 800, color: C.green }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: C.green }} />
              System online. Live market data.
            </div>
            <div style={{ fontSize: "clamp(56px, 7.2vw, 120px)", fontWeight: 900, lineHeight: 0.98, letterSpacing: "-0.045em", marginTop: 24 }}>
              <div style={{ color: C.text }}>Precision.</div>
              <div style={{ background: gold, WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", WebkitTextFillColor: "transparent" }}>Velocity.</div>
              <div style={{ color: C.text }}>Insight.</div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.55, color: C.text2, maxWidth: 640, marginTop: 32 }}>
              Institutional-grade trading infrastructure, built for precision, performance and global market reach.
            </div>  
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 28, paddingLeft: 40, borderLeft: `1px solid ${C.gold}55` }}>
  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
    <button
      className="dh-btn"
      onClick={go}
      style={{ background: gold, color: "#000", border: "none", borderRadius: 14, padding: "22px 0", fontSize: 19, fontWeight: 900, cursor: "pointer", width: "100%" }}
    >
      Start trading
    </button>
    <button
      className="dh-btn"
      onClick={() => setPage("markets")}
      style={{ background: "transparent", color: C.text, border: `2px solid ${C.gold2}`, borderRadius: 14, padding: "20px 0", fontSize: 19, fontWeight: 900, cursor: "pointer", width: "100%" }}
    >
      Explore markets
    </button>
  </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
            {stats.map(([v, l]) => (
              <div
                key={l}
                style={{
                  background: "rgba(20,20,20,0.88)",
                  border: `1px solid ${C.gold}55`,
                  borderRadius: 20,
                  padding: "34px 28px",
                }}
              >
                <div style={{ fontSize: 46, fontWeight: 900, letterSpacing: "-0.03em", color: C.gold3 }}>{v}</div>
                <div style={{ fontSize: 16, fontWeight: 800, color: C.text2, marginTop: 8 }}>{l}</div>
              </div>
            ))}
          </div>
          </div>
        </div>
      </section>

      {/* WHY GOLDEN VAULT */}
      <section style={section}>
        <div style={wrap}>
          <DhHead
            title="Built for serious traders."
            accent="Run like a vault."
            sub="Every tool you need to trade with confidence, in one place."
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
            {why.map(({ icon: Icon, t, d }) => (
              <div key={t} className="dh-lift" style={{ background: C.card, border: `1px solid ${C.border2}`, borderRadius: 22, padding: 34 }}>
                <div style={{ width: 60, height: 60, borderRadius: 16, background: `${C.gold}22`, display: "grid", placeItems: "center" }}>
                  <Icon size={28} color={C.gold3} />
                </div>
                <div style={{ fontSize: 24, fontWeight: 900, marginTop: 24, letterSpacing: "-0.02em" }}>{t}</div>
                <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.6, color: C.text2, marginTop: 10 }}>{d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INVESTMENT OPPORTUNITIES */}
      <section style={{ ...section, background: C.card }}>
        <div style={wrap}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 32 }}>
            <DhHead
              title="More ways to grow."
              accent="Investment opportunities."
              sub="Explore a wide range of options with high potential returns and multiple income streams."
            />
            <button
              className="dh-btn"
              onClick={go}
              style={{ background: gold, color: "#000", border: "none", borderRadius: 14, padding: "18px 34px", fontSize: 17, fontWeight: 900, cursor: "pointer", marginBottom: 48, flexShrink: 0 }}
            >
              Explore all options
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 20 }}>
            {INVEST_OPTIONS.map((o) => (
              <div
                key={o.title}
                className="dh-lift"
                onClick={go}
                style={{
                  cursor: "pointer",
                  background: `linear-gradient(145deg, ${o.color}26, #0a1020 65%)`,
                  border: `1px solid ${o.color}77`,
                  borderRadius: 20,
                  padding: 28,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                  minHeight: 190,
                }}
              >
                <div style={{ width: 56, height: 56, borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 28, background: `radial-gradient(circle, ${o.color}44, transparent 70%)` }}>
                  {o.icon}
                </div>
                <div style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", color: "#fff" }}>{o.title}</div>
                <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.5, color: "#b4bccb" }}>{o.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* BUSINESS SECTORS */}
      <section style={section}>
        <div style={wrap}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 32 }}>
            <DhHead
              title="Real projects."
              accent="Real impact."
              sub="Invest in growing industries and be part of real-world success stories."
            />
            <button
              className="dh-btn"
              onClick={go}
              style={{ background: "#8b3cf7", color: "#fff", border: "none", borderRadius: 14, padding: "18px 34px", fontSize: 17, fontWeight: 900, cursor: "pointer", marginBottom: 48, flexShrink: 0 }}
            >
              View all sectors
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 22 }}>
            {SECTORS.slice(0, 8).map((s) => (
              <div
                key={s.name}
                className="dh-lift"
                onClick={go}
                style={{
                  cursor: "pointer",
                  minHeight: 260,
                  borderRadius: 22,
                  border: `1px solid ${s.color}55`,
                  backgroundImage: `linear-gradient(180deg, rgba(8,8,8,0.05) 25%, rgba(8,8,8,0.94) 100%), url(${s.img.replace(".jpg", "-1.jpg")})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  display: "flex",
                  alignItems: "flex-end",
                  padding: 26,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontSize: 26 }}>{s.icon}</span>
                  <span style={{ fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em", color: "#fff", lineHeight: 1.15 }}>{s.name}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANS */}
      <section style={{ ...section, background: C.card }}>
        <div style={wrap}>
          <DhHead
            title="Choose your plan."
            accent="Grow at your pace."
            sub="Four tiers, each with a live trading bot working for you."
          />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24, alignItems: "stretch" }}>
            {DH_PLANS.map((p) => (
              <div
                key={p.name}
                className="dh-lift"
                style={{
                  background: C.bg,
                  border: `2px solid ${p.top ? p.color : p.color + "55"}`,
                  borderRadius: 24,
                  padding: 34,
                  display: "flex",
                  flexDirection: "column",
                  boxShadow: p.top ? `0 0 60px ${p.color}22` : "none",
                }}
              >
                <div style={{ fontSize: 32, fontWeight: 900, letterSpacing: "-0.03em", color: p.color }}>{p.name}</div>
                <div style={{ fontSize: 22, fontWeight: 900, marginTop: 10, color: C.text }}>
                  {p.range}
                  {p.top && <span style={{ fontSize: 13, fontWeight: 800, marginLeft: 8, color: C.text2 }}>max</span>}
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 14, margin: "28px 0", flex: 1 }}>
                  {p.feats.map((f) => (
                    <div key={f} style={{ display: "flex", gap: 10, fontSize: 16, fontWeight: 800, lineHeight: 1.4, color: C.text }}>
                      <span style={{ color: p.color, fontWeight: 900 }}>✓</span>
                      {f}
                    </div>
                  ))}
                </div>
                <button
                  className="dh-btn"
                  onClick={go}
                  style={{ background: p.color, color: "#0b1220", border: "none", borderRadius: 14, padding: "17px 0", fontSize: 17, fontWeight: 900, cursor: "pointer", width: "100%" }}
                >
                  Get started
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* GET STARTED STEPS */}
      <section style={section}>
        <div style={wrap}>
          <DhHead title="Get started in" accent="four steps." sub="From sign-up to your first trade in minutes." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 24 }}>
            {DH_STEPS.map((s, i) => (
              <div key={s.t} style={{ borderTop: `4px solid ${C.gold2}`, paddingTop: 24 }}>
                <div style={{ fontSize: 64, fontWeight: 900, letterSpacing: "-0.04em", color: C.gold3, lineHeight: 1 }}>{i + 1}</div>
                <div style={{ fontSize: 26, fontWeight: 900, marginTop: 16, letterSpacing: "-0.02em" }}>{s.t}</div>
                <div style={{ fontSize: 17, fontWeight: 700, lineHeight: 1.55, color: C.text2, marginTop: 8 }}>{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CALL TO ACTION */}
      <section style={{ padding: "110px 0", background: `linear-gradient(135deg, #130c00, #0d0800)`, borderTop: `1px solid ${C.gold}44` }}>
        <div style={{ ...wrap, textAlign: "center" }}>
          <div style={{ fontSize: "clamp(40px, 5vw, 76px)", fontWeight: 900, letterSpacing: "-0.04em", lineHeight: 1.05 }}>
            Your next trade starts <span style={{ color: C.gold3 }}>here.</span>
          </div>
          <div style={{ fontSize: 21, fontWeight: 700, color: C.text2, marginTop: 20 }}>
            Join 150K+ traders on Golden Vault XM.
          </div>
          <button
            className="dh-btn"
            onClick={go}
            style={{ background: gold, color: "#000", border: "none", borderRadius: 16, padding: "22px 56px", fontSize: 20, fontWeight: 900, cursor: "pointer", marginTop: 40 }}
          >
            Create your account
          </button>
        </div>
      </section>
    </div>
  );
}

function HomePage({ setPage }) {
  const { requireAuth } = useAuth();
  const [tab, setTab] = useState("1m");
  const TABS = ["1m", "5m", "15m", "1h", "4h", "D"];
  const chartData = Array.from({ length: 40 }, (_, i) => { const base = 4680 + Math.sin(i * 0.4) * 40 + i * 1.2; const o = base + (Math.random() - 0.5) * 10; return { i, v: o + (Math.random() - 0.5) * 15 }; });
  const STATS = [{ val: "$2.4B+", label: "Daily Volume" }, { val: "150K+", label: "Active Traders" }, { val: "200+", label: "Pairs" }, { val: "24/7", label: "Support" }];
  const INFRA = [{ icon: TrendingUp, title: "Advanced Trading", desc: "Institutional-grade tools and real-time analytics" }, { icon: Shield, title: "Bank-Level Security", desc: "Multi-layer encryption and cold storage protection" }, { icon: Zap, title: "Lightning Execution", desc: "Sub-millisecond order routing across deep liquidity" }, { icon: Globe, title: "Global Access", desc: "Trade 24/7 across forex, crypto, and commodities" }];
  const STEPS = [{ n: "01", icon: Users, title: "Register", desc: "Create a secure account in minutes with identity verification." }, { n: "02", icon: TrendingUp, title: "Deposit Funds", desc: "Fund via bank transfer, credit card, or cryptocurrency." }, { n: "03", icon: BarChart2, title: "Start Trading", desc: "Access real-time data across all major asset classes." }, { n: "04", icon: ArrowUpFromLine, title: "Withdraw", desc: "Fast withdrawals to your preferred payment method." }];
  const handleCTA = () => { if (requireAuth("signup")) setPage("trade"); };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <SlideIn direction="left" delay={0}>
        <div
          style={{
            background: `linear-gradient(160deg,rgba(26,15,0,0.80) 0%,rgba(8,8,8,0.72) 65%), url(./hero-bg.jpg) center/cover no-repeat`,
            borderRadius: 24,
            padding: 24,
            position: "relative",
            overflow: "hidden",
            border: `1px solid ${C.gold}22`,
          }}
        >
          <div style={{ position: "absolute", top: -20, right: -20, width: 150, height: 150, background: `radial-gradient(${C.gold}18,transparent 70%)`, borderRadius: "50%", pointerEvents: "none" }} />
          <div style={{ fontSize: 11, color: C.green, letterSpacing: "0.14em", display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block", animation: "pulse 1.5s infinite" }} />
            System Online // Live Data
          </div>
          <div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.02em", marginBottom: 18 }}>
            <div style={{ color: C.text }}>PRECISION</div>
            <div style={{ color: C.gold }}>VELOCITY</div>
            <div style={{ color: C.text }}>INSIGHT.</div>
          </div>
          <div style={{ borderLeft: `3px solid ${C.gold}`, paddingLeft: 14, fontSize: 13, color: C.text2, lineHeight: 1.7, marginBottom: 20 }}>
            Experience access to institutional-grade trading infrastructure engineered for precision, performance, and global market reach across Forex, Crypto, Futures, Commodities, and NFT ecosystems.
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Btn variant="white" onClick={handleCTA} style={{ width: "100%" }}>INITIALIZE TRADING</Btn>
            <Btn variant="purple" onClick={handleCTA} style={{ width: "100%" }}>
              EXPLORE MARKETS
              <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid #ffffff55", display: "grid", placeItems: "center" }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", border: "2px solid #fff" }} />
              </div>
            </Btn>
          </div>
        </div>
      </SlideIn>

      <SlideIn direction="left" delay={0}>
        <InvestmentSection onExplore={handleCTA} />
      </SlideIn>

      <SlideIn direction="left" delay={0}>
        <BusinessSectors onViewAll={() => setPage("sectors")} />
      </SlideIn>

      <SlideIn direction="right" delay={100}>
{(() => {
  const FONT = "'Inter','Segoe UI',Roboto,Arial,sans-serif";
  const ICONS = {
    user: (<svg width="26" height="26" viewBox="0 0 48 48" fill="none" stroke="#0a1230" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="19" cy="14" r="8" /><path d="M4 42c0-9 7-14 15-14 3 0 5 .5 7 1.5" /><path d="M36 26l3 6 7 1-5 5 1 7-6-3-6 3 1-7-5-5 7-1z" fill="#0a1230" /></svg>),
    coins: (<svg width="26" height="26" viewBox="0 0 48 48" fill="none" stroke="#2a1500" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="17" cy="35" rx="11" ry="5" /><path d="M6 35v-8c0 3 5 5 11 5s11-2 11-5v8" /><ellipse cx="17" cy="27" rx="11" ry="5" /><ellipse cx="31" cy="13" rx="11" ry="5" /><path d="M20 13v8c0 3 5 5 11 5s11-2 11-5v-8" /></svg>),
    crown: (<svg width="26" height="26" viewBox="0 0 48 48" fill="none" stroke="#1a0612" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 14l9 11 9-17 9 17 9-11-3 24H9z" /><path d="M9 43h30" /></svg>),
    diamond: (<svg width="26" height="26" viewBox="0 0 48 48" fill="none" stroke="#06122e" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 6h24l9 13-21 25L3 19z" /><path d="M3 19h42" /><path d="M17 19l7 25 7-25-7-13z" /></svg>),
  };
  const PLANS = [
    { name: "Juvenile", range: "$400 - $1,999", icon: "user", base: "#dbeafe",
      bg: "linear-gradient(135deg,#ffffff 0%,#e6f1ff 55%,#c6e4ff 100%)", ink: "#0a1230",
      pill: "linear-gradient(90deg,#a9dcff,#7ec8f7)", check: "#1d9bf0", btn: "#0b1f4a", iconBg: "#dcebfb",
      features: ["Live trading bot", "96 hours of mining", "Net Profit / Growth %300"] },
    { name: "Standard", range: "$2,000 - $9,999", icon: "coins", base: "#ffb703",
      bg: "linear-gradient(135deg,#ffd35a 0%,#ffbd1f 45%,#ff9d0a 100%)", ink: "#2a1500",
      pill: "linear-gradient(90deg,#ff8a3d,#f26a0f)", check: "#f26a0f", btn: "#2a1500", iconBg: "#ffd36b",
      features: ["Live trading bot", "120 hours of mining", "Net Profit / Growth %500", "Personal account manager"] },
    { name: "Premium", range: "$10,000 - $49,999", icon: "crown", base: "#f9a8d4",
      bg: "linear-gradient(135deg,#fbcfe8 0%,#f9a8d4 50%,#f472b6 100%)", ink: "#1a0612",
      pill: "linear-gradient(90deg,#f43f9e,#e040d0)", check: "#ec1f8c", btn: "#3b0a33", iconBg: "#f8b6dc",
      features: ["Live trading bot", "168 hours of mining", "Net Profit / Growth %800", "Personal account manager", "Priority support"] },
    { name: "Ultra", range: "$50,000 - $1,000,000", max: true, icon: "diamond", base: "#7dd3fc",
      bg: "linear-gradient(135deg,#bdeafe 0%,#7dd3fc 55%,#38bdf8 100%)", ink: "#06122e",
      pill: "linear-gradient(90deg,#8fe0ff,#5cc8f5)", check: "#0b8fe8", btn: "#0b1f4a", iconBg: "#a5e3ff",
      features: ["Live trading bot", "Unlimited mining (priority)", "Net Profit / Growth %1,500+", "Dedicated account manager", "VIP support & exclusive content", "Special trading signals"] },
  ];
  const ASSETS = [["Forex", "#3b82f6"], ["Gold", "#f59e0b"], ["Indices", "#7c3aed"], ["Commodities", "#10b981"], ["Cryptocurrencies", "#f97316"]];
  const Check = ({ color }) => (
    <svg width="16" height="16" viewBox="0 0 20 20" style={{ flexShrink: 0, marginTop: 1 }}>
      <circle cx="10" cy="10" r="10" fill={color} />
      <path d="M5.5 10.5l3 3 6-6.5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  const CSS = `
.gvp-card{background-color:var(--base)!important;background-image:var(--bg)!important;color:var(--ink)!important;border:none!important;font-family:${FONT}!important}
.gvp-card .gvp-name,.gvp-card .gvp-feat,.gvp-card .gvp-feat span{color:var(--ink)!important;-webkit-text-fill-color:var(--ink)!important;background:none!important;-webkit-background-clip:border-box!important;background-clip:border-box!important;font-family:${FONT}!important;text-shadow:none!important}
.gvp-card .gvp-pill{background:var(--pill)!important;color:var(--ink)!important;-webkit-text-fill-color:var(--ink)!important;font-family:${FONT}!important;opacity:1!important;-webkit-background-clip:border-box!important;background-clip:border-box!important}
.gvp-card .gvp-pill span{color:var(--ink)!important;-webkit-text-fill-color:var(--ink)!important}
.gvp-card .gvp-btn{background:var(--btn)!important;color:#fff!important;-webkit-text-fill-color:#fff!important;font-family:${FONT}!important;opacity:1!important}
.gvp-card .gvp-btn span{color:#fff!important;-webkit-text-fill-color:#fff!important;background:none!important}
`;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, fontFamily: FONT }}>
      <style>{CSS}</style>
      <div style={{ padding: "6px 0 2px" }}>
        <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.05, color: "#fff", letterSpacing: "-0.02em", fontFamily: FONT }}>Investment Plan /</div>
        <div style={{ fontSize: 28, fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.02em", fontFamily: FONT, background: "linear-gradient(90deg,#ff4fd8,#c084fc,#8b5cf6)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", WebkitTextFillColor: "transparent" }}>Subscription Package</div>
        <div style={{ fontSize: 13, color: "#e5e7eb", marginTop: 8, lineHeight: 1.45, maxWidth: 330, fontFamily: FONT }}>Choose the plan that fits your goals and start your trading journey with confidence.</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
          {ASSETS.map(([label, col]) => (
            <span key={label} style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 10, fontWeight: 700, color: "#fff", background: "#ffffff12", border: "1px solid #ffffff1f", borderRadius: 20, padding: "4px 9px 4px 5px", fontFamily: FONT }}>
              <span style={{ width: 12, height: 12, borderRadius: "50%", background: col, display: "inline-block" }} />{label}
            </span>
          ))}
        </div>
      </div>
      {PLANS.map(p => (
        <div key={p.name} className="gvp-card" style={{ "--base": p.base, "--bg": p.bg, "--ink": p.ink, "--pill": p.pill, "--btn": p.btn, position: "relative", isolation: "isolate", borderRadius: 22, padding: "14px 12px 14px 14px", display: "grid", gridTemplateColumns: "1.2fr 1fr", alignItems: "stretch", boxShadow: "0 8px 28px rgba(0,0,0,.35)", overflow: "hidden" }}>
          <div style={{ position: "absolute", right: 0, bottom: 0, width: "46%", height: "55%", zIndex: 0, pointerEvents: "none", background: "linear-gradient(135deg,transparent 52%,#ffffff55 52% 60%,transparent 60% 68%,#ffffff33 68% 74%,transparent 74% 82%,#ffffff22 82% 86%,transparent 86%)" }} />
          <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 10, paddingRight: 10, borderRight: `1.5px solid ${p.ink}40`, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 46, height: 46, borderRadius: "50%", background: p.iconBg, flexShrink: 0, display: "grid", placeItems: "center" }}>{ICONS[p.icon]}</div>
              <div className="gvp-name" style={{ fontSize: 24, fontWeight: 900, lineHeight: 1, letterSpacing: "-0.03em" }}>{p.name}</div>
            </div>
            <div className="gvp-pill" style={{ alignSelf: "flex-start", fontWeight: 900, fontSize: 12, borderRadius: 20, padding: "6px 11px", whiteSpace: "nowrap" }}>
              <span>{p.range}</span>{p.max && <span style={{ fontSize: 9, fontWeight: 800, marginLeft: 3 }}>max</span>}
            </div>
            <button className="gvp-btn" onClick={handleCTA} style={{ width: "100%", border: "none", borderRadius: 24, padding: "11px 12px", fontWeight: 800, fontSize: 12.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, boxShadow: "0 4px 14px rgba(0,0,0,.3)" }}>
              <span>Get Started</span>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
            </button>
          </div>
          <div style={{ position: "relative", zIndex: 1, paddingLeft: 12, display: "flex", flexDirection: "column", justifyContent: "space-evenly", gap: 8, minWidth: 0 }}>
            {p.features.map(f => (
              <div key={f} className="gvp-feat" style={{ display: "flex", alignItems: "flex-start", gap: 6, fontSize: 11.5, fontWeight: 600, lineHeight: 1.3 }}>
                <Check color={p.check} /><span>{f}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
})()}
</SlideIn>
      
      <SlideIn direction="left" delay={0}>
      <div style={{ background: `linear-gradient(135deg,#130c00,#0d0800)`, border: `1px solid ${C.gold}28`, borderRadius: 14, display: "grid", gridTemplateColumns: "repeat(4,1fr)", padding: "14px 8px" }}>{STATS.map(s => (<div key={s.label} style={{ textAlign: "center" }}><div style={{ fontSize: 15, fontWeight: 900, color: C.gold }}>{s.val}</div><div style={{ fontSize: 9, color: C.text3, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{s.label}</div></div>))}</div>
      </SlideIn>
      <SlideIn direction="right" delay={0}>
      <Card>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid ${C.gold}44`, borderRadius: 6, padding: "5px 12px", marginBottom: 14 }}><Zap size={11} color={C.gold} /><span style={{ fontSize: 10, fontWeight: 800, color: C.gold, letterSpacing: "0.14em" }}>QUICK START</span><ChevronRight size={10} color={C.gold} /></div>
        <div style={{ fontWeight: 900, fontSize: 19, color: C.text, marginBottom: 4 }}> Get Started in <span style={{ color: C.gold }}>Four Simple Steps</span> </div>
        <div style={{ fontSize: 12, color: C.text3, marginBottom: 16, lineHeight: 1.5 }}> Follow our streamlined onboarding process to register, deposit, trade, and withdraw. </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{STEPS.map((s, i) => (<SlideIn key={i} direction={i % 2 === 0 ? "left" : "right"} delay={i * 100}><div style={{ background: C.card2, border: `1px solid ${C.gold}22`, borderRadius: 12, padding: "14px 12px", position: "relative", overflow: "hidden" }}><div style={{ fontSize: 22, fontWeight: 900, color: `${C.gold}20`, lineHeight: 1, marginBottom: 8 }}>{s.n}</div><IconBox icon={s.icon} color={C.gold} size={14} boxSize={30} /><div style={{ fontSize: 12, fontWeight: 800, color: C.text, marginTop: 8, marginBottom: 4 }}>{s.title}</div><div style={{ fontSize: 11, color: C.text3, lineHeight: 1.5 }}>{s.desc}</div></div></SlideIn>))}</div>
        <Btn variant="purple" onClick={handleCTA} style={{ width: "100%", marginTop: 14 }}> START YOUR JOURNEY <ChevronRight size={16} /></Btn>
      </Card>
      </SlideIn>
      <SlideIn direction="left" delay={0}>
      <Card>
        <div style={{ fontWeight: 900, fontSize: 18, color: C.text, marginBottom: 4 }}> Enterprise-Grade <span style={{ color: C.gold }}>Infrastructure.</span> </div>
        <div style={{ fontSize: 12, color: C.text3, marginBottom: 16, lineHeight: 1.6 }}> Built on cutting-edge technology for unmatched performance, security, and reliability. </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{INFRA.map((ic, i) => (<SlideIn key={i} direction={i % 2 === 0 ? "left" : "right"} delay={i * 120}><div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px", display: "flex", alignItems: "flex-start", gap: 12 }}><IconBox icon={ic.icon} color={C.gold} size={16} boxSize={38} /><div><div style={{ fontWeight: 800, fontSize: 13, color: C.text, marginBottom: 4 }}>{ic.title}</div><div style={{ fontSize: 12, color: C.text3, lineHeight: 1.5 }}>{ic.desc}</div></div></div></SlideIn>))}</div>
      </Card>
      </SlideIn>
    </div>
  );
}

function TradingViewChart() {
  const containerRef = useRef(null);
  const widgetRef = useRef(null);
  const [symbol, setSymbol] = useState("OANDA:XAUUSD");
  const [interval, setTVInterval] = useState("5");
  const [zoom, setZoom] = useState(1);

  const TV_SYMBOLS = [
    { label: "GOLD", value: "OANDA:XAUUSD" },
    { label: "BTC", value: "BINANCE:BTCUSDT" },
    { label: "ETH", value: "BINANCE:ETHUSDT" },
    { label: "EUR/USD", value: "FX:EURUSD" },
    { label: "S&P 500", value: "SP:SPX" },
    { label: "OIL", value: "TVC:USOIL" },
    { label: "NVDA", value: "NASDAQ:NVDA" },
    { label: "AAPL", value: "NASDAQ:AAPL" },
  ];
  const INTERVALS = [
    { label: "1m", value: "1" },
    { label: "5m", value: "5" },
    { label: "15m", value: "15" },
    { label: "1h", value: "60" },
    { label: "4h", value: "240" },
    { label: "1D", value: "D" },
  ];

  useEffect(() => {
    if (!containerRef.current) return;
    // Remove previous widget iframe if any
    containerRef.current.innerHTML = "";
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/tv.js";
    script.async = true;
    script.onload = () => {
      if (window.TradingView) {
        widgetRef.current = new window.TradingView.widget({
          autosize: true,
          symbol: symbol,
          interval: interval,
          timezone: "Etc/UTC",
          theme: "dark",
          style: "1",
          locale: "en",
          toolbar_bg: "#0f0f0f",
          enable_publishing: false,
          allow_symbol_change: true,
          container_id: "tv_chart_container",
          hide_side_toolbar: true,
          studies: [],
          overrides: {
            "paneProperties.background": "#080808",
            "paneProperties.vertGridProperties.color": "#1a1a1a",
            "paneProperties.horzGridProperties.color": "#1a1a1a",
            "scalesProperties.textColor": "#a3a3a3",
          },
          loading_screen: { backgroundColor: "#080808", foregroundColor: "#d97706" },
        });
      }
    };
    // If tv.js already loaded, just create widget
    if (window.TradingView) {
      script.onload();
    } else {
      document.head.appendChild(script);
    }
    return () => {
      if (containerRef.current) containerRef.current.innerHTML = "";
    };
  }, [symbol, interval]);

  // BUG 8 FIX: Removed direct DOM containerRef.current.style.transform mutations.
  // The parent wrapper div already has transform:scale(zoom) bound to React state,
  // so mutating the DOM directly was redundant AND conflicted with React's render.
  const handleZoomIn = () => {
    setZoom(z => Math.min(z + 0.15, 2.2));
  };
  const handleZoomOut = () => {
    setZoom(z => Math.max(z - 0.15, 0.5));
  };
  const handleZoomReset = () => {
    setZoom(1);
  };

  return (
    <Card style={{ padding: "14px 14px 10px", overflow: "hidden" }}>
      {/* Header Row */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 14, color: C.text }}>Live Chart</div>
          <div style={{ fontSize: 10, color: C.green, display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.green, display: "inline-block", animation: "pulse 1.5s infinite" }} />
            TradingView Real-Time
          </div>
        </div>

      </div>

      {/* Symbol Selector */}
      <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 6, marginBottom: 8 }}>
        {TV_SYMBOLS.map(s => (
          <button key={s.value} onClick={() => setSymbol(s.value)} style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, padding: "5px 9px", borderRadius: 6, border: "none", cursor: "pointer", background: symbol === s.value ? "#800080" : `${C.gold}14`, color: symbol === s.value ? "#fff" : C.text3, transition: "all .15s" }}>{s.label}</button>
        ))}
      </div>

      {/* Interval Selector */}
      <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
        {INTERVALS.map(iv => (
          <button key={iv.value} onClick={() => setTVInterval(iv.value)} style={{ flexShrink: 0, fontSize: 10, fontWeight: 800, padding: "4px 8px", borderRadius: 5, border: "none", cursor: "pointer", background: interval === iv.value ? "#ffffff" : `${C.gold}0f`, color: interval === iv.value ? "#000" : C.text3, transition: "all .15s" }}>{iv.label}</button>
        ))}
      </div>

      {/* Chart Container */}
      <div style={{ position: "relative", overflow: "hidden", borderRadius: 10, background: "#080808", border: `1px solid ${C.border}` }}>
        <div
          style={{
            transformOrigin: "top left",
            transform: `scale(${zoom})`,
            width: zoom < 1 ? `${100 / zoom}%` : "100%",
            height: zoom < 1 ? `${340 / zoom}px` : "340px",
            transition: "transform 0.2s ease",
          }}
        >
          <div id="tv_chart_container" ref={containerRef} style={{ width: "100%", height: "340px" }} />
        </div>
        {/* Height holder when zoomed out */}
        {zoom < 1 && <div style={{ height: 340 }} />}
      </div>

      <div style={{ fontSize: 10, color: C.text3, textAlign: "center", marginTop: 8 }}>
        Powered by <span style={{ color: C.gold, fontWeight: 800 }}>TradingView</span> · Real market data
      </div>
    </Card>
  );
}

function MarketsPage({ prices, flash }) {
  const [cat, setCat] = useState("All");
  const [search, setSearch] = useState("");
  const filtered = INSTRUMENT_DEFS.filter(d => (cat === "All" || d.cat === cat) && (!search || d.pair.toLowerCase().includes(search.toLowerCase()) || d.name.toLowerCase().includes(search.toLowerCase())));
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ padding: "20px 0 4px" }}>
        <div style={{ fontSize: 28, fontWeight: 900, color: C.text, lineHeight: 1.1 }}> Global Trading <span style={{ color: C.gold }}>Markets</span> </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}><div style={{ fontSize: 12, color: C.text3 }}>{INSTRUMENT_DEFS.length} instruments</div><div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, boxShadow: `0 0 6px ${C.green}`, animation: "pulse 1.5s infinite" }} /><span style={{ fontSize: 10, fontWeight: 800, color: C.green, letterSpacing: "0.08em" }}>LIVE</span></div></div>
      </div>
      <TradingViewChart />
      <div style={{ position: "relative" }}><Search size={14} color={C.text3} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }} /><input placeholder="Search symbol or name…" value={search} onChange={e => setSearch(e.target.value)} style={{ width: "100%", background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "11px 36px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" }} />{search && (<button onClick={() => setSearch("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.text3 }}><X size={14} /></button>)}</div>
      <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>{CATS.map(c => { const count = c === "All" ? INSTRUMENT_DEFS.length : INSTRUMENT_DEFS.filter(d => d.cat === c).length; return (<button key={c} onClick={() => setCat(c)} style={{ flexShrink: 0, fontSize: 11, fontWeight: 800, padding: "6px 10px", borderRadius: 6, border: "none", cursor: "pointer", transition: "all .15s", background: c === cat ? C.gold : `${C.gold}14`, color: c === cat ? "#000" : C.text3, display: "flex", alignItems: "center", gap: 4, }}>{c} <span style={{ fontSize: 9, opacity: .7 }}>{count}</span></button>); })}</div>
      <Card style={{ padding: "0 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${C.border}` }}><span style={{ fontSize: 10, color: C.text3, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}> {filtered.length} INSTRUMENTS </span><div style={{ display: "flex", gap: 16 }}><span style={{ fontSize: 10, color: C.text3 }}>PRICE</span><span style={{ fontSize: 10, color: C.text3 }}>24H</span></div></div>
        {filtered.map((inst, i) => { const pd = prices[inst.pair]; const flDir = flash[inst.pair]; const color = catColor(inst.cat); return (
          <div key={inst.pair}>
            <div style={{ display: "flex", alignItems: "center", padding: "12px 0", transition: "background .3s", background: flDir === "up" ? `${C.green}08` : flDir === "dn" ? `${C.red}08` : "transparent", borderRadius: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: `${color}18`, display: "grid", placeItems: "center", marginRight: 10 }}><span style={{ fontSize: 9, fontWeight: 900, color, textAlign: "center", lineHeight: 1.1, letterSpacing: "-0.02em" }}>{inst.pair.length > 6 ? inst.pair.slice(0, 5) : inst.pair}</span></div>
              <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 800, fontSize: 13, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inst.pair}</div><div style={{ fontSize: 11, color: C.text3, marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inst.name}</div></div>
              <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 8 }}><div style={{ fontWeight: 900, fontSize: 14, color: flDir === "up" ? C.green : flDir === "dn" ? C.red : C.text, fontVariantNumeric: "tabular-nums", transition: "color .4s" }}>{fmtPrice(pd?.price, inst.cat)}</div><div style={{ fontSize: 11, fontWeight: 800, color: pd?.pct24h >= 0 ? C.green : C.red, marginTop: 2 }}>{pd?.pct24h >= 0 ? "↗" : "↘"} {fmtPct(pd?.pct24h)}</div></div>
            </div>
            {i < filtered.length - 1 && <GoldLine />}
          </div>
        ); })}
        {filtered.length === 0 && (<div style={{ padding: "40px 0", textAlign: "center", color: C.text3, fontSize: 13 }}> No instruments found for "{search}" </div>)}
      </Card>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{CATS.slice(1).map(s => { const defs = INSTRUMENT_DEFS.filter(d => d.cat === s); const col = catColor(s); return (<div key={s} onClick={() => setCat(s)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", cursor: "pointer" }}><div style={{ fontWeight: 800, fontSize: 16, color: col }}>{defs.length}</div><div style={{ fontWeight: 700, fontSize: 12, color: C.text, marginTop: 2 }}>{s}</div><div style={{ fontSize: 10, color: C.text3, marginTop: 1 }}>Live Simulated Feed</div></div>); })}</div>
    </div>
  );
}
/* ── WITHDRAW MODAL ───────────────────────────────────────────
 * Paste this just ABOVE `function TradePage`.
 * Uses: C, supabase, useState, X, Shield (all already in the file).
 * Needs the `withdrawal_requests` table (SQL is in the instructions).
 * ------------------------------------------------------------ */

const WD_CHAINS = ["TRC20", "ERC20", "BEP20"];
const WD_FEE = 1;
const WD_MIN = 10;
const WD_ADDR = {
  TRC20: /^T[1-9A-HJ-NP-Za-km-z]{33}$/,
  ERC20: /^0x[a-fA-F0-9]{40}$/,
  BEP20: /^0x[a-fA-F0-9]{40}$/,
};

function WithdrawModal({ balance = 0, onClose }) {
  const [chain, setChain] = useState("TRC20");
  const [address, setAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const bal = Number(balance) || 0;
  const amt = parseFloat(amount) || 0;
  const receive = Math.max(0, amt - WD_FEE);

  const field = {
    width: "100%", boxSizing: "border-box", background: C.card2,
    border: `1px solid ${C.border2}`, borderRadius: 12, padding: "15px 16px",
    color: C.text, fontSize: 15, fontWeight: 700, outline: "none",
  };
  const label = { fontSize: 14, fontWeight: 800, color: C.text, margin: "20px 0 8px" };

  function check() {
    if (!address.trim()) return "Enter a wallet address.";
    if (!WD_ADDR[chain].test(address.trim())) return `That is not a valid ${chain} address.`;
    if (amt <= 0) return "Enter a withdrawal amount.";
    if (amt < WD_MIN) return `The minimum withdrawal is ${WD_MIN.toFixed(2)} USDT.`;
    if (amt > bal) return `Your available balance is ${bal.toFixed(2)} USDT, which is less than the amount you entered.`;
    return "";
  }

  async function submit() {
  const problem = check();
  if (problem) { setError(problem); return; }
  setError("");
  setBusy(true);
  await new Promise((r) => setTimeout(r, 3000)); // loads for 3 seconds
  setBusy(false);
  setError("Ineligible for withdrawal.");
}

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, zIndex: 100000, background: "rgba(0,0,0,0.78)", backdropFilter: "blur(10px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
         >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 520, maxHeight: "94vh", overflowY: "auto", background: C.bg, border: `1px solid ${C.border2}`, borderRadius: "22px 22px 0 0", padding: "22px 20px 28px" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 900, color: C.text, letterSpacing: "-0.02em" }}>Withdraw</div>
          <button onClick={onClose} style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: "50%", width: 36, height: 36, display: "grid", placeItems: "center", cursor: "pointer", color: C.text2 }}>
            <X size={16} />
          </button>
        </div>

        {done ? (
          <div style={{ textAlign: "center", padding: "40px 6px 12px" }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: C.gold3 }}>Request submitted</div>
            <div style={{ fontSize: 15, fontWeight: 700, lineHeight: 1.6, color: C.text2, marginTop: 12 }}>
              Your withdrawal of {amt.toFixed(2)} USDT on {chain} is pending review. You will receive {receive.toFixed(2)} USDT once it is approved.
            </div>
            <button onClick={onClose} style={{ marginTop: 28, width: "100%", background: `linear-gradient(90deg, ${C.gold3}, ${C.gold2})`, color: "#000", border: "none", borderRadius: 14, padding: "17px 0", fontSize: 17, fontWeight: 900, cursor: "pointer" }}>
              Done
            </button>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", gap: 22, borderBottom: `1px solid ${C.border}`, marginTop: 14 }}>
              <div style={{ padding: "10px 0", fontSize: 15, fontWeight: 900, color: C.text, borderBottom: `3px solid ${C.gold2}` }}>
                On-chain Withdrawal
              </div>
            </div>

            <div style={label}>Coin</div>
            <div style={{ ...field, display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: "50%", background: "#26a17b", display: "grid", placeItems: "center", color: "#fff", fontWeight: 900, fontSize: 15 }}>T</div>
              <span style={{ fontWeight: 900 }}>USDT</span>
              <span style={{ color: C.text2, fontWeight: 700 }}>Tether USDT</span>
            </div>

            <div style={label}>Wallet address</div>
            <input style={field} placeholder="Enter or paste wallet address" value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="off" spellCheck={false} />

            <div style={label}>Chain type</div>
            <div style={{ display: "flex", gap: 10 }}>
              {WD_CHAINS.map((c) => (
                <button
                  key={c}
                  onClick={() => setChain(c)}
                  style={{ flex: 1, padding: "13px 0", borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 900, background: chain === c ? `${C.gold}22` : C.card2, color: chain === c ? C.gold3 : C.text2, border: `1.5px solid ${chain === c ? C.gold2 : C.border2}` }}
                >
                  {c}
                </button>
              ))}
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, lineHeight: 1.5, color: C.text3, marginTop: 8 }}>
              Make sure the chain matches the receiving wallet, or the funds can be lost.
            </div>

            <div style={label}>Amount</div>
            <div style={{ ...field, display: "flex", alignItems: "center", padding: 0 }}>
              <input
                style={{ flex: 1, minWidth: 0, background: "transparent", border: "none", outline: "none", color: C.text, fontSize: 15, fontWeight: 700, padding: "15px 16px" }}
                placeholder="Enter withdrawal amount" inputMode="decimal"
                value={amount} onChange={(e) => setAmount(e.target.value)}
              />
              <span style={{ color: C.text2, fontWeight: 800, paddingRight: 12 }}>USDT</span>
              <button onClick={() => setAmount(bal > 0 ? bal.toFixed(2) : "")} style={{ background: "none", border: "none", borderLeft: `1px solid ${C.border2}`, color: C.gold3, fontWeight: 900, fontSize: 15, padding: "0 16px", cursor: "pointer", alignSelf: "stretch" }}>
                Max
              </button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, fontWeight: 700, marginTop: 10, color: C.text2 }}>
              <span>Available</span><span style={{ color: C.text }}>{bal.toFixed(2)} USDT</span>
            </div>

            <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "14px 16px", marginTop: 16, display: "grid", gap: 10, fontSize: 14, fontWeight: 700 }}>
              {[["Network fee", `${WD_FEE.toFixed(2)} USDT`], ["Minimum withdrawal", `${WD_MIN.toFixed(2)} USDT`], ["You will receive", `${receive.toFixed(2)} USDT`]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: C.text2 }}>{k}</span><span style={{ color: C.text }}>{v}</span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", gap: 10, alignItems: "center", marginTop: 16, fontSize: 13, fontWeight: 700, lineHeight: 1.5, color: C.text2 }}>
              <Shield size={22} color={C.gold3} style={{ flexShrink: 0 }} />
              Withdrawals are reviewed before they are sent.
            </div>

            {error && (
              <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 12, background: `${C.red}18`, border: `1px solid ${C.red}55`, color: C.red, fontSize: 14, fontWeight: 800, lineHeight: 1.5 }}>
                {error}
              </div>
            )}

            <button
              onClick={submit}
              disabled={busy}
              style={{ marginTop: 20, width: "100%", background: `linear-gradient(90deg, ${C.gold3}, ${C.gold2})`, color: "#000", border: "none", borderRadius: 14, padding: "18px 0", fontSize: 18, fontWeight: 900, cursor: busy ? "default" : "pointer", opacity: busy ? 0.7 : 1 }}
            >
              {busy ? "Submitting…" : "Withdraw"}
            </button>
          </>
        )}
      </div>
    </div>
  );
  }
          
function TradePage({ prices }) {
  const { user } = useAuth();
  const [loadingDep, setLoadingDep] = useState(false);
  const [loadingWd, setLoadingWd] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [range, setRange] = useState("30D");
  const [vote, setVote] = useState(null);
  const [showVote, setShowVote] = useState(true);
  const [isMasked, setIsMasked] = useState(true);
  
  // State for all 6 dashboard metrics
  const [totalInvested, setTotalInvested] = useState(0);
  const [currentValue, setCurrentValue] = useState(0);
  const [balance, setBalance] = useState(0);
  const [totalProfit, setTotalProfit] = useState(0);
  const [activePositions, setActivePositions] = useState(0);
  const [winRate, setWinRate] = useState(0);

  // Supabase Fetch — fixed: .eq('id', ...) not .eq('user_id', ...)
  useEffect(() => {
    const loadUserData = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;
      const { data } = await supabase
        .from('account_summary')
        .select('balance, total_profit, active_positions, win_rate, total_invested, current_value')
        .eq('id', authUser.id)
        .single();
      if (data) {
        setBalance(data.balance ?? 0);
        setTotalProfit(data.total_profit ?? 0);
        setActivePositions(data.active_positions ?? 0);
        setWinRate(data.win_rate ?? 0);
        setTotalInvested(data.total_invested ?? 0);
        setCurrentValue(data.current_value ?? 0);
      }
    };
    loadUserData();
  }, []);

  const perfData = Array.from({ length: 30 }, (_, i) => ({ day: i + 1, value: 3200 + Math.sin(i * 0.6) * 1800 + i * 180 + Math.random() * 400 }));
  const RANGES = ["7D", "30D", "3M", "1Y"];
  const data = range === "7D" ? perfData.slice(-7) : range === "3M" ? [...perfData, ...perfData, ...perfData].slice(0, 60) : range === "1Y" ? Array.from({ length: 52 }, (_, i) => ({ day: i + 1, value: 3200 + Math.sin(i * 0.25) * 2200 + i * 90 + Math.random() * 500 })) : perfData;
  const HOLDINGS = [{ pair: "BTC/USDT", label: "Perpetual Futures", color: C.gold2, pct: +5.4, delta: +2310.5 }, { pair: "ETH/USDT", label: "Spot Trading", color: C.blue, pct: +8.2, delta: +1486.7 }, { pair: "EUR/USD", label: "Forex Pairs", color: C.red, pct: -2.1, delta: -689.2 }, { pair: "XAU/USD", label: "Gold Futures", color: C.gold3, pct: +3.8, delta: +1045.3 },];
  const topMarkets = ["BTC/USDT", "ETH/USDT", "EUR/USD", "SPX"];
  
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, position: "relative" }}>

      {/* ── GEAR BACKGROUND: CSS-only, no logic, no JS ───────────────────── */}
    
      {/* All content sits above background */}
      <div style={{ position: "relative", zIndex: 1, padding: "20px 0 4px" }}>
  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
    <div>
      <div style={{ fontSize: 11, color: C.text3, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}>Trading Overview</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: C.text, lineHeight: 1.15 }}>Welcome,</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: C.gold, lineHeight: 1.15 }}>{user?.name || "goldenvaultxm"}</div>
      <div style={{ fontSize: 13, color: "#7c3aed", marginTop: 8, fontStyle: "italic" }}>Here's your trading overview for today</div>
    </div>
    <button onClick={() => setIsMasked(m => !m)} style={{ background: isMasked ? `${C.gold}18` : C.card2, border: `1.5px solid ${isMasked ? C.gold : C.border2}`, borderRadius: 10, padding: "8px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, marginTop: 4, transition: "all .2s" }}>
      {isMasked ? <EyeOff size={9} color={C.gold} /> : <Eye size={12} color={C.text} />}
      <span style={{ fontSize: 10, fontWeight: 800, color: isMasked ? C.gold : C.text3, letterSpacing: "0.06em" }}>{isMasked ? "HIDDEN" : "VISIBLE"}</span>
    </button>
  </div>
</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{[{ icon: Wallet, label: "Total Balance", value: `$${balance.toLocaleString()}`, badge: "+5.2%", color: C.green }, { icon: TrendingUp, label: "Total Profit", value: `$${totalProfit.toLocaleString()}`, badge: "+11.2%", color: C.green }, { icon: Activity, label: "Active Positions", value: `${activePositions}`, badge: "+3", color: C.gold }, { icon: Target, label: "Signal Value", value: `${winRate.toFixed(1)}%`, badge: "+2.3%", color: C.gold },].map((s, i) => (<Card key={i} style={{ display: "flex", flexDirection: "column", gap: 10 }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><IconBox icon={s.icon} color={s.color} /><span style={{ fontSize: 11, fontWeight: 800, color: s.color, background: `${s.color}18`, borderRadius: 20, padding: "3px 8px" }}> ↑ {s.badge} </span></div><div><div style={{ fontSize: 11, color: C.text3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{s.label}</div><div style={{ fontSize: 26, fontWeight: 900, color: C.text, letterSpacing: "-0.02em", lineHeight: 1 }}>{isMasked ? "••••••" : s.value}</div></div></Card>))}</div>
      <Card>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}><div><div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Portfolio Performance</div><div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>Last {range} overview</div></div><div style={{ display: "flex", gap: 5 }}>{RANGES.map(r => (<button key={r} onClick={() => setRange(r)} style={{ fontSize: 10, fontWeight: 800, padding: "4px 9px", borderRadius: 5, border: "none", cursor: "pointer", background: r === range ? C.gold : `${C.gold}14`, color: r === range ? "#000" : C.text3, }}>{r}</button>))}</div></div>
        <ResponsiveContainer width="100%" height={148}>
          <BarChart data={data} barSize={range === "1Y" ? 2 : range === "3M" ? 4 : 8} margin={{ left: -20, right: 0 }}><XAxis dataKey="day" hide /><YAxis hide domain={["dataMin - 500", "dataMax + 200"]} /><Tooltip contentStyle={{ background: C.card2, border: `1px solid ${C.border2}`, borderRadius: 8, fontSize: 12 }} formatter={v => [`$${v.toFixed(0)}`, "Value"]} cursor={{ fill: `${C.gold}08` }} /><Bar dataKey="value" radius={[3, 3, 0, 0]}>{data.map((e, i) => (<Cell key={i} fill={e.value > 7500 ? C.gold2 : e.value > 5500 ? C.gold : `${C.goldDim}cc`} />))}</Bar></BarChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          <div><div style={{ fontSize: 10, color: C.text3, textTransform: "uppercase" }}>Total Invested</div><div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginTop: 3 }}>{isMasked ? "••••••" : `$${totalInvested.toLocaleString()}`}</div></div>
          <div style={{ textAlign: "right" }}><div style={{ fontSize: 10, color: C.text3, textTransform: "uppercase" }}>Current Value</div><div style={{ fontSize: 17, fontWeight: 800, color: C.green, marginTop: 3 }}>{isMasked ? "••••••" : `$${currentValue.toLocaleString()}`}</div></div>
        </div>
      </Card>
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}><div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Live Markets</div><div style={{ display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, animation: "pulse 1.5s infinite" }} /><span style={{ fontSize: 10, fontWeight: 800, color: C.green }}>LIVE</span></div></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{topMarkets.map(pair => { const def = INSTRUMENT_DEFS.find(d => d.pair === pair); const pd = prices[pair]; if (!def || !pd) return null; return (<div key={pair} style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 10, padding: "12px 13px" }}><div style={{ fontSize: 9, color: C.text3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{def.name}</div><div style={{ fontWeight: 900, fontSize: 12, color: C.text, marginBottom: 5 }}>{pair}</div><div style={{ fontWeight: 900, fontSize: 16, color: C.text, marginBottom: 3, fontVariantNumeric: "tabular-nums" }}>{fmtPrice(pd.price, def.cat)}</div><div style={{ fontSize: 11, fontWeight: 800, color: pd.pct24h >= 0 ? C.green : C.red }}>{pd.pct24h >= 0 ? "↗" : "↘"} {fmtPct(pd.pct24h)}</div></div>); })}</div>
      </Card>
      <Card>
        <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 14 }}>Quick Actions</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <Btn variant="gold" loading={loadingDep} onClick={() => { setLoadingDep(true); setTimeout(() => { setLoadingDep(false); setShowDepositModal(true); }, 2500); }} style={{ width: "100%" }}><ArrowDownToLine size={15} /> Deposit Funds </Btn>
          {showDepositModal && <DepositModal onClose={() => setShowDepositModal(false)} />}
          <Btn variant="outline" loading={loadingWd} onClick={() => {
  setLoadingWd(true);
  setTimeout(() => { setLoadingWd(false); setShowWithdraw(true); }, 1200);
}}><ArrowUpFromLine size={15} /> Withdraw Funds
</Btn>
{showWithdraw && <WithdrawModal balance={balance} onClose={() => setShowWithdraw(false)} />}
        </div>
      </Card>
      </div>
  );
}
function SettingsPage({ setPage }) {
  const { isAuthenticated, logout, requireAuth } = useAuth();
  const GROUPS = [{ title: "Platform", items: [{ icon: BarChart2, label: "Markets", sub: "View all trading pairs" }, { icon: TrendingUp, label: "Trading", sub: "Configure trading preferences" }, { icon: BookOpen, label: "Support Center", sub: "Help and documentation", onClick: () => setPage("support") },] }, { title: "Account", items: [{ icon: Eye, label: "Dashboard", sub: "View performance overview" }, { icon: Lock, label: "Security Settings", sub: "2FA and login management" }, { icon: Bell, label: "Notifications", sub: "Alerts and push settings" },] }, { title: "Resources", items: [{ icon: BookOpen, label: "Trading Guide", sub: "Learn trading strategies" }, { icon: Award, label: "Market Analysis", sub: "Expert insights and reports" },] },];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ padding: "20px 0 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
  <div style={{ fontSize: 22, fontWeight: 900, color: C.text }}>Account</div>
  <ThemeToggle />
</div>
      </div>
  );
}

/* ─── News API Key ───────────────────────────────────────────────────────── */
const NEWS_CATEGORIES = ["All", "Top stories", "Stocks", "ETFs", "Crypto", "Forex", "Commodities"];

function NewsPage({ onNewsCount }) {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState("All");
  const [newStoryCount, setNewStoryCount] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const [newsBellAlerts, setNewsBellAlerts] = useState([]);
  const prevArticleIds = useRef(new Set());
  const pollRef = useRef(null);
  const [now, setNow] = useState(Date.now());
useEffect(() => {
  const t = setInterval(() => setNow(Date.now()), 30000);
  return () => clearInterval(t);
}, []);
  const buildQuery = (cat) => {
  const queries = {
    "All":         "finance",
    "Top stories": "markets",
    "Stocks":      "stocks",
    "ETFs":        "ETF",
    "Crypto":      "bitcoin",
    "Forex":       "forex",
    "Commodities": "gold",
  };
  return queries[cat] || "finance";
};
  const fetchNews = useCallback(async (cat, isRefresh = false) => {
    if (!isRefresh) setLoading(true);
    setError(null);
    try {
      const q = encodeURIComponent(buildQuery(cat));
      const url = `https://vedrlsuqewykozjtnfis.supabase.co/functions/v1/dynamic-function?q=${q}`;const res = await fetch(url, {
  headers: {
    Authorization: `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZlZHJsc3VxZXd5a296anRuZmlzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAwNDU2MzgsImV4cCI6MjA5NTYyMTYzOH0.Srsolx7egpGN-aFrbk1_kBuqijWyrkVVq5_A2_jAqCI`,
    "Content-Type": "application/json",
  },
});
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const json = await res.json();
      if (json.status !== "ok") throw new Error(json.message || "API returned error");
      const items = (json.articles || []).filter(a => a.title);
      if (isRefresh) {
        const newIds = new Set(items.map(a => a.url));
        const fresh = items.filter(a => !prevArticleIds.current.has(a.url));
        if (fresh.length > 0) {
          setNewStoryCount(c => c + fresh.length);
       if (onNewsCount) onNewsCount(fresh.length);
          setNewsBellAlerts(prev => [
            ...fresh.slice(0, 3).map(a => ({ title: a.title, source: a.source?.name, time: a.publishedAt })),
            ...prev,
          ].slice(0, 20));
        }
        prevArticleIds.current = newIds;
        setArticles(items);
      } else {
        prevArticleIds.current = new Set(items.map(a => a.url));
        setArticles(items);
        setNewStoryCount(0);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNews(category);
    clearInterval(pollRef.current);
    pollRef.current = setInterval(() => fetchNews(category, true), 60000);
    return () => clearInterval(pollRef.current);
  }, [category, fetchNews]);

  const handleShowNew = () => {
    setNewStoryCount(0);
    fetchNews(category);
  };

  const fmtRelTime = (iso, now = Date.now()) => {
    if (!iso) return "";
    const diff = (now - new Date(iso).getTime()) / 1000;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  const fmtTime = (iso) => {
    if (!iso) return "";
    return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* ── Page Header with Notification Bell ── */}
      <div style={{ padding: "20px 0 14px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, color: C.text, lineHeight: 1.1 }}>
            Market <span style={{ color: C.gold }}>News</span>
          </div>
          <div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>Real-time financial news</div>
        </div>

        {/* News Notification Bell */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => { setBellOpen(b => !b); setNewStoryCount(0); }}
            style={{ background: newsBellAlerts.length > 0 ? `${C.gold}18` : C.card, border: `1px solid ${newsBellAlerts.length > 0 ? C.gold + "44" : C.border}`, borderRadius: 10, width: 40, height: 40, display: "grid", placeItems: "center", cursor: "pointer", color: newsBellAlerts.length > 0 ? C.gold : C.text3, position: "relative", transition: "all .2s" }}
          >
            <Bell size={17} />
            {newStoryCount > 0 && (
              <span style={{ position: "absolute", top: -4, right: -4, minWidth: 17, height: 17, borderRadius: 9, background: C.red, color: "#fff", fontSize: 9, fontWeight: 900, display: "grid", placeItems: "center", padding: "0 3px", lineHeight: 1 }}>
                {newStoryCount > 9 ? "9+" : newStoryCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div style={{ position: "absolute", top: 46, right: 0, width: "min(320px, 88vw)", maxHeight: "60vh", overflowY: "auto", background: C.card, border: `1px solid ${C.border2}`, borderRadius: 14, boxShadow: "0 16px 48px #000a", zIndex: 300 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "13px 14px 10px", borderBottom: `1px solid ${C.border}` }}>
                <span style={{ fontWeight: 800, fontSize: 13, color: C.text }}>News Alerts</span>
                <button onClick={() => setBellOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: C.text3 }}><X size={15} /></button>
              </div>
              {newsBellAlerts.length === 0 ? (
                <div style={{ padding: "28px 14px", textAlign: "center", color: C.text3, fontSize: 13 }}>No new alerts yet</div>
              ) : (
                newsBellAlerts.map((a, i) => (
                  <div key={i} style={{ padding: "11px 14px", borderBottom: i < newsBellAlerts.length - 1 ? `1px solid ${C.border}` : "none" }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: C.text, lineHeight: 1.4, marginBottom: 4 }}>{a.title}</div>
                    <div style={{ fontSize: 10, color: C.text3 }}>{a.source} · {fmtRelTime(a.time)}</div>
                  </div>
                ))
              )}
            </div>
          )}
          {bellOpen && <div onClick={() => setBellOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 299 }} />}
        </div>
      </div>

      {/* ── Loading ── */}
      {loading && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 8 }}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "16px", animation: "shimmer 1.5s ease-in-out infinite" }}>
              <div style={{ display: "flex", gap: 10, marginBottom: 10 }}>
                {Array.from({ length: 3 }).map((_, j) => (<div key={j} style={{ width: 28, height: 28, borderRadius: "50%", background: C.card3 }} />))}
                <div style={{ flex: 1 }}>
                  <div style={{ height: 10, borderRadius: 6, background: C.card3, marginBottom: 6, width: "60%" }} />
                  <div style={{ height: 8, borderRadius: 6, background: C.card3, width: "40%" }} />
                </div>
              </div>
              <div style={{ height: 12, borderRadius: 6, background: C.card3, width: "90%", marginTop: 6 }} />
            </div>
          ))}
        </div>
      )}

      {/* ── Error / No Key ── */}
      {!loading && error && (
        error === "__NO_KEY__" ? (
          <div style={{ background: C.card, border: `1px solid ${C.gold}33`, borderRadius: 14, padding: "28px 20px", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📰</div>
            <div style={{ fontSize: 15, fontWeight: 800, color: C.text, marginBottom: 8 }}>News Coming Soon</div>
            <div style={{ fontSize: 13, color: C.text3, lineHeight: 1.6, maxWidth: 280, margin: "0 auto" }}>
              Market news requires a NewsAPI key. Add <span style={{ color: C.gold, fontFamily: "monospace" }}>REACT_APP_NEWS_API_KEY</span> to your environment variables to enable live financial news.
            </div>
          </div>
        ) : (
          <div style={{ background: C.card, border: `1px solid ${C.red}33`, borderRadius: 14, padding: "20px 16px", textAlign: "center" }}>
            <AlertCircle size={28} color={C.red} style={{ margin: "0 auto 10px" }} />
            <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>Unable to load news</div>
            <div style={{ fontSize: 12, color: C.text3, lineHeight: 1.5, marginBottom: 14 }}>{error}</div>
            <Btn variant="outline" onClick={() => fetchNews(category)} style={{ margin: "0 auto" }}>
              <RefreshCw size={13} /> Retry
            </Btn>
          </div>
        )
      )}

      {/* ── Articles ── */}
      {!loading && !error && (
        <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {articles.length === 0 && (
            <div style={{ textAlign: "center", padding: "40px 16px", color: C.text3, fontSize: 13 }}>No articles found for this category.</div>
          )}
          {articles.map((article, i) => (
            <a
              key={article.url}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "block", textDecoration: "none", padding: "16px 0", borderBottom: i < articles.length - 1 ? `1px solid ${C.border}` : "none" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: `${C.gold}22`, border: `1px solid ${C.gold}44`, display: "grid", placeItems: "center" }}>
                  <Newspaper size={10} color={C.gold} />
                </div>
                <span style={{ fontSize: 11, color: C.text3, fontWeight: 600 }}>{article.source?.name || "Unknown"}</span>
                <span style={{ fontSize: 11, color: C.text4 }}>·</span>
                <span style={{ fontSize: 11, color: C.text3 }}>{fmtTime(article.publishedAt)}</span>
                <span style={{ fontSize: 11, color: C.text4 }}>·</span>
                <span style={{ fontSize: 11, color: C.text3 }}>{fmtRelTime(article.publishedAt)}</span>
                <ExternalLink size={10} color={C.text4} style={{ marginLeft: "auto", flexShrink: 0 }} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text, lineHeight: 1.4, letterSpacing: "-0.01em" }}>
                {article.title}
              </div>
              {article.description && (
                <div style={{ fontSize: 13, color: C.text2, marginTop: 6, lineHeight: 1.6, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {article.description}
                </div>
              )}
            </a>
          ))}
        </div>
      )}

      {/* ── Footer attribution ── */}
      {!loading && !error && articles.length > 0 && (
        <div style={{ textAlign: "center", padding: "16px 0 4px", fontSize: 10, color: C.text4 }}>
          Powered by <span style={{ color: C.gold, fontWeight: 700 }}>NewsAPI</span>
        </div>
      )}
    </div>
  );
}

/* ─── Support Page ───────────────────────────────────────────────────────── */
// Replace with your real Tawk.to IDs from:
// tawk.to Dashboard → Administration → Chat Widget → Direct Chat Link
// URL format: https://embed.tawk.to/{PROPERTY_ID}/{WIDGET_ID}
const TAWK_PROPERTY_ID = "6a2187aa4a36f41c2edf040c";
const TAWK_WIDGET_ID = "1jq9nm3li";
  
const SUPPORT_FAQS = [
  { q: "How do I make a deposit?", a: "Go to Menu → Deposit. We support bank transfer, crypto, and card payments. Funds typically reflect within 15 minutes." },
  { q: "How long do withdrawals take?", a: "Withdrawals are processed within 24 hours on business days. Crypto withdrawals may be faster depending on network confirmation." },
  { q: "How do I verify my account?", a: "Navigate to Profile → Verification. Upload a government-issued ID and proof of address. Verification takes 1–2 business days." },
  { q: "Why is my trade not executing?", a: "Check your available balance, ensure markets are open, and confirm your order parameters. Contact support if the issue persists." },
  { q: "Is my funds secure?", a: "Yes. Golden Vault XM uses institutional-grade encryption, 2FA, and cold storage for digital assets." },
];
function DragChatButton() {
  const [pos, setPos] = useState({ x: window.innerWidth - 76, y: window.innerHeight - 160 });
  const drag = useRef({ active: false, moved: false, dx: 0, dy: 0, sx: 0, sy: 0 });

  function down(e) {
    drag.current = { active: true, moved: false, dx: e.clientX - pos.x, dy: e.clientY - pos.y, sx: e.clientX, sy: e.clientY };
    e.currentTarget.setPointerCapture(e.pointerId);
  }
  function move(e) {
    const d = drag.current;
    if (!d.active) return;
    if (Math.abs(e.clientX - d.sx) + Math.abs(e.clientY - d.sy) > 6) d.moved = true;
    const x = Math.min(Math.max(0, e.clientX - d.dx), window.innerWidth - 56);
    const y = Math.min(Math.max(0, e.clientY - d.dy), window.innerHeight - 56);
    setPos({ x, y });
  }
  function up() {
    const d = drag.current;
    d.active = false;
    if (!d.moved) {
      try { window.Tawk_API.showWidget(); window.Tawk_API.maximize(); } catch (e) {}
    }
  }

  return (
    <div
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      style={{
        position: "fixed", left: pos.x, top: pos.y, width: 56, height: 56,
        borderRadius: "50%", background: "#d4af37", display: "flex",
        alignItems: "center", justifyContent: "center", fontSize: 26,
        cursor: "grab", touchAction: "none", userSelect: "none",
        zIndex: 9999, boxShadow: "0 4px 14px rgba(0,0,0,0.4)",
      }}
    >
      💬
    </div>
  );
}
function SupportPage() {
  const [activeTab, setActiveTab] = useState("chat");
  const [messages, setMessages] = useState([
    { from: "agent", text: "👋 Welcome to Golden Vault XM Support. How can we assist you today?", time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [tawkLoaded, setTawkLoaded] = useState(false);
  const [tawkOpen, setTawkOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState(null);
  const bottomRef = useRef(null);

  function fmtNow() {
    return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  useEffect(() => {
    if (!TAWK_PROPERTY_ID || TAWK_PROPERTY_ID === "YOUR_PROPERTY_ID") return;
    window.Tawk_API = window.Tawk_API || {};
    window.Tawk_API.onLoad = () => { setTawkLoaded(true); };
    window.Tawk_API.onChatEnded = () => { setTawkOpen(false); };
    const s = document.createElement("script");
    s.async = true;
    s.src = `https://embed.tawk.to/${TAWK_PROPERTY_ID}/${TAWK_WIDGET_ID}`;
    s.charset = "UTF-8";
    s.setAttribute("crossorigin", "*");
    document.head.appendChild(s);
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  async function handleSend() {
    const text = input.trim();
    if (!text) return;
    setSending(true);
    setInput("");
    setMessages(prev => [...prev, { from: "user", text, time: fmtNow() }]);
    await new Promise(r => setTimeout(r, 900));
    if (tawkLoaded && window.Tawk_API) {
      // Send to Tawk silently without showing the widget bubble
      try { window.Tawk_API.showWidget(); window.Tawk_API.maximize(); } catch (e) {}
      setTawkOpen(false);
      setMessages(prev => [...prev, { from: "agent", text: "✅ Message received! A live agent will respond shortly.", time: fmtNow() }]);
    } else {
      setMessages(prev => [...prev, { from: "agent", text: "Message received! A support agent will respond shortly. For urgent matters, email support@goldenvaultxm.com", time: fmtNow() }]);
    }
    setSending(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0, paddingBottom: 16 }}>
      <DragChatButton />
      <style>{`
        @keyframes sp-blink { 0%,80%,100%{opacity:0.15} 40%{opacity:1} }
        .sp-dot{width:8px;height:8px;border-radius:50%;background:${C.gold};display:inline-block;animation:sp-blink 1.2s infinite}
        .sp-dot:nth-child(2){animation-delay:.2s}.sp-dot:nth-child(3){animation-delay:.4s}
        .sp-input:focus{outline:none;border-color:${C.gold}88!important}
        .sp-faq:hover{border-color:${C.gold}44!important}
      `}</style>

      <div style={{ padding: "20px 0 16px", display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ width: 46, height: 46, borderRadius: 13, background: `linear-gradient(135deg,${C.gold},${C.goldDim})`, display: "grid", placeItems: "center", flexShrink: 0 }}>
          <Mail size={20} color="#000" />
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.text }}>Support</div>
          <div style={{ fontSize: 12, color: C.text3, marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: C.green, display: "inline-block" }} />
            Live agents available 24/7
          </div>
        </div>
      </div>

      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, marginBottom: 16 }}>
        {[["chat", "💬 Live Chat"], ["faq", "❓ FAQ"]].map(([id, label]) => (
          <button key={id} onClick={() => setActiveTab(id)} style={{ flex: 1, padding: "11px 0", background: "none", border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, color: activeTab === id ? C.gold : C.text3, borderBottom: `2px solid ${activeTab === id ? C.gold : "transparent"}`, transition: "all 0.18s" }}>
            {label}
          </button>
        ))}
      </div>

      {activeTab === "chat" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 16, padding: 14, minHeight: 280, maxHeight: 380, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ display: "flex", alignItems: "flex-end", gap: 8, justifyContent: m.from === "user" ? "flex-end" : "flex-start" }}>
                {m.from === "agent" && (
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg,${C.gold},${C.goldDim})`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <span style={{ fontSize: 10, fontWeight: 900, color: "#000" }}>GV</span>
                  </div>
                )}
                <div style={{ maxWidth: "75%" }}>
                  <div style={{ padding: "9px 13px", borderRadius: 14, fontSize: 13, lineHeight: 1.55, ...(m.from === "user" ? { background: `linear-gradient(135deg,${C.gold},${C.goldDim})`, color: "#000", fontWeight: 600, borderBottomRightRadius: 4 } : { background: C.card2, border: `1px solid ${C.border}`, color: C.text, borderBottomLeftRadius: 4 }) }}>
                    {m.text}
                  </div>
                  <div style={{ fontSize: 10, color: C.text3, marginTop: 3, textAlign: m.from === "user" ? "right" : "left" }}>{m.time}</div>
                </div>
              </div>
            ))}
            {sending && (
              <div style={{ display: "flex", alignItems: "flex-end", gap: 8 }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: `linear-gradient(135deg,${C.gold},${C.goldDim})`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                  <span style={{ fontSize: 10, fontWeight: 900, color: "#000" }}>GV</span>
                </div>
                <div style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 14, borderBottomLeftRadius: 4, padding: "12px 16px", display: "flex", gap: 5, alignItems: "center" }}>
                  <span className="sp-dot" /><span className="sp-dot" /><span className="sp-dot" />
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {tawkOpen && (
            <div style={{ margin: "10px 0", background: "#0a1f0a", border: `1px solid ${C.green}44`, borderRadius: 10, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, color: "#86efac" }}>
              <span>🟢 Live agent chat is open in the overlay</span>
              <button onClick={() => { if (tawkLoaded && window.Tawk_API) window.Tawk_API.hideWidget(); setTawkOpen(false); }} style={{ background: "none", border: "none", color: C.text3, cursor: "pointer", fontSize: 11 }}>Dismiss</button>
            </div>
          )}

          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <input className="sp-input" style={{ flex: 1, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 16px", color: C.text, fontSize: 14 }} placeholder="Type your message…" value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === "Enter" && !e.shiftKey && handleSend()} />
            <button onClick={handleSend} disabled={!input.trim() || sending} style={{ width: 46, height: 46, borderRadius: 12, background: `linear-gradient(135deg,${C.gold},${C.goldDim})`, border: "none", color: "#000", cursor: "pointer", display: "grid", placeItems: "center", flexShrink: 0, opacity: (!input.trim() || sending) ? 0.4 : 1 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" /></svg>
            </button>
          </div>
          <div style={{ textAlign: "center", fontSize: 11, color: C.text3, marginTop: 10 }}>
            Powered by <a href="https://tawk.to" target="_blank" rel="noreferrer" style={{ color: C.gold, textDecoration: "none" }}>tawk.to</a> · <a href="mailto:support@goldenvaultxm.com" style={{ color: C.gold, textDecoration: "none" }}>support@goldenvaultxm.com</a>
          </div>
        </div>
      )}

      {activeTab === "faq" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {SUPPORT_FAQS.map((item, i) => (
            <div key={i} className="sp-faq" onClick={() => setOpenFaq(openFaq === i ? null : i)} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px 16px", cursor: "pointer", transition: "border-color 0.2s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, fontWeight: 700, color: C.text }}>
                <span>{item.q}</span>
                <span style={{ color: C.gold, fontSize: 18, transition: "transform 0.2s", transform: openFaq === i ? "rotate(90deg)" : "rotate(0deg)", lineHeight: 1 }}>›</span>
              </div>
              {openFaq === i && <div style={{ marginTop: 10, fontSize: 13, color: C.text2, lineHeight: 1.65, borderTop: `1px solid ${C.border}`, paddingTop: 10 }}>{item.a}</div>}
            </div>
          ))}
          <div style={{ textAlign: "center", marginTop: 10, fontSize: 13, color: C.text3 }}>
            Still need help?{" "}
            <button onClick={() => setActiveTab("chat")} style={{ background: "none", border: "none", color: C.gold, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>Start a chat →</button>
          </div>
        </div>
      )}
    </div>
  );
}

function AppShell() {
  const [page, setPage] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const [newsCount, setNewsCount] = useState(0);
  const [globalDepositOpen, setGlobalDepositOpen] = useState(false);
  const { isAuthenticated, requireAuth, user } = useAuth();

  const prevAuth = useRef(false);
  useEffect(() => {
    if (isAuthenticated && !prevAuth.current) setPage("trade");
    prevAuth.current = isAuthenticated;
  }, [isAuthenticated]);
  const { prices, flash } = useLivePrices();
  const { mode, width } = useLayout();

  const handleSetPage = useCallback((p) => {
    if (p === "trade" && !isAuthenticated) { requireAuth("signup"); return; }
    setPage(p);
  }, [isAuthenticated, requireAuth, setPage]);

const renderPage = () => {
  switch (page) {
    case "home":     return <HomePage setPage={handleSetPage} />;
    case "markets":  return <MarketsPage prices={prices} flash={flash} />;
      case "sectors":  return <SectorsPage setPage={handleSetPage} />;
    case "trade":    return <TradePage prices={prices} />;
    case "mining":   return <Mining user={user} onAccountChange={() => {}} />;
    case "profile":  return <ProfilePage />;
    case "news":     return <NewsPage onNewsCount={setNewsCount} />;
    case "settings": return <SettingsPage setPage={handleSetPage} />;
    case "support":  return <SupportPage />;
    default:         return <HomePage setPage={handleSetPage} />;
  }
};
  return (
    <div className="gvxm-shell" style={{ height: "100dvh", overflow: "hidden", background: C.bg, color: C.text, fontFamily: "'DM Sans','Inter','Roboto',sans-serif" }}>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; overscroll-behavior: none; }
        ::-webkit-scrollbar { display: none; }
        scrollbar-width: none;
        input, button, select, textarea { font-family: inherit; }
        input::placeholder { color: #404040; }
        img, svg { display: block; max-width: 100%; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer{ 0%,100%{opacity:.3} 50%{opacity:.7} }
      `}</style>
      <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: 400, height: 400, background: `radial-gradient(${C.gold}09,transparent 70%)`, borderRadius: "50%", pointerEvents: "none", zIndex: 0 }} />
      {globalDepositOpen && <DepositModal onClose={() => setGlobalDepositOpen(false)} />}
      <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", flexDirection: "column" }}>
        <Nav page={page} setPage={handleSetPage} open={menuOpen} setOpen={setMenuOpen} openDeposit={() => setGlobalDepositOpen(true)} />
        <main style={{ flex: 1, minHeight: 0, overflowY: "auto", padding: "0 16px 100px" }}>
          {renderPage()}
        </main>
        {createPortal(
  <BottomNav page={page} setPage={handleSetPage} newsCount={newsCount} />,
  document.body
)}
      </div>
    </div>
  );
}

export default function GoldenVaultXM() {
  return (
    <LayoutProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppShell />
        </AuthProvider>
      </ThemeProvider>
    </LayoutProvider>
  );
}
