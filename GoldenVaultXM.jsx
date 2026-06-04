import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, } from "recharts";
import { Wallet, TrendingUp, Activity, Target, BarChart2, Shield, Zap, Globe, ArrowDownToLine, ArrowUpFromLine, FileBarChart, CheckCircle2, Menu, X, ChevronRight, Bell, Settings, LogOut, Home, Search, Lock, Award, BookOpen, Mail, Phone, MapPin, Eye, EyeOff, UserPlus, LogIn, AlertCircle, RefreshCw, Users, Newspaper, ExternalLink, } from "lucide-react";
import { supabase } from './supabaseClient';

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
const LAYOUT_WIDTHS = { mobile: 600, desktop: 1200 };

const LayoutContext = createContext(null);
const useLayout = () => useContext(LayoutContext);

function getMode() {
  return window.innerWidth >= LAYOUT_BREAKPOINT ? "desktop" : "mobile";
}

function LayoutProvider({ children }) {
  const [mode, setMode] = useState(getMode);

  useEffect(() => {
    const onResize = () => {
      const next = getMode();
      setMode(prev => prev !== next ? next : prev);
    };
    window.addEventListener("resize", onResize);
    applyLayoutCSS(getMode());
    return () => window.removeEventListener("resize", onResize);
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
    html { background: ${bg} !important; overflow-x: hidden !important; }
    body {
      background: ${bg} !important; margin: 0 !important; padding: 0 !important;
      width: 100% !important; min-width: 0 !important; max-width: 100% !important;
      overflow-x: hidden !important;
      -webkit-text-size-adjust: 100% !important; text-size-adjust: 100% !important;
    }
    .gvxm-shell {
      width: 100% !important; max-width: ${w}px !important; min-width: 0 !important;
      margin: 0 auto !important; overflow-x: hidden !important; box-sizing: border-box !important;
    }
    #gvxm-root { width: 100% !important; max-width: 100% !important; overflow-x: hidden !important; }
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
      const { error } = await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { full_name: form.name } } });
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

        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#fff", border: "none", borderRadius: 12, padding: "13px 16px", fontWeight: 700, fontSize: 14, color: "#1a1a1a", cursor: googleLoading ? "not-allowed" : "pointer", opacity: googleLoading ? 0.7 : 1, transition: "opacity .2s, box-shadow .2s", boxShadow: "0 2px 8px #0004" }}
        >
          {googleLoading ? <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> : <GoogleIcon />}
          {googleLoading ? "Redirecting…" : "Continue with Google"}
        </button>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
          <div style={{ flex: 1, height: 1, background: C.border2 }} />
          <span style={{ fontSize: 12, color: C.text3, fontWeight: 600 }}>or</span>
          <div style={{ flex: 1, height: 1, background: C.border2 }} />
        </div>

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
  const { isAuthenticated, logout, requireAuth } = useAuth();
  const { mode } = useLayout();
  const { notes, unreadCount, markAllRead } = useNotifications();
  const [bellOpen, setBellOpen] = useState(false);

  const NAV = [{ id: "home", label: "Home", icon: Home }, { id: "markets", label: "Markets", icon: BarChart2 }, { id: "trade", label: "Trade", icon: TrendingUp }, { id: "news", label: "News", icon: Newspaper }, { id: "settings", label: "Settings", icon: Settings },];

  const ACTIONS = [
    { icon: ArrowDownToLine, label: "Deposit Funds",  color: C.green,   onClick: () => { setOpen(false); openDeposit && openDeposit(); } },
    { icon: ArrowUpFromLine, label: "Withdraw Funds", color: C.gold,    onClick: () => { setPage("trade");    setOpen(false); } },
    { icon: BarChart2,       label: "Markets",        color: C.blue,    onClick: () => { setPage("markets");  setOpen(false); } },
    { icon: TrendingUp,      label: "Trade Now",      color: C.purple,  onClick: () => { if (!requireAuth("signup")) return; setPage("trade"); setOpen(false); } },
    { icon: FileBarChart,    label: "Reports",        color: "#a78bfa", onClick: () => { setPage("trade");    setOpen(false); } },
    { icon: Mail,            label: "Support",        color: C.text2,   onClick: () => { setPage("settings"); setOpen(false); } },
  ];

  return (
    <header style={{ position: "sticky", top: 0, zIndex: 100, background: `${C.bg}f0`, backdropFilter: "blur(16px)", borderBottom: `1px solid ${C.border}`, padding: "0 16px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>

      {/* Logo */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <img src="/IMG_20260512_072009_2.webp.webp" alt="Golden Vault XM" style={{ height: 40, width: "auto", display: "block", flexShrink: 0 }} />
        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
       <div style={{ fontFamily: "'Inter','Roboto','Arial',sans-serif", fontWeight: 700, fontSize: 16 }}><span style={{ color: C.text }}>GOLDEN VAULT </span><span style={{ color: "#ef4444" }}>XM</span>
     </div>
     </div>
     </div>
      
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>

        {/* Bell */}
        <div style={{ position: "relative" }}>
          <button
            onClick={() => { setBellOpen(b => !b); if (!bellOpen) markAllRead(); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: unreadCount > 0 ? C.gold : C.text3, padding: 8, position: "relative" }}
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span style={{ position: "absolute", top: 4, right: 4, width: 16, height: 16, borderRadius: "50%", background: C.red, color: "#fff", fontSize: 9, fontWeight: 900, display: "grid", placeItems: "center", lineHeight: 1 }}>
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>

          {bellOpen && (
            <div style={{ position: "fixed", top: 58, right: 0, width: "min(340px, 96vw)", maxHeight: "70vh", overflowY: "auto", background: C.card, border: `1px solid ${C.border2}`, borderRadius: "0 0 14px 14px", boxShadow: "0 16px 48px #000a", zIndex: 300 }}>
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
      {bellOpen && <div onClick={() => setBellOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 299 }} />}

      {/* Hamburger drawer */}
      {open && (
        <div className="gvxm-shell" style={{ position: "fixed", top: 58, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: mode === "desktop" ? 1200 : 600, minWidth: 0, bottom: 0, background: `${C.bg}f8`, backdropFilter: "blur(20px)", zIndex: 200, padding: "20px 20px 32px", display: "flex", flexDirection: "column", gap: 2, overflowY: "auto" }}>

          {/* Nav links */}
          {NAV.map(n => (
            <button key={n.id} onClick={() => { if (n.id === "trade" && !requireAuth()) return; setPage(n.id); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 14px", background: page === n.id ? `${C.gold}12` : "none", border: "none", borderRadius: 12, cursor: "pointer", borderLeft: page === n.id ? `3px solid ${C.gold}` : "3px solid transparent" }}>
              <n.icon size={18} color={page === n.id ? C.gold : C.text3} />
              <span style={{ fontSize: 17, fontWeight: 800, color: page === n.id ? C.text : C.text3 }}>{n.label}</span>
              {n.id === "trade" && !isAuthenticated && (<Lock size={12} color={C.text3} style={{ marginLeft: "auto" }} />)}
            </button>
          ))}

          {/* Quick Actions */}
          <div style={{ marginTop: 16, marginBottom: 4 }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: C.text3, letterSpacing: "0.12em", textTransform: "uppercase", paddingLeft: 14, marginBottom: 10 }}>Quick Actions</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {ACTIONS.map((a, i) => (
                <button key={i} onClick={a.onClick}
                  onMouseEnter={e => e.currentTarget.style.borderColor = a.color}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "13px 14px", background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, cursor: "pointer", transition: "border-color .18s" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${a.color}18`, display: "grid", placeItems: "center", flexShrink: 0 }}>
                    <a.icon size={15} color={a.color} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.text2, textAlign: "left", lineHeight: 1.3 }}>{a.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sign out / in */}
          <div style={{ marginTop: "auto", paddingTop: 12 }}>
            <GoldLine />
            {isAuthenticated
              ? <button onClick={() => { logout(); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 14px", background: "none", border: "none", cursor: "pointer", width: "100%" }}><LogOut size={18} color={C.red} /><span style={{ fontSize: 14, fontWeight: 700, color: C.red }}>Sign Out</span></button>
              : <button onClick={() => { requireAuth("signup"); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 14px", background: "none", border: "none", cursor: "pointer", width: "100%" }}><UserPlus size={18} color={C.gold} /><span style={{ fontSize: 14, fontWeight: 700, color: C.gold }}>Sign Up / Login</span></button>
            }
          </div>
        </div>
      )}
    </header>
  );
}


function BottomNav({ page, setPage }) {
  const { isAuthenticated, requireAuth } = useAuth();
  const { width } = useLayout();
  const TABS = [{ id: "home", icon: Home, label: "Home" }, { id: "markets", icon: BarChart2, label: "Markets" }, { id: "trade", icon: Zap, label: "Trade" }, { id: "news", icon: Newspaper, label: "News" }, { id: "settings", icon: Settings, label: "More" },];
  return (
    <nav className="gvxm-shell" style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: width, minWidth: 0, background: `${C.bg}f2`, backdropFilter: "blur(16px)", borderTop: `1px solid ${C.border}`, display: "flex", padding: "8px 0 20px", zIndex: 50 }}>
      {TABS.map(t => {
        const active = page === t.id; const locked = t.id === "trade" && !isAuthenticated;
        return (
          <button key={t.id} onClick={() => { if (locked) { requireAuth("signup"); return; } setPage(t.id); }} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, background: "none", border: "none", cursor: "pointer", padding: "4px 0", }}>
            <div style={{ width: active ? 36 : 28, height: active ? 36 : 28, borderRadius: active ? 10 : 8, background: active ? `${C.gold}22` : "transparent", display: "grid", placeItems: "center", transition: "all .2s", position: "relative" }}><t.icon size={18} color={active ? C.gold : C.text4} /> {locked && (<div style={{ position: "absolute", top: -2, right: -2, width: 10, height: 10, background: C.card, borderRadius: "50%", display: "grid", placeItems: "center" }}><Lock size={6} color={C.text3} /></div>)}</div>
            <span style={{ fontSize: 10, fontWeight: 800, color: active ? C.gold : C.text4, letterSpacing: "0.04em" }}>{t.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/* ─── PAGES (Modified TradePage) ────────────────────────────────────────── */
function HomePage({ setPage }) {
  const { requireAuth } = useAuth();
  const [tab, setTab] = useState("1m");
  const TABS = ["1m", "5m", "15m", "1h", "4h", "D"];
  const chartData = Array.from({ length: 40 }, (_, i) => { const base = 4680 + Math.sin(i * 0.4) * 40 + i * 1.2; const o = base + (Math.random() - 0.5) * 10; return { i, v: o + (Math.random() - 0.5) * 15 }; });
  const STATS = [{ val: "$2.4B+", label: "Daily Volume" }, { val: "150K+", label: "Active Traders" }, { val: "200+", label: "Pairs" }, { val: "24/7", label: "Support" },];
  const INFRA = [{ icon: TrendingUp, title: "Advanced Trading", desc: "Institutional-grade tools and real-time analytics" }, { icon: Shield, title: "Bank-Level Security", desc: "Multi-layer encryption and cold storage protection" }, { icon: Zap, title: "Lightning Execution", desc: "Sub-millisecond order routing across deep liquidity" }, { icon: Globe, title: "Global Access", desc: "Trade 24/7 across forex, crypto, and commodities" },];
  const STEPS = [{ n: "01", icon: Users, title: "Register", desc: "Create a secure account in minutes with identity verification." }, { n: "02", icon: TrendingUp, title: "Deposit Funds", desc: "Fund via bank transfer, credit card, or cryptocurrency." }, { n: "03", icon: BarChart2, title: "Start Trading", desc: "Access real-time data across all major asset classes." }, { n: "04", icon: ArrowUpFromLine, title: "Withdraw", desc: "Fast withdrawals to your preferred payment method." },];
  const handleCTA = () => { if (requireAuth("signup")) setPage("trade"); };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ background: `linear-gradient(160deg,#1a0f00 0%,${C.bg} 65%)`, borderRadius: 16, border: `1px solid ${C.gold}22`, padding: "28px 20px", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", top: -20, right: -20, width: 150, height: 150, background: `radial-gradient(${C.gold}18,transparent 70%)`, borderRadius: "50%", pointerEvents: "none" }} />
        <div style={{ fontSize: 11, color: C.green, letterSpacing: "0.14em", display: "flex", alignItems: "center", gap: 6, marginBottom: 16 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: C.green, display: "inline-block", animation: "pulse 1.5s infinite" }} /> System Online // Live Data </div>
        <div style={{ fontSize: 42, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.02em", marginBottom: 18 }}><div style={{ color: C.text }}>PRECISION</div><div style={{ color: C.gold }}>VELOCITY</div><div style={{ color: C.text }}>INSIGHT.</div></div>
        <div style={{ borderLeft: `3px solid ${C.gold}`, paddingLeft: 14, fontSize: 13, color: C.text2, lineHeight: 1.7, marginBottom: 20 }}> Experience access to institutional-grade trading infrastructure engineered for precision, performance, and global market reach across Forex, Crypto, Futures, Commodities, and NFT ecosystems. </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}><Btn variant="white" onClick={handleCTA} style={{ width: "100%" }}> INITIALIZE TRADING </Btn><Btn variant="purple" onClick={handleCTA} style={{ width: "100%" }}> EXPLORE MARKETS <div style={{ width: 22, height: 22, borderRadius: "50%", border: "2px solid #ffffff55", display: "grid", placeItems: "center" }}><div style={{ width: 8, height: 8, borderRadius: "50%", border: "2px solid #fff" }} /></div> </Btn></div>
      </div>
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
          <div><div style={{ fontWeight: 800, fontSize: 14, color: C.text }}>S&P 500 Live</div><div style={{ fontSize: 11, color: C.text3 }}>Simulated real-time feed</div></div>
          <div style={{ display: "flex", gap: 5 }}>{TABS.map(t => (<button key={t} onClick={() => setTab(t)} style={{ fontSize: 10, fontWeight: 800, padding: "4px 8px", borderRadius: 5, border: "none", cursor: "pointer", background: t === tab ? C.gold : `${C.gold}14`, color: t === tab ? "#000" : C.text3, }}>{t}</button>))}</div>
        </div>
        <ResponsiveContainer width="100%" height={130}>
          <AreaChart data={chartData} margin={{ left: -30, right: 0, top: 4, bottom: 0 }}>
            <defs><linearGradient id="ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.gold} stopOpacity={0.22} /><stop offset="100%" stopColor={C.gold} stopOpacity={0} /></linearGradient></defs>
            <XAxis dataKey="i" hide /><YAxis domain={["dataMin - 20", "dataMax + 20"]} />
            <Tooltip contentStyle={{ background: C.card2, border: `1px solid ${C.border2}`, borderRadius: 8, fontSize: 11 }} formatter={v => [v.toFixed(2), "Price"]} labelFormatter={() => ""} />
            <ReferenceLine y={4700} stroke={C.green} strokeDasharray="3 3" strokeWidth={1} /><Area type="monotone" dataKey="v" stroke={C.gold} strokeWidth={2} fill="url(#ag)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>
      <div style={{ background: `linear-gradient(135deg,#130c00,#0d0800)`, border: `1px solid ${C.gold}28`, borderRadius: 14, display: "grid", gridTemplateColumns: "repeat(4,1fr)", padding: "14px 8px" }}>{STATS.map(s => (<div key={s.label} style={{ textAlign: "center" }}><div style={{ fontSize: 15, fontWeight: 900, color: C.gold }}>{s.val}</div><div style={{ fontSize: 9, color: C.text3, textTransform: "uppercase", letterSpacing: "0.06em", marginTop: 2 }}>{s.label}</div></div>))}</div>
      <Card>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid ${C.gold}44`, borderRadius: 6, padding: "5px 12px", marginBottom: 14 }}><Zap size={11} color={C.gold} /><span style={{ fontSize: 10, fontWeight: 800, color: C.gold, letterSpacing: "0.14em" }}>QUICK START</span><ChevronRight size={10} color={C.gold} /></div>
        <div style={{ fontWeight: 900, fontSize: 19, color: C.text, marginBottom: 4 }}> Get Started in <span style={{ color: C.gold }}>Four Simple Steps</span> </div>
        <div style={{ fontSize: 12, color: C.text3, marginBottom: 16, lineHeight: 1.5 }}> Follow our streamlined onboarding process to register, deposit, trade, and withdraw. </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{STEPS.map((s, i) => (<div key={i} style={{ background: C.card2, border: `1px solid ${C.gold}22`, borderRadius: 12, padding: "14px 12px", position: "relative", overflow: "hidden" }}><div style={{ fontSize: 22, fontWeight: 900, color: `${C.gold}20`, lineHeight: 1, marginBottom: 8 }}>{s.n}</div><IconBox icon={s.icon} color={C.gold} size={14} boxSize={30} /><div style={{ fontSize: 12, fontWeight: 800, color: C.text, marginTop: 8, marginBottom: 4 }}>{s.title}</div><div style={{ fontSize: 11, color: C.text3, lineHeight: 1.5 }}>{s.desc}</div></div>))}</div>
        <Btn variant="purple" onClick={handleCTA} style={{ width: "100%", marginTop: 14 }}> START YOUR JOURNEY <ChevronRight size={16} /></Btn>
      </Card>
      <Card>
        <div style={{ fontWeight: 900, fontSize: 18, color: C.text, marginBottom: 4 }}> Enterprise-Grade <span style={{ color: C.gold }}>Infrastructure.</span> </div>
        <div style={{ fontSize: 12, color: C.text3, marginBottom: 16, lineHeight: 1.6 }}> Built on cutting-edge technology for unmatched performance, security, and reliability. </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{INFRA.map((ic, i) => (<div key={i} style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "14px", display: "flex", alignItems: "flex-start", gap: 12 }}><IconBox icon={ic.icon} color={C.gold} size={16} boxSize={38} /><div><div style={{ fontWeight: 800, fontSize: 13, color: C.text, marginBottom: 4 }}>{ic.title}</div><div style={{ fontSize: 12, color: C.text3, lineHeight: 1.5 }}>{ic.desc}</div></div></div>))}</div>
      </Card>
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

function TradePage({ prices }) {
  const { user } = useAuth();
  const [loadingDep, setLoadingDep] = useState(false);
  const [loadingWd, setLoadingWd] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [range, setRange] = useState("30D");
  const [vote, setVote] = useState(null);
  const [showVote, setShowVote] = useState(true);
  
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
      {/* Keyframes for counter-rotating gears */}
      <style>{`
        @keyframes gearCW  { to { transform: rotate( 360deg); } }
        @keyframes gearCCW { to { transform: rotate(-360deg); } }
      `}</style>

      {/* Full-page tinted background image — fixed so it covers whole Trade view */}
      <div aria-hidden="true" style={{
        position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none",
        backgroundImage: "url('/99298.jpg')",
        backgroundSize: "cover", backgroundPosition: "center top",
        opacity: 0.12,
        WebkitMaskImage: "linear-gradient(to bottom,transparent 0%,black 10%,black 84%,transparent 100%)",
        maskImage:        "linear-gradient(to bottom,transparent 0%,black 10%,black 84%,transparent 100%)",
      }} />

      {/* Gear ring — top-right, clockwise */}
      <svg aria-hidden="true" viewBox="0 0 200 200" style={{
        position:"fixed", top:"6%", right:"-20%",
        width:"65vw", maxWidth:320,
        opacity:0.11, pointerEvents:"none", zIndex:0,
        animation:"gearCW 30s linear infinite", transformOrigin:"50% 50%",
      }}>
        <circle cx="100" cy="100" r="90" fill="none" stroke="#00ff88" strokeWidth="4" strokeDasharray="14 6"/>
        <circle cx="100" cy="100" r="70" fill="none" stroke="#00cc66" strokeWidth="2" strokeDasharray="6 10"/>
        <circle cx="100" cy="100" r="52" fill="none" stroke="#00ff88" strokeWidth="5" strokeDasharray="16 5"/>
        {Array.from({length:16},(_,i)=>{const a=i*(Math.PI*2/16);return(<line key={i} x1={100+60*Math.cos(a)} y1={100+60*Math.sin(a)} x2={100+88*Math.cos(a)} y2={100+88*Math.sin(a)} stroke="#00ff88" strokeWidth="2" opacity="0.6"/>);})}
      </svg>

      {/* Gear ring — bottom-left, counter-clockwise */}
      <svg aria-hidden="true" viewBox="0 0 200 200" style={{
        position:"fixed", bottom:"8%", left:"-24%",
        width:"70vw", maxWidth:350,
        opacity:0.09, pointerEvents:"none", zIndex:0,
        animation:"gearCCW 38s linear infinite", transformOrigin:"50% 50%",
      }}>
        <circle cx="100" cy="100" r="90" fill="none" stroke="#00cc88" strokeWidth="4" strokeDasharray="10 8"/>
        <circle cx="100" cy="100" r="68" fill="none" stroke="#00ff88" strokeWidth="2" strokeDasharray="5 12"/>
        <circle cx="100" cy="100" r="50" fill="none" stroke="#00cc66" strokeWidth="5" strokeDasharray="14 6"/>
        {Array.from({length:14},(_,i)=>{const a=i*(Math.PI*2/14);return(<line key={i} x1={100+57*Math.cos(a)} y1={100+57*Math.sin(a)} x2={100+86*Math.cos(a)} y2={100+86*Math.sin(a)} stroke="#00cc88" strokeWidth="2" opacity="0.6"/>);})}
      </svg>
      {/* ── END GEAR BACKGROUND ──────────────────────────────────────────── */}

      {/* All content sits above background */}
      <div style={{ position: "relative", zIndex: 1, padding: "20px 0 4px" }}><div style={{ fontSize: 11, color: C.text3, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}> Trading Overview </div><div style={{ fontSize: 24, fontWeight: 900, color: C.text, lineHeight: 1.15 }}>Welcome,</div><div style={{ fontSize: 24, fontWeight: 900, color: C.gold, lineHeight: 1.15 }}>{user?.name || "goldenvaultxm"}</div><div style={{ fontSize: 13, color: "#7c3aed", marginTop: 8, fontStyle: "italic" }}> Here's your trading overview for today </div></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{[{ icon: Wallet, label: "Total Balance", value: `$${balance.toLocaleString()}`, badge: "+5.2%", color: C.green }, { icon: TrendingUp, label: "Total Profit", value: `$${totalProfit.toLocaleString()}`, badge: "+11.2%", color: C.green }, { icon: Activity, label: "Active Positions", value: `${activePositions}`, badge: "+3", color: C.gold }, { icon: Target, label: "Signal Value", value: `${winRate.toFixed(1)}%`, badge: "+2.3%", color: C.gold },].map((s, i) => (<Card key={i} style={{ display: "flex", flexDirection: "column", gap: 10 }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><IconBox icon={s.icon} color={s.color} /><span style={{ fontSize: 11, fontWeight: 800, color: s.color, background: `${s.color}18`, borderRadius: 20, padding: "3px 8px" }}> ↑ {s.badge} </span></div><div><div style={{ fontSize: 11, color: C.text3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{s.label}</div><div style={{ fontSize: 26, fontWeight: 900, color: C.text, letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</div></div></Card>))}</div>
      <Card>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}><div><div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Portfolio Performance</div><div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>Last {range} overview</div></div><div style={{ display: "flex", gap: 5 }}>{RANGES.map(r => (<button key={r} onClick={() => setRange(r)} style={{ fontSize: 10, fontWeight: 800, padding: "4px 9px", borderRadius: 5, border: "none", cursor: "pointer", background: r === range ? C.gold : `${C.gold}14`, color: r === range ? "#000" : C.text3, }}>{r}</button>))}</div></div>
        <ResponsiveContainer width="100%" height={148}>
          <BarChart data={data} barSize={range === "1Y" ? 2 : range === "3M" ? 4 : 8} margin={{ left: -20, right: 0 }}><XAxis dataKey="day" hide /><YAxis hide domain={["dataMin - 500", "dataMax + 200"]} /><Tooltip contentStyle={{ background: C.card2, border: `1px solid ${C.border2}`, borderRadius: 8, fontSize: 12 }} formatter={v => [`$${v.toFixed(0)}`, "Value"]} cursor={{ fill: `${C.gold}08` }} /><Bar dataKey="value" radius={[3, 3, 0, 0]}>{data.map((e, i) => (<Cell key={i} fill={e.value > 7500 ? C.gold2 : e.value > 5500 ? C.gold : `${C.goldDim}cc`} />))}</Bar></BarChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.border}` }}>
          <div><div style={{ fontSize: 10, color: C.text3, textTransform: "uppercase" }}>Total Invested</div><div style={{ fontSize: 17, fontWeight: 800, color: C.text, marginTop: 3 }}>${totalInvested.toLocaleString()}</div></div>
          <div style={{ textAlign: "right" }}><div style={{ fontSize: 10, color: C.text3, textTransform: "uppercase" }}>Current Value</div><div style={{ fontSize: 17, fontWeight: 800, color: C.green, marginTop: 3 }}>${currentValue.toLocaleString()}</div></div>
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
          <Btn variant="outline" loading={loadingWd} onClick={() => { setLoadingWd(true); setTimeout(() => setLoadingWd(false), 1600); }} style={{ width: "100%" }}><ArrowUpFromLine size={15} /> Withdraw Funds </Btn>
          <Btn variant="ghost" style={{ width: "100%" }}><FileBarChart size={15} /> View Reports </Btn>
        </div>
      </Card>
      <Card>
        <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 14 }}>Account Status</div>
        {[{ label: "Verification", value: "Verified", color: C.green }, { label: "Account Type", value: "Premium", color: C.gold2 }, { label: "KYC Level", value: "Level 3", color: "#a78bfa" },].map((row, i, arr) => (<div key={i}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 0" }}><span style={{ fontSize: 13, color: C.text3 }}>{row.label}</span><Badge color={row.color}>{row.value}</Badge></div>{i < arr.length - 1 && <GoldLine />}</div>))}
      </Card>
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}><div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Portfolio Holdings</div><button style={{ background: "none", border: "none", color: C.gold, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 3 }}> View All <ChevronRight size={12} /></button></div>
        {HOLDINGS.map((h, i) => (<div key={i}><div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}><div style={{ width: 36, height: 36, borderRadius: 9, background: `${h.color}18`, display: "grid", placeItems: "center", flexShrink: 0 }}><span style={{ fontSize: 10, fontWeight: 900, color: h.color }}>{h.pair.split("/")[0]}</span></div><div style={{ flex: 1 }}><div style={{ fontWeight: 800, fontSize: 13, color: C.text }}>{h.pair}</div><div style={{ fontSize: 10, color: C.text3, marginTop: 1 }}>{h.label}</div></div><div style={{ textAlign: "right" }}><div style={{ fontSize: 13, fontWeight: 800, color: h.pct >= 0 ? C.green : C.red }}>{h.pct >= 0 ? "+" : ""}{h.pct}%</div><div style={{ fontSize: 11, color: h.pct >= 0 ? C.green : C.red, marginTop: 1 }}>{h.delta >= 0 ? "+$" : "-$"}{Math.abs(h.delta).toFixed(2)}</div></div></div>{i < HOLDINGS.length - 1 && <GoldLine />}</div>))}
      </Card>
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}><div style={{ fontWeight: 800, fontSize: 15, color: C.text }}>Market Sentiment</div><Activity size={15} color={C.gold} /></div>
        <div style={{ textAlign: "center", marginBottom: 18 }}><div style={{ fontSize: 72, fontWeight: 900, color: C.red, lineHeight: 1, textShadow: `0 0 40px ${C.red}44` }}>24</div><div style={{ fontSize: 12, fontWeight: 800, color: C.red, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.14em" }}>Fear</div></div>
        <div style={{ display: "flex", height: 7, borderRadius: 4, overflow: "hidden", gap: 2, marginBottom: 8 }}><div style={{ flex: 38, background: C.green, borderRadius: "4px 0 0 4px" }} /><div style={{ flex: 24, background: C.red, borderRadius: "0 4px 4px 0" }} /></div>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}><span style={{ fontSize: 12, fontWeight: 800, color: C.green }}>Bullish 38</span><span style={{ fontSize: 12, fontWeight: 800, color: C.red }}>Bearish 24</span></div>
        {showVote && (
          <div style={{ background: C.card2, border: `1px solid ${C.border2}`, borderRadius: 12, padding: "14px", position: "relative" }}>
            <button onClick={() => setShowVote(false)} style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer", color: C.text4 }}><X size={14} /></button>
            <div style={{ fontWeight: 800, fontSize: 13, color: C.text, marginBottom: 12, paddingRight: 16 }}> How do you feel about the Market today? </div>
            <div style={{ display: "flex", gap: 8 }}>{ [["bullish", C.green, "Bullish"], ["bearish", C.red, "Bearish"]].map(([key, col, lbl]) => (<button key={key} onClick={() => setVote(key)} style={{ flex: 1, padding: "11px 0", borderRadius: 20, border: "none", cursor: "pointer", fontWeight: 800, fontSize: 13, transition: "all .2s", background: vote === key ? col : `${col}22`, color: vote === key ? "#fff" : col, }}>{lbl}</button>))}</div>
            {vote && <div style={{ marginTop: 10, textAlign: "center", fontSize: 11, color: C.text3 }}> ✓ Thanks — sentiment updated </div>}
          </div>
        )}
      </Card>
    </div>
  );
}

function SettingsPage() {
  const { isAuthenticated, logout, requireAuth } = useAuth();
  const GROUPS = [{ title: "Platform", items: [{ icon: BarChart2, label: "Markets", sub: "View all trading pairs" }, { icon: TrendingUp, label: "Trading", sub: "Configure trading preferences" }, { icon: BookOpen, label: "Support Center", sub: "Help and documentation" },] }, { title: "Account", items: [{ icon: Eye, label: "Dashboard", sub: "View performance overview" }, { icon: Lock, label: "Security Settings", sub: "2FA and login management" }, { icon: Bell, label: "Notifications", sub: "Alerts and push settings" },] }, { title: "Resources", items: [{ icon: BookOpen, label: "Trading Guide", sub: "Learn trading strategies" }, { icon: Award, label: "Market Analysis", sub: "Expert insights and reports" },] },];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ padding: "20px 0 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
  <div style={{ fontSize: 22, fontWeight: 900, color: C.text }}>Account</div>
  <ThemeToggle />
</div>
      <Card style={{ background: `linear-gradient(160deg,#1a1000,${C.card})`, border: `1px solid ${C.gold}33` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}><div style={{ width: 54, height: 54, borderRadius: 13, background: `linear-gradient(135deg,${C.gold},${C.goldDim})`, display: "grid", placeItems: "center" }}><span style={{ fontSize: 18, fontWeight: 900, color: "#000" }}>GV</span></div><div><div style={{ fontWeight: 900, fontSize: 16, color: C.text, letterSpacing: "0.04em" }}>GOLDEN VAULT XM</div><div style={{ fontSize: 10, color: C.text3, letterSpacing: "0.14em", marginTop: 2 }}>CHAIN</div></div></div>
        <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.7, margin: "14px 0" }}> Enterprise-grade trading platform providing access to global financial markets with institutional-level security and performance. </div>
        <GoldLine />
        <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>{[[Mail, "support@goldenvaultxm.com"], [Phone, "24/7 Trading Desk"], [MapPin, "Global Trading Hub"]].map(([Icon, val]) => (<div key={val} style={{ display: "flex", alignItems: "center", gap: 10 }}><Icon size={13} color={C.gold} /><span style={{ fontSize: 13, color: C.text2 }}>{val}</span></div>))}</div>
      </Card>
      {!isAuthenticated && (<Card style={{ border: `1px solid ${C.gold}33`, background: `linear-gradient(135deg,#1a0f00,${C.card})` }}><div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}><IconBox icon={Lock} color={C.gold} size={16} /><div><div style={{ fontWeight: 800, fontSize: 14, color: C.text }}>Unlock Full Access</div><div style={{ fontSize: 12, color: C.text3, marginTop: 2 }}>Sign up to access trading features</div></div></div><Btn variant="gold" onClick={() => requireAuth("signup")} style={{ width: "100%" }}><UserPlus size={15} /> Create Free Account </Btn></Card>)}
      {GROUPS.map(group => (<Card key={group.title} style={{ padding: "4px 0" }}><div style={{ fontWeight: 800, fontSize: 13, color: C.text3, padding: "14px 16px 10px", textTransform: "uppercase", letterSpacing: "0.1em" }}>{group.title}</div>{group.items.map((item, i) => (<div key={item.label}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", cursor: "pointer" }}><div style={{ display: "flex", alignItems: "center", gap: 12 }}><IconBox icon={item.icon} color={C.gold} size={14} boxSize={34} /><div><div style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{item.label}</div><div style={{ fontSize: 11, color: C.text3, marginTop: 1 }}>{item.sub}</div></div></div><ChevronRight size={13} color={C.text4} /></div>{i < group.items.length - 1 && <div style={{ margin: "0 16px" }}><GoldLine /></div>}</div>))}</Card>))}
      {isAuthenticated && (<Btn variant="danger" onClick={logout} style={{ width: "100%" }}><LogOut size={16} /> Sign Out </Btn>)}
    </div>
  );
}

/* ─── News API Key ───────────────────────────────────────────────────────── */
const NEWS_CATEGORIES = ["All", "Top stories", "Stocks", "ETFs", "Crypto", "Forex", "Commodities"];

function NewsPage() {
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [category, setCategory] = useState("All");
  const [newStoryCount, setNewStoryCount] = useState(0);
  const [bellOpen, setBellOpen] = useState(false);
  const [newsBellAlerts, setNewsBellAlerts] = useState([]);
  const prevArticleIds = useRef(new Set());
  const pollRef = useRef(null);

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

  const fmtRelTime = (iso) => {
    if (!iso) return "";
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
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
              {/* Source row */}
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
              {/* Headline */}
              <div style={{ fontSize: 16, fontWeight: 800, color: C.text, lineHeight: 1.4, letterSpacing: "-0.01em" }}>
                {article.title}
              </div>
              {/* Description */}
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

function AppShell({ page, setPage }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [globalDepositOpen, setGlobalDepositOpen] = useState(false);
  const { isAuthenticated, requireAuth } = useAuth();
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
      case "trade":    return <TradePage prices={prices} />;
      case "news":     return <NewsPage />;
      case "settings": return <SettingsPage />;
      default:         return <HomePage setPage={handleSetPage} />;
    }
  };

  return (
    <div className="gvxm-shell" style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans','Inter','Roboto',sans-serif" }}>
      <style>{`
        *, *::before, *::after {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }
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
      <div style={{ position: "relative", zIndex: 1 }}>
        <Nav page={page} setPage={handleSetPage} open={menuOpen} setOpen={setMenuOpen} openDeposit={() => setGlobalDepositOpen(true)} />
        <main style={{ padding: "0 16px 100px" }}>
          {renderPage()}
        </main>
        <BottomNav page={page} setPage={handleSetPage} />
      </div>
    </div>
  );
}

export default function GoldenVaultXM() {
  const [page, setPage] = useState("home");
  return (
    <LayoutProvider>
      <ThemeProvider>
        <AuthProvider onLogin={() => setPage("trade")}>
          <AppShell page={page} setPage={setPage} />
        </AuthProvider>
      </ThemeProvider>
    </LayoutProvider>
  );
}
