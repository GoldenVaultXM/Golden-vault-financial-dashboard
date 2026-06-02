import {
  useState,
  useEffect,
  useCallback,
  createContext,
  useContext,
} from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine,
} from "recharts";
import {
  Wallet, TrendingUp, Activity, Target, BarChart2, Shield, Zap, Globe,
  ArrowDownToLine, ArrowUpFromLine, FileBarChart, CheckCircle2,
  Menu, X, ChevronRight, Bell, Settings, LogOut, Home, Search, Lock,
  Award, BookOpen, Mail, Phone, MapPin, Eye, EyeOff, UserPlus, LogIn,
  AlertCircle, RefreshCw, Users,
} from "lucide-react";
import { supabase } from "./supabaseClient";

/* ─── Design Tokens ──────────────────────────────────────────────────────── */
const C = {
  bg:      "#080808",
  card:    "#0f0f0f",
  card2:   "#141414",
  card3:   "#1a1a1a",
  border:  "#222222",
  border2: "#2a2a2a",
  gold:    "#d97706",
  gold2:   "#f59e0b",
  gold3:   "#fbbf24",
  goldDim: "#92400e",
  green:   "#22c55e",
  red:     "#ef4444",
  purple:  "#7c3aed",
  blue:    "#3b82f6",
  text:    "#ffffff",
  text2:   "#a3a3a3",
  text3:   "#525252",
  text4:   "#303030",
};

/* ─── Auth Context ───────────────────────────────────────────────────────── */
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

/* ─── Layout Context ─────────────────────────────────────────────────────── */
const LAYOUT_KEY    = "gvxm_layout_mode";
const LAYOUT_WIDTHS = { mobile: 600, desktop: 1200 };

const LayoutContext = createContext(null);
const useLayout = () => useContext(LayoutContext);

function LayoutProvider({ children }) {
  const [mode, setModeRaw] = useState(() => {
    try {
      const saved = localStorage.getItem(LAYOUT_KEY);
      return saved === "desktop" ? "desktop" : "mobile";
    } catch {
      return "mobile";
    }
  });

  useEffect(() => {
    try { localStorage.setItem(LAYOUT_KEY, mode); } catch {}
    applyLayoutCSS(mode);
  }, [mode]);

  // The ONLY way the mode can change
  const toggleLayout = useCallback(() => {
    setModeRaw(prev => (prev === "mobile" ? "desktop" : "mobile"));
  }, []);

  const width = LAYOUT_WIDTHS[mode];
  return (
    <LayoutContext.Provider value={{ mode, width, toggleLayout }}>
      {children}
    </LayoutContext.Provider>
  );
}

/* ─── Viewport + Base CSS — synchronous module-level execution ───────────── */
function ensureViewportMeta() {
  let meta = document.querySelector('meta[name="viewport"]');
  if (!meta) {
    meta = document.createElement("meta");
    meta.name = "viewport";
    document.head.insertBefore(meta, document.head.firstChild);
  }
  meta.content =
    "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no";
}

function applyLayoutCSS(mode) {
  const w  = LAYOUT_WIDTHS[mode];
  const id = "gvxm-layout-lock";
  let tag  = document.getElementById(id);
  if (!tag) {
    tag    = document.createElement("style");
    tag.id = id;
    document.head.insertBefore(tag, document.head.firstChild);
  }
  tag.textContent = `
    html {
      background: #080808 !important;
      overflow-x: hidden !important;
    }
    body {
      background: #080808 !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      min-width: 0 !important;
      max-width: 100% !important;
      overflow-x: hidden !important;
      -webkit-text-size-adjust: 100% !important;
      text-size-adjust: 100% !important;
    }
    .gvxm-shell {
      width: 100% !important;
      max-width: ${w}px !important;
      min-width: 0 !important;
      margin: 0 auto !important;
      overflow-x: hidden !important;
      box-sizing: border-box !important;
    }
    #gvxm-root {
      width: 100% !important;
      max-width: 100% !important;
      overflow-x: hidden !important;
    }
  `;
}

// Run synchronously at module evaluation time
ensureViewportMeta();
applyLayoutCSS((() => {
  try {
    return localStorage.getItem(LAYOUT_KEY) === "desktop" ? "desktop" : "mobile";
  } catch {
    return "mobile";
  }
})());

/* ─── Market Instrument Definitions ─────────────────────────────────────── */
const INSTRUMENT_DEFS = [
  { pair: "BTC/USDT",  name: "Bitcoin",                        cat: "Crypto",      base: 67800,    step: 0.0003  },
  { pair: "ETH/USDT",  name: "Ethereum",                       cat: "Crypto",      base: 3520,     step: 0.0003  },
  { pair: "SOL/USDT",  name: "Solana",                         cat: "Crypto",      base: 178,      step: 0.0004  },
  { pair: "XRP/USDT",  name: "XRP",                            cat: "Crypto",      base: 0.5821,   step: 0.0005  },
  { pair: "BNB/USDT",  name: "BNB",                            cat: "Crypto",      base: 612,      step: 0.0003  },
  { pair: "ADA/USDT",  name: "Cardano",                        cat: "Crypto",      base: 0.4412,   step: 0.0004  },
  { pair: "AVAX/USDT", name: "Avalanche",                      cat: "Crypto",      base: 38.5,     step: 0.0004  },
  { pair: "DOGE/USDT", name: "Dogecoin",                       cat: "Crypto",      base: 0.1634,   step: 0.0005  },
  { pair: "MATIC/USDT",name: "Polygon",                        cat: "Crypto",      base: 0.8821,   step: 0.0004  },
  { pair: "LINK/USDT", name: "Chainlink",                      cat: "Crypto",      base: 18.42,    step: 0.0004  },
  { pair: "UNI/USDT",  name: "Uniswap",                        cat: "Crypto",      base: 10.34,    step: 0.0004  },
  { pair: "LTC/USDT",  name: "Litecoin",                       cat: "Crypto",      base: 86.5,     step: 0.0003  },
  { pair: "DOT/USDT",  name: "Polkadot",                       cat: "Crypto",      base: 7.82,     step: 0.0004  },
  { pair: "SHIB/USDT", name: "Shiba Inu",                      cat: "Crypto",      base: 0.0000248,step: 0.0005  },
  { pair: "ATOM/USDT", name: "Cosmos",                         cat: "Crypto",      base: 9.41,     step: 0.0004  },
  { pair: "EUR/USD",   name: "Euro / US Dollar",               cat: "Forex",       base: 1.08432,  step: 0.00008 },
  { pair: "GBP/USD",   name: "British Pound / USD",            cat: "Forex",       base: 1.27180,  step: 0.00008 },
  { pair: "USD/JPY",   name: "US Dollar / Japanese Yen",       cat: "Forex",       base: 156.84,   step: 0.00006 },
  { pair: "AUD/USD",   name: "Australian Dollar / USD",        cat: "Forex",       base: 0.65820,  step: 0.00007 },
  { pair: "USD/CHF",   name: "US Dollar / Swiss Franc",        cat: "Forex",       base: 0.91240,  step: 0.00007 },
  { pair: "USD/CAD",   name: "US Dollar / Canadian Dollar",    cat: "Forex",       base: 1.36420,  step: 0.00007 },
  { pair: "NZD/USD",   name: "New Zealand Dollar / USD",       cat: "Forex",       base: 0.60150,  step: 0.00008 },
  { pair: "EUR/GBP",   name: "Euro / British Pound",           cat: "Forex",       base: 0.85210,  step: 0.00006 },
  { pair: "EUR/JPY",   name: "Euro / Japanese Yen",            cat: "Forex",       base: 169.82,   step: 0.00006 },
  { pair: "GBP/JPY",   name: "British Pound / Yen",            cat: "Forex",       base: 199.41,   step: 0.00006 },
  { pair: "EUR/CHF",   name: "Euro / Swiss Franc",             cat: "Forex",       base: 0.98740,  step: 0.00007 },
  { pair: "AUD/JPY",   name: "Australian Dollar / Yen",        cat: "Forex",       base: 103.21,   step: 0.00006 },
  { pair: "USD/MXN",   name: "US Dollar / Mexican Peso",       cat: "Forex",       base: 17.2410,  step: 0.00007 },
  { pair: "USD/SGD",   name: "US Dollar / Singapore Dollar",   cat: "Forex",       base: 1.3562,   step: 0.00007 },
  { pair: "USD/ZAR",   name: "US Dollar / South African Rand", cat: "Forex",       base: 18.621,   step: 0.00007 },
  { pair: "AAPL",      name: "Apple Inc.",                     cat: "Stocks",      base: 189.30,   step: 0.0002  },
  { pair: "NVDA",      name: "NVIDIA Corporation",             cat: "Stocks",      base: 875.40,   step: 0.0002  },
  { pair: "TSLA",      name: "Tesla Inc.",                     cat: "Stocks",      base: 248.60,   step: 0.0003  },
  { pair: "AMZN",      name: "Amazon.com Inc.",                cat: "Stocks",      base: 186.80,   step: 0.0002  },
  { pair: "MSFT",      name: "Microsoft Corporation",          cat: "Stocks",      base: 420.50,   step: 0.0002  },
  { pair: "GOOGL",     name: "Alphabet Inc.",                  cat: "Stocks",      base: 175.20,   step: 0.0002  },
  { pair: "META",      name: "Meta Platforms Inc.",            cat: "Stocks",      base: 508.40,   step: 0.0002  },
  { pair: "JPM",       name: "JPMorgan Chase",                 cat: "Stocks",      base: 199.60,   step: 0.0002  },
  { pair: "V",         name: "Visa Inc.",                      cat: "Stocks",      base: 278.30,   step: 0.0002  },
  { pair: "WMT",       name: "Walmart Inc.",                   cat: "Stocks",      base: 67.82,    step: 0.0002  },
  { pair: "NFLX",      name: "Netflix Inc.",                   cat: "Stocks",      base: 627.40,   step: 0.0003  },
  { pair: "AMD",       name: "Advanced Micro Devices",         cat: "Stocks",      base: 162.80,   step: 0.0003  },
  { pair: "COIN",      name: "Coinbase Global",                cat: "Stocks",      base: 214.30,   step: 0.0003  },
  { pair: "PLTR",      name: "Palantir Technologies",          cat: "Stocks",      base: 22.40,    step: 0.0003  },
  { pair: "SPX",       name: "S&P 500 Index",                  cat: "Indices",     base: 5218.0,   step: 0.0001  },
  { pair: "NDX",       name: "NASDAQ 100",                     cat: "Indices",     base: 18320.0,  step: 0.0001  },
  { pair: "DJIA",      name: "Dow Jones Industrial",           cat: "Indices",     base: 39200.0,  step: 0.0001  },
  { pair: "RUT",       name: "Russell 2000",                   cat: "Indices",     base: 2082.0,   step: 0.0001  },
  { pair: "VIX",       name: "CBOE Volatility Index",          cat: "Indices",     base: 14.82,    step: 0.0002  },
  { pair: "FTSE",      name: "FTSE 100",                       cat: "Indices",     base: 8180.0,   step: 0.0001  },
  { pair: "DAX",       name: "DAX 40",                         cat: "Indices",     base: 18640.0,  step: 0.0001  },
  { pair: "N225",      name: "Nikkei 225",                     cat: "Indices",     base: 38820.0,  step: 0.0001  },
  { pair: "XAU/USD",   name: "Gold Spot",                      cat: "Commodities", base: 2342.0,   step: 0.0001  },
  { pair: "XAG/USD",   name: "Silver Spot",                    cat: "Commodities", base: 29.82,    step: 0.0002  },
  { pair: "XTI/USD",   name: "Crude Oil WTI",                  cat: "Commodities", base: 77.40,    step: 0.0002  },
  { pair: "BRENT",     name: "Crude Oil Brent",                cat: "Commodities", base: 81.60,    step: 0.0002  },
  { pair: "NATGAS",    name: "Natural Gas",                    cat: "Commodities", base: 2.418,    step: 0.0003  },
  { pair: "COPPER",    name: "Copper",                         cat: "Commodities", base: 4.612,    step: 0.0002  },
  { pair: "ES",        name: "S&P 500 E-mini Futures",         cat: "Futures",     base: 5220.0,   step: 0.0001  },
  { pair: "NQ",        name: "NASDAQ 100 Futures",             cat: "Futures",     base: 18340.0,  step: 0.0001  },
  { pair: "YM",        name: "Dow Jones Futures",              cat: "Futures",     base: 39180.0,  step: 0.0001  },
  { pair: "GC",        name: "Gold Futures",                   cat: "Futures",     base: 2350.0,   step: 0.0001  },
  { pair: "CL",        name: "Crude Oil Futures",              cat: "Futures",     base: 77.60,    step: 0.0002  },
  { pair: "ZN",        name: "10-Year T-Note Futures",         cat: "Futures",     base: 109.12,   step: 0.0001  },
  { pair: "US02Y",     name: "US 2-Year Treasury",             cat: "Bonds",       base: 4.921,    step: 0.0001  },
  { pair: "US05Y",     name: "US 5-Year Treasury",             cat: "Bonds",       base: 4.412,    step: 0.0001  },
  { pair: "US10Y",     name: "US 10-Year Treasury",            cat: "Bonds",       base: 4.281,    step: 0.0001  },
  { pair: "US30Y",     name: "US 30-Year Treasury",            cat: "Bonds",       base: 4.480,    step: 0.0001  },
  { pair: "TLT",       name: "20+ Year T-Bond ETF",            cat: "Bonds",       base: 91.42,    step: 0.0001  },
];

const CATS = ["All", "Crypto", "Forex", "Stocks", "Indices", "Commodities", "Futures", "Bonds"];

/* ─── Price simulator hook ───────────────────────────────────────────────── */
// FIX BUG 2: setFlash(flashNext) moved OUTSIDE the setPrices updater function.
// Calling setState for a different piece of state inside another setState updater
// is an anti-pattern in React and can cause stale-closure / batching issues.
function useLivePrices() {
  const initPrices = () => {
    const m = {};
    INSTRUMENT_DEFS.forEach(d => {
      m[d.pair] = {
        price:   d.base,
        pct24h:  (Math.random() - 0.45) * 4,
        prevDay: d.base * (1 - (Math.random() - 0.45) * 0.04),
        up:      Math.random() > 0.45,
      };
    });
    return m;
  };

  const [prices, setPrices] = useState(initPrices);
  const [flash,  setFlash]  = useState({});

  useEffect(() => {
    const interval = setInterval(() => {
      // Collect flash state here, outside the updater
      const flashNext = {};

      setPrices(prev => {
        const next     = { ...prev };
        const toUpdate = INSTRUMENT_DEFS
          .filter(() => Math.random() < 0.30)
          .map(d => d.pair);

        toUpdate.forEach(pair => {
          const def      = INSTRUMENT_DEFS.find(d => d.pair === pair);
          const cur      = prev[pair];
          const sign     = Math.random() > 0.5 ? 1 : -1;
          const mag      = def.step * (0.5 + Math.random()) * def.base;
          const newPrice = Math.max(cur.price + sign * mag, def.base * 0.7);
          const newPct24h = ((newPrice - cur.prevDay) / cur.prevDay) * 100;

          next[pair]       = { price: newPrice, pct24h: newPct24h, prevDay: cur.prevDay, up: sign === 1 };
          flashNext[pair]  = sign === 1 ? "up" : "dn";  // build outside, read below
        });

        return next;
      });

      // FIX: setFlash called AFTER setPrices, not inside its updater
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
    if (price < 0.001)   return price.toFixed(6);
    if (price < 1)       return price.toFixed(4);
    if (price < 10)      return price.toFixed(3);
    return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  if (cat === "Forex") return price > 50 ? price.toFixed(3) : price.toFixed(4);
  if (cat === "Bonds") return price.toFixed(3) + "%";
  if (price > 10000)   return price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return price.toFixed(2);
};

const fmtPct  = p   => p == null ? "—" : `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`;
const catColor = cat => ({
  Crypto:      "#f59e0b",
  Forex:       "#3b82f6",
  Stocks:      "#22c55e",
  Indices:     "#a78bfa",
  Commodities: "#fbbf24",
  Futures:     "#ef4444",
  Bonds:       "#94a3b8",
}[cat] || C.text3);

/* ─── Shared UI Primitives ───────────────────────────────────────────────── */
const GoldLine = () => (
  <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${C.gold}33,transparent)` }} />
);

const Card = ({ children, style = {} }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 16px", ...style }}>
    {children}
  </div>
);

const Badge = ({ children, color }) => (
  <span style={{
    fontSize: 10, fontWeight: 800, letterSpacing: "0.06em",
    background: `${color}20`, color, borderRadius: 4,
    padding: "2px 7px", display: "inline-block", textTransform: "uppercase",
  }}>
    {children}
  </span>
);

const IconBox = ({ icon: Icon, color = C.gold, size = 16, boxSize = 36 }) => (
  <div style={{
    width: boxSize, height: boxSize, borderRadius: 9,
    background: `${color}18`, display: "grid", placeItems: "center", flexShrink: 0,
  }}>
    <Icon size={size} color={color} />
  </div>
);

/* ─── Spin keyframe injector ─────────────────────────────────────────────── */
// FIX BUG 4: The "spin" @keyframes was referenced in Btn but never defined.
// Inject it once at module level so the RefreshCw loading spinner actually rotates.
(function injectSpinKeyframe() {
  const id = "gvxm-spin-keyframe";
  if (document.getElementById(id)) return;
  const style   = document.createElement("style");
  style.id      = id;
  style.textContent = `
    @keyframes spin {
      from { transform: rotate(0deg);   }
      to   { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);
})();

/* ─── Hover-aware button ─────────────────────────────────────────────────── */
function Btn({ children, onClick, variant = "gold", loading = false, disabled = false, style = {} }) {
  const [hov, setHov] = useState(false);

  const base = {
    border: "none", borderRadius: 10, padding: "13px 16px",
    fontWeight: 900, fontSize: 13,
    cursor: disabled || loading ? "not-allowed" : "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    gap: 8, transition: "all .18s", letterSpacing: "0.04em", outline: "none",
  };

  const variants = {
    gold:    { background: disabled ? C.goldDim : hov ? C.gold2 : C.gold, color: "#000", transform: hov && !disabled ? "scale(1.01)" : "scale(1)" },
    outline: { background: "transparent", color: hov ? C.gold2 : C.gold, border: `1.5px solid ${hov ? C.gold2 : C.gold}`, transform: hov ? "scale(1.01)" : "scale(1)" },
    ghost:   { background: hov ? C.card3 : C.card2, color: C.text3, border: `1px solid ${C.border}` },
    danger:  { background: hov ? "#b91c1c" : C.card, color: C.red, border: `1px solid ${C.border}` },
    purple:  { background: hov ? "#6d28d9" : C.purple, color: "#fff", transform: hov ? "scale(1.01)" : "scale(1)" },
    white:   { background: hov ? "#e5e7eb" : C.text, color: "#000", transform: hov ? "scale(1.01)" : "scale(1)" },
  };

  return (
    <button
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      onClick={!disabled && !loading ? onClick : undefined}
      style={{ ...base, ...variants[variant], opacity: loading || disabled ? 0.7 : 1, ...style }}
    >
      {loading
        ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Processing…</>
        : children}
    </button>
  );
}

/* ─── Google "G" SVG logo ────────────────────────────────────────────────── */
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
);

/* ─── Auth Modal ─────────────────────────────────────────────────────────── */
function AuthModal({ onClose, initialMode = "signup" }) {
  const { login } = useAuth();

  // Renamed local state to "authMode" to avoid shadowing LayoutProvider's "mode"
  const [authMode,     setAuthMode]     = useState(initialMode);
  const [showPw,       setShowPw]       = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [googleLoading,setGoogleLoading]= useState(false);
  const [error,        setError]        = useState("");
  const [agreed,       setAgreed]       = useState(false);
  const [form,         setForm]         = useState({ name: "", email: "", password: "" });

  /* ── Google OAuth ─────────────────────────────────────────────────────── */
  // FIX BUG 3: Subscribe to onAuthStateChange BEFORE calling signInWithOAuth.
  // On a full-page redirect the component unmounts immediately after the OAuth
  // call, so any listener created after the call is already destroyed.
  // Setting the listener first ensures it is active when the user returns.
  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);

    // Set up listener FIRST so it survives the redirect
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session?.user) {
        subscription.unsubscribe();
        login({
          name:  session.user.user_metadata?.full_name || session.user.email.split("@")[0],
          email: session.user.email,
        });
        setGoogleLoading(false);
        onClose();
      }
    });

    // THEN trigger the redirect
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options:  { redirectTo: window.location.origin },
    });

    if (oauthError) {
      subscription.unsubscribe();   // clean up listener if OAuth call itself failed
      setError(oauthError.message);
      setGoogleLoading(false);
    }
  };

  /* ── Email / password ─────────────────────────────────────────────────── */
  // FIX BUG 1: Function was truncated. Restored full implementation.
  // FIX BUG 5: Removed dead `let authError = null` variable.
  const handle = async () => {
    setError("");

    if (authMode === "signup" && !agreed) {
      setError("Please confirm you are 18 or older and agree to the Terms.");
      return;
    }

    setLoading(true);

    if (authMode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email:    form.email,
        password: form.password,
        options:  { data: { full_name: form.name } },
      });

      setLoading(false);

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      // Supabase may require email confirmation — inform the user
      if (data?.user && !data.session) {
        setError("Check your email to confirm your account before signing in.");
        return;
      }

      if (data?.user) {
        login({
          name:  data.user.user_metadata?.full_name || form.name || form.email.split("@")[0],
          email: data.user.email,
        });
        onClose();
      }
    } else {
      // Sign-in flow
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email:    form.email,
        password: form.password,
      });

      setLoading(false);

      if (signInError) {
        setError(signInError.message);
        return;
      }

      if (data?.user) {
        login({
          name:  data.user.user_metadata?.full_name || form.email.split("@")[0],
          email: data.user.email,
        });
        onClose();
      }
    }
  };

  /* ── JSX ──────────────────────────────────────────────────────────────── */
  const isSignup = authMode === "signup";

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      background: "rgba(0,0,0,0.85)", backdropFilter: "blur(6px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "16px",
    }}>
      <div style={{
        background: C.card, border: `1px solid ${C.border2}`,
        borderRadius: 20, padding: "32px 24px",
        width: "100%", maxWidth: 420, position: "relative",
      }}>
        {/* Close */}
        <button
          onClick={onClose}
          style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: C.text3 }}
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <div style={{ fontSize: 28, marginBottom: 6 }}>
            {isSignup ? "🚀" : "👋"}
          </div>
          <h2 style={{ margin: 0, color: C.text, fontSize: 22, fontWeight: 900 }}>
            {isSignup ? "Create Account" : "Welcome Back"}
          </h2>
          <p style={{ margin: "6px 0 0", color: C.text2, fontSize: 13 }}>
            {isSignup ? "Start trading with GVXM today" : "Sign in to your GVXM account"}
          </p>
        </div>

        {/* Google button */}
        <Btn
          variant="white"
          onClick={handleGoogle}
          loading={googleLoading}
          style={{ width: "100%", marginBottom: 16 }}
        >
          <GoogleIcon />
          Continue with Google
        </Btn>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: C.border }} />
          <span style={{ color: C.text3, fontSize: 12 }}>or</span>
          <div style={{ flex: 1, height: 1, background: C.border }} />
        </div>

        {/* Name field (signup only) */}
        {isSignup && (
          <input
            placeholder="Full Name"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            style={{
              width: "100%", boxSizing: "border-box",
              background: C.card2, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: "12px 14px", color: C.text,
              fontSize: 14, marginBottom: 10, outline: "none",
            }}
          />
        )}

        {/* Email */}
        <input
          placeholder="Email address"
          type="email"
          value={form.email}
          onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
          style={{
            width: "100%", boxSizing: "border-box",
            background: C.card2, border: `1px solid ${C.border}`,
            borderRadius: 10, padding: "12px 14px", color: C.text,
            fontSize: 14, marginBottom: 10, outline: "none",
          }}
        />

        {/* Password */}
        <div style={{ position: "relative", marginBottom: 10 }}>
          <input
            placeholder="Password"
            type={showPw ? "text" : "password"}
            value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            style={{
              width: "100%", boxSizing: "border-box",
              background: C.card2, border: `1px solid ${C.border}`,
              borderRadius: 10, padding: "12px 42px 12px 14px", color: C.text,
              fontSize: 14, outline: "none",
            }}
          />
          <button
            onClick={() => setShowPw(v => !v)}
            style={{
              position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", color: C.text3,
            }}
          >
            {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {/* Age / terms checkbox (signup only) */}
        {isSignup && (
          <label style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 14, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={agreed}
              onChange={e => setAgreed(e.target.checked)}
              style={{ marginTop: 2, accentColor: C.gold }}
            />
            <span style={{ color: C.text2, fontSize: 12, lineHeight: 1.5 }}>
              I confirm I am 18 or older and agree to the{" "}
              <span style={{ color: C.gold, textDecoration: "underline", cursor: "pointer" }}>Terms of Service</span>
              {" "}and{" "}
              <span style={{ color: C.gold, textDecoration: "underline", cursor: "pointer" }}>Privacy Policy</span>
            </span>
          </label>
        )}

        {/* Error message */}
        {error && (
          <div style={{
            background: `${C.red}15`, border: `1px solid ${C.red}40`,
            borderRadius: 8, padding: "10px 12px", marginBottom: 14,
            display: "flex", alignItems: "center", gap: 8,
          }}>
            <AlertCircle size={14} color={C.red} />
            <span style={{ color: C.red, fontSize: 12 }}>{error}</span>
          </div>
        )}

        {/* Submit */}
        <Btn
          variant="gold"
          onClick={handle}
          loading={loading}
          style={{ width: "100%", marginBottom: 14 }}
        >
          {isSignup ? <><UserPlus size={16} /> Create Account</> : <><LogIn size={16} /> Sign In</>}
        </Btn>

        {/* Toggle signup/signin */}
        <p style={{ textAlign: "center", color: C.text2, fontSize: 13, margin: 0 }}>
          {isSignup ? "Already have an account? " : "Don't have an account? "}
          <span
            onClick={() => { setAuthMode(isSignup ? "login" : "signup"); setError(""); }}
            style={{ color: C.gold, cursor: "pointer", fontWeight: 700 }}
          >
            {isSignup ? "Sign In" : "Sign Up"}
          </span>
        </p>
      </div>
    </div>
  );
}

export { LayoutProvider, useLayout, AuthContext, useAuth, AuthModal, useLivePrices, fmtPrice, fmtPct, catColor, GoldLine, Card, Badge, IconBox, Btn, GoogleIcon, INSTRUMENT_DEFS, CATS, C };
