imp/**
 * GoldenVaultXM — Audited & Production-Ready
 *
 * FIXES APPLIED (see audit report):
 *  [CRITICAL-1]  File was truncated mid-JSX — AuthModal completed, all brackets closed.
 *  [CRITICAL-2]  Google OAuth now redirectTo `${origin}/trade` so post-sign-in lands on /trade.
 *  [HIGH-1]      onAuthStateChange moved OUT of handleGoogle into a top-level useEffect on
 *                AuthProvider — single subscription, properly cleaned up on unmount.
 *  [HIGH-2]      useAuth() now returns a safe empty object {} as fallback; destructuring
 *                is guarded so no null-crash before provider mounts.
 *  [HIGH-3]      @keyframes spin injected via a <style> tag in AuthModal (no global CSS
 *                dependency). Spinner now animates correctly.
 *  [HIGH-4]      Sign-up flow now checks session.user before calling login(); shows a
 *                "check your email" message when Supabase requires confirmation.
 *  [MEDIUM-1]    inp style object moved outside component body (module-level constant).
 *  [MEDIUM-2]    setGoogleLoading(false) removed from success path (unreachable); error
 *                path correctly resets.
 *  [MEDIUM-3]    initialMode validated against VALID_MODES; falls back to "signup".
 *  [LOW-1]       AuthProvider and GoldenVaultXM are exported as siblings; App root shown.
 *  [LOW-2]       All INSTRUMENT_DEFS .map() calls use `pair` as the stable React key.
 *  [LOW-3]       Mobile confirmed safe: no fixed px widths; all fluid with maxWidth guards.
 */

import {
  useState, useEffect, useRef, useCallback,
  createContext, useContext,
} from "react";
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, ReferenceLine,
} from "recharts";
import {
  Wallet, TrendingUp, Activity, Target, BarChart2, Shield,
  Zap, Globe, ArrowDownToLine, ArrowUpFromLine, FileBarChart,
  CheckCircle2, Menu, X, ChevronRight, Bell, Settings, LogOut,
  Home, Search, Lock, Award, BookOpen, Mail, Phone, MapPin,
  Eye, EyeOff, UserPlus, LogIn, AlertCircle, RefreshCw, Users,
} from "lucide-react";
import { supabase } from "./supabaseClient";

/* ─── Design Tokens ──────────────────────────────────────────────────────── */
const C = {
  bg: "#080808",
  card: "#0f0f0f",
  card2: "#141414",
  card3: "#1a1a1a",
  border: "#222222",
  border2: "#2a2a2a",
  gold: "#d97706",
  gold2: "#f59e0b",
  gold3: "#fbbf24",
  goldDim: "#92400e",
  green: "#22c55e",
  red: "#ef4444",
  purple: "#7c3aed",
  blue: "#3b82f6",
  text: "#ffffff",
  text2: "#a3a3a3",
  text3: "#525252",
  text4: "#303030",
};

/* ─── Auth Context ───────────────────────────────────────────────────────── */
const AuthContext = createContext({}); // FIX [HIGH-2]: default {} not null

/**
 * useAuth — safe hook; always returns an object.
 * Components can destructure without crashing before the Provider mounts.
 */
export const useAuth = () => useContext(AuthContext);

/* ─── AuthProvider ───────────────────────────────────────────────────────── */
// FIX [LOW-1]: AuthProvider defined and exported as a sibling to GoldenVaultXM.
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  // FIX [HIGH-1]: Single onAuthStateChange at provider level — not inside click handlers.
  useEffect(() => {
    // Hydrate from existing session on mount
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setUser({
          name:  session.user.user_metadata?.full_name
              || session.user.email.split("@")[0],
          email: session.user.email,
        });
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_IN" && session?.user) {
          setUser({
            name:  session.user.user_metadata?.full_name
                || session.user.email.split("@")[0],
            email: session.user.email,
          });
        }
        if (event === "SIGNED_OUT") {
          setUser(null);
        }
      }
    );

    return () => subscription.unsubscribe(); // Cleaned up on unmount
  }, []);

  const login  = useCallback((u) => setUser(u), []);
  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

/* ─── App Root ───────────────────────────────────────────────────────────── */
// FIX [LOW-1]: GoldenVaultXM wrapped by AuthProvider as parent — siblings in the tree.
export default function App() {
  return (
    <AuthProvider>
      <GoldenVaultXM />
    </AuthProvider>
  );
}

/* ─── Market Instrument Definitions ─────────────────────────────────────── */
const INSTRUMENT_DEFS = [
  { pair: "BTC/USDT",   name: "Bitcoin",                      cat: "Crypto",      base: 67800,    step: 0.0003 },
  { pair: "ETH/USDT",   name: "Ethereum",                     cat: "Crypto",      base: 3520,     step: 0.0003 },
  { pair: "SOL/USDT",   name: "Solana",                       cat: "Crypto",      base: 178,      step: 0.0004 },
  { pair: "XRP/USDT",   name: "XRP",                          cat: "Crypto",      base: 0.5821,   step: 0.0005 },
  { pair: "BNB/USDT",   name: "BNB",                          cat: "Crypto",      base: 612,      step: 0.0003 },
  { pair: "ADA/USDT",   name: "Cardano",                      cat: "Crypto",      base: 0.4412,   step: 0.0004 },
  { pair: "AVAX/USDT",  name: "Avalanche",                    cat: "Crypto",      base: 38.5,     step: 0.0004 },
  { pair: "DOGE/USDT",  name: "Dogecoin",                     cat: "Crypto",      base: 0.1634,   step: 0.0005 },
  { pair: "MATIC/USDT", name: "Polygon",                      cat: "Crypto",      base: 0.8821,   step: 0.0004 },
  { pair: "LINK/USDT",  name: "Chainlink",                    cat: "Crypto",      base: 18.42,    step: 0.0004 },
  { pair: "UNI/USDT",   name: "Uniswap",                      cat: "Crypto",      base: 10.34,    step: 0.0004 },
  { pair: "LTC/USDT",   name: "Litecoin",                     cat: "Crypto",      base: 86.5,     step: 0.0003 },
  { pair: "DOT/USDT",   name: "Polkadot",                     cat: "Crypto",      base: 7.82,     step: 0.0004 },
  { pair: "SHIB/USDT",  name: "Shiba Inu",                    cat: "Crypto",      base: 0.0000248,step: 0.0005 },
  { pair: "ATOM/USDT",  name: "Cosmos",                       cat: "Crypto",      base: 9.41,     step: 0.0004 },
  { pair: "EUR/USD",    name: "Euro / US Dollar",              cat: "Forex",       base: 1.08432,  step: 0.00008 },
  { pair: "GBP/USD",    name: "British Pound / USD",           cat: "Forex",       base: 1.27180,  step: 0.00008 },
  { pair: "USD/JPY",    name: "US Dollar / Japanese Yen",      cat: "Forex",       base: 156.84,   step: 0.00006 },
  { pair: "AUD/USD",    name: "Australian Dollar / USD",       cat: "Forex",       base: 0.65820,  step: 0.00007 },
  { pair: "USD/CHF",    name: "US Dollar / Swiss Franc",       cat: "Forex",       base: 0.91240,  step: 0.00007 },
  { pair: "USD/CAD",    name: "US Dollar / Canadian Dollar",   cat: "Forex",       base: 1.36420,  step: 0.00007 },
  { pair: "NZD/USD",    name: "New Zealand Dollar / USD",      cat: "Forex",       base: 0.60150,  step: 0.00008 },
  { pair: "EUR/GBP",    name: "Euro / British Pound",          cat: "Forex",       base: 0.85210,  step: 0.00006 },
  { pair: "EUR/JPY",    name: "Euro / Japanese Yen",           cat: "Forex",       base: 169.82,   step: 0.00006 },
  { pair: "GBP/JPY",    name: "British Pound / Yen",           cat: "Forex",       base: 199.41,   step: 0.00006 },
  { pair: "EUR/CHF",    name: "Euro / Swiss Franc",            cat: "Forex",       base: 0.98740,  step: 0.00007 },
  { pair: "AUD/JPY",    name: "Australian Dollar / Yen",       cat: "Forex",       base: 103.21,   step: 0.00006 },
  { pair: "USD/MXN",    name: "US Dollar / Mexican Peso",      cat: "Forex",       base: 17.2410,  step: 0.00007 },
  { pair: "USD/SGD",    name: "US Dollar / Singapore Dollar",  cat: "Forex",       base: 1.3562,   step: 0.00007 },
  { pair: "USD/ZAR",    name: "US Dollar / South African Rand",cat: "Forex",       base: 18.621,   step: 0.00007 },
  { pair: "AAPL",       name: "Apple Inc.",                    cat: "Stocks",      base: 189.30,   step: 0.0002 },
  { pair: "NVDA",       name: "NVIDIA Corporation",            cat: "Stocks",      base: 875.40,   step: 0.0002 },
  { pair: "TSLA",       name: "Tesla Inc.",                    cat: "Stocks",      base: 248.60,   step: 0.0003 },
  { pair: "AMZN",       name: "Amazon.com Inc.",               cat: "Stocks",      base: 186.80,   step: 0.0002 },
  { pair: "MSFT",       name: "Microsoft Corporation",         cat: "Stocks",      base: 420.50,   step: 0.0002 },
  { pair: "GOOGL",      name: "Alphabet Inc.",                 cat: "Stocks",      base: 175.20,   step: 0.0002 },
  { pair: "META",       name: "Meta Platforms Inc.",           cat: "Stocks",      base: 508.40,   step: 0.0002 },
  { pair: "JPM",        name: "JPMorgan Chase",                cat: "Stocks",      base: 199.60,   step: 0.0002 },
  { pair: "V",          name: "Visa Inc.",                     cat: "Stocks",      base: 278.30,   step: 0.0002 },
  { pair: "WMT",        name: "Walmart Inc.",                  cat: "Stocks",      base: 67.82,    step: 0.0002 },
  { pair: "NFLX",       name: "Netflix Inc.",                  cat: "Stocks",      base: 627.40,   step: 0.0003 },
  { pair: "AMD",        name: "Advanced Micro Devices",        cat: "Stocks",      base: 162.80,   step: 0.0003 },
  { pair: "COIN",       name: "Coinbase Global",               cat: "Stocks",      base: 214.30,   step: 0.0003 },
  { pair: "PLTR",       name: "Palantir Technologies",         cat: "Stocks",      base: 22.40,    step: 0.0003 },
  { pair: "SPX",        name: "S&P 500 Index",                 cat: "Indices",     base: 5218.0,   step: 0.0001 },
  { pair: "NDX",        name: "NASDAQ 100",                    cat: "Indices",     base: 18320.0,  step: 0.0001 },
  { pair: "DJIA",       name: "Dow Jones Industrial",          cat: "Indices",     base: 39200.0,  step: 0.0001 },
  { pair: "RUT",        name: "Russell 2000",                  cat: "Indices",     base: 2082.0,   step: 0.0001 },
  { pair: "VIX",        name: "CBOE Volatility Index",         cat: "Indices",     base: 14.82,    step: 0.0002 },
  { pair: "FTSE",       name: "FTSE 100",                      cat: "Indices",     base: 8180.0,   step: 0.0001 },
  { pair: "DAX",        name: "DAX 40",                        cat: "Indices",     base: 18640.0,  step: 0.0001 },
  { pair: "N225",       name: "Nikkei 225",                    cat: "Indices",     base: 38820.0,  step: 0.0001 },
  { pair: "XAU/USD",    name: "Gold Spot",                     cat: "Commodities", base: 2342.0,   step: 0.0001 },
  { pair: "XAG/USD",    name: "Silver Spot",                   cat: "Commodities", base: 29.82,    step: 0.0002 },
  { pair: "XTI/USD",    name: "Crude Oil WTI",                 cat: "Commodities", base: 77.40,    step: 0.0002 },
  { pair: "BRENT",      name: "Crude Oil Brent",               cat: "Commodities", base: 81.60,    step: 0.0002 },
  { pair: "NATGAS",     name: "Natural Gas",                   cat: "Commodities", base: 2.418,    step: 0.0003 },
  { pair: "COPPER",     name: "Copper",                        cat: "Commodities", base: 4.612,    step: 0.0002 },
  { pair: "ES",         name: "S&P 500 E-mini Futures",        cat: "Futures",     base: 5220.0,   step: 0.0001 },
  { pair: "NQ",         name: "NASDAQ 100 Futures",            cat: "Futures",     base: 18340.0,  step: 0.0001 },
  { pair: "YM",         name: "Dow Jones Futures",             cat: "Futures",     base: 39180.0,  step: 0.0001 },
  { pair: "GC",         name: "Gold Futures",                  cat: "Futures",     base: 2350.0,   step: 0.0001 },
  { pair: "CL",         name: "Crude Oil Futures",             cat: "Futures",     base: 77.60,    step: 0.0002 },
  { pair: "ZN",         name: "10-Year T-Note Futures",        cat: "Futures",     base: 109.12,   step: 0.0001 },
  { pair: "US02Y",      name: "US 2-Year Treasury",            cat: "Bonds",       base: 4.921,    step: 0.0001 },
  { pair: "US05Y",      name: "US 5-Year Treasury",            cat: "Bonds",       base: 4.412,    step: 0.0001 },
  { pair: "US10Y",      name: "US 10-Year Treasury",           cat: "Bonds",       base: 4.281,    step: 0.0001 },
  { pair: "US30Y",      name: "US 30-Year Treasury",           cat: "Bonds",       base: 4.480,    step: 0.0001 },
  { pair: "TLT",        name: "20+ Year T-Bond ETF",           cat: "Bonds",       base: 91.42,    step: 0.0001 },
];

const CATS = ["All", "Crypto", "Forex", "Stocks", "Indices", "Commodities", "Futures", "Bonds"];
const VALID_MODES = ["signup", "login"]; // FIX [MEDIUM-3]

/* ─── Price simulator hook ───────────────────────────────────────────────── */
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
      setPrices(prev => {
        const next      = { ...prev };
        const flashNext = {};
        INSTRUMENT_DEFS
          .filter(() => Math.random() < 0.30)
          .map(d => d.pair)
          .forEach(pair => {
            const def      = INSTRUMENT_DEFS.find(d => d.pair === pair);
            const cur      = prev[pair];
            const sign     = Math.random() > 0.5 ? 1 : -1;
            const mag      = def.step * (0.5 + Math.random()) * def.base;
            const newPrice = Math.max(cur.price + sign * mag, def.base * 0.7);
            const newPct   = ((newPrice - cur.prevDay) / cur.prevDay) * 100;
            next[pair]     = { price: newPrice, pct24h: newPct, prevDay: cur.prevDay, up: sign === 1 };
            flashNext[pair]= sign === 1 ? "up" : "dn";
          });
        setFlash(flashNext);
        return next;
      });
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

const fmtPct  = p    => p == null ? "—" : `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`;
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
    gold:    { background: disabled ? C.goldDim : hov ? C.gold2 : C.gold,   color: "#000",  transform: hov && !disabled ? "scale(1.01)" : "scale(1)" },
    outline: { background: "transparent", color: hov ? C.gold2 : C.gold,    border: `1.5px solid ${hov ? C.gold2 : C.gold}`, transform: hov ? "scale(1.01)" : "scale(1)" },
    ghost:   { background: hov ? C.card3 : C.card2, color: C.text3,         border: `1px solid ${C.border}` },
    danger:  { background: hov ? "#b91c1c" : C.card, color: C.red,          border: `1px solid ${C.border}` },
    purple:  { background: hov ? "#6d28d9" : C.purple, color: "#fff",       transform: hov ? "scale(1.01)" : "scale(1)" },
    white:   { background: hov ? "#e5e7eb" : C.text,   color: "#000",       transform: hov ? "scale(1.01)" : "scale(1)" },
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

/* ─── Google "G" SVG logo ─────────────────────────────────────────────────── */
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    <path fill="none" d="M0 0h48v48H0z"/>
  </svg>
);

/* ─── Input style — module-level constant (FIX [MEDIUM-1]) ──────────────── */
const INP_STYLE = {
  width: "100%",
  background: C.card2,
  border: `1px solid ${C.border2}`,
  borderRadius: 12,
  padding: "13px 14px",
  color: C.text,
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

/* ─── AuthModal ──────────────────────────────────────────────────────────── */
function AuthModal({ onClose, initialMode = "signup" }) {
  const { login } = useAuth();

  // FIX [MEDIUM-3]: Validate initialMode against allowed values.
  const [mode,          setMode]         = useState(VALID_MODES.includes(initialMode) ? initialMode : "signup");
  const [showPw,        setShowPw]       = useState(false);
  const [loading,       setLoading]      = useState(false);
  const [googleLoading, setGoogleLoading]= useState(false);
  const [error,         setError]        = useState("");
  const [agreed,        setAgreed]       = useState(false);
  const [emailSent,     setEmailSent]    = useState(false); // FIX [HIGH-4]
  const [form,          setForm]         = useState({ name: "", email: "", password: "" });

  // FIX [HIGH-3]: @keyframes defined inside the component via <style> tag.
  // This removes the dependency on a global CSS file for the spinner.
  const spinStyle = `@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`;

  /* ── Google OAuth ── FIX [CRITICAL-2, HIGH-1] ─────────────────────────── */
  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        // FIX [CRITICAL-2]: Redirect to /trade after successful Google sign-in.
        // The AuthProvider's onAuthStateChange will fire on return and set the user.
        redirectTo: `${window.location.origin}/trade`,
      },
    });
    // Only reached if the redirect itself fails (e.g. popup blocked / network error).
    if (oauthError) {
      setError(oauthError.message);
      setGoogleLoading(false); // FIX [MEDIUM-2]: reset only on the error path
    }
    // On success the browser navigates away — no further cleanup needed here.
  };

  /* ── Email / password ── FIX [HIGH-4] ─────────────────────────────────── */
  const handle = async () => {
    setError("");
    if (mode === "signup" && !agreed) {
      setError("Please confirm you are 18 or older and agree to the Terms.");
      return;
    }
    setLoading(true);

    if (mode === "signup") {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email:    form.email,
        password: form.password,
        options:  { data: { full_name: form.name } },
      });
      if (signUpError) { setError(signUpError.message); setLoading(false); return; }

      // FIX [HIGH-4]: Supabase may require email confirmation.
      // data.session is null when confirmation is required.
      if (data.session) {
        login({ name: form.name || form.email.split("@")[0], email: form.email });
        setLoading(false);
        onClose();
      } else {
        // Show "check your email" UI instead of silently logging in.
        setEmailSent(true);
        setLoading(false);
      }
    } else {
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email:    form.email,
        password: form.password,
      });
      if (signInError) { setError(signInError.message); setLoading(false); return; }
      login({ name: form.name || form.email.split("@")[0], email: data.user.email });
      setLoading(false);
      onClose();
    }
  };

  /* ── Email confirmation screen (FIX [HIGH-4]) ─────────────────────────── */
  if (emailSent) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "#000000cc", backdropFilter: "blur(14px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
        <style>{spinStyle}</style>
        <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "36px 28px", width: "100%", maxWidth: 420, textAlign: "center" }}>
          <Mail size={40} color={C.gold} style={{ marginBottom: 16 }} />
          <div style={{ fontWeight: 900, fontSize: 22, color: C.text, marginBottom: 10 }}>Check your email</div>
          <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.6, marginBottom: 24 }}>
            We sent a confirmation link to <strong style={{ color: C.gold }}>{form.email}</strong>.
            Click it to activate your account, then sign in.
          </div>
          <Btn variant="outline" onClick={() => { setEmailSent(false); setMode("login"); }}>
            Go to Sign In
          </Btn>
        </div>
      </div>
    );
  }

  /* ── Main modal ──────────────────────────────────────────────────────────── */
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", backdropFilter: "blur(14px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}>
      {/* FIX [HIGH-3]: Inject @keyframes spin so the RefreshCw spinner animates. */}
      <style>{spinStyle}</style>

      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "28px 24px 24px", width: "100%", maxWidth: 420, position: "relative", boxShadow: "0 32px 96px #000c" }}>

        {/* Close */}
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: C.text3, padding: 4 }}>
          <X size={18} />
        </button>

        {/* Logo row */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: `linear-gradient(135deg,${C.gold},${C.goldDim})`, display: "grid", placeItems: "center" }}>
            <Zap size={20} color="#000" fill="#000" />
          </div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 13, color: C.gold, letterSpacing: "0.12em" }}>GOLDEN VAULT XM</div>
            <div style={{ fontSize: 9, color: C.text3, letterSpacing: "0.2em", marginTop: 1 }}>ELITE TRADING</div>
          </div>
        </div>

        {/* Heading */}
        <div style={{ fontWeight: 900, fontSize: 24, color: C.text, marginBottom: 4 }}>
          {mode === "signup" ? "Create Account" : "Welcome Back"}
        </div>
        <div style={{ fontSize: 13, color: C.text3, marginBottom: 22, lineHeight: 1.5 }}>
          {mode === "signup"
            ? "Join thousands of institutional traders worldwide."
            : "Sign in to access your trading dashboard."}
        </div>

        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={googleLoading}
          style={{
            width: "100%", display: "flex", alignItems: "center",
            justifyContent: "center", gap: 10, background: "#fff",
            border: "none", borderRadius: 12, padding: "13px 16px",
            fontWeight: 700, fontSize: 14, color: "#1a1a1a",
            cursor: googleLoading ? "not-allowed" : "pointer",
            opacity: googleLoading ? 0.7 : 1,
            transition: "opacity .2s, box-shadow .2s",
            boxShadow: "0 2px 8px #0004",
          }}
        >
          {googleLoading
            ? <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} />
            : <GoogleIcon />}
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
          {mode === "signup" && (
            <input
              placeholder="Full Name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              style={INP_STYLE}
            />
          )}
          <input
            placeholder="Email address"
            type="email"
            value={form.email}
            onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            style={INP_STYLE}
          />
          <div style={{ position: "relative" }}>
            <input
              placeholder="Password"
              type={showPw ? "text" : "password"}
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handle()}
              style={{ ...INP_STYLE, paddingRight: 46 }}
            />
            <button
              onClick={() => setShowPw(p => !p)}
              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.text3 }}
            >
              {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {/* Age + Terms checkbox (signup only) — FIX [CRITICAL-1]: completed truncated JSX */}
        {mode === "signup" && (
          <div
            onClick={() => setAgreed(a => !a)}
            style={{
              display: "flex", alignItems: "flex-start", gap: 11, marginTop: 14,
              padding: "13px 14px",
              background: agreed ? `${C.gold}12` : C.card2,
              border: `1px solid ${agreed ? C.gold + "44" : C.border2}`,
              borderRadius: 10, cursor: "pointer",
              transition: "background .2s, border-color .2s",
            }}
          >
            {/* Custom checkbox */}
            <div style={{
              width: 18, height: 18, borderRadius: 5, flexShrink: 0, marginTop: 1,
              background: agreed ? C.gold : "transparent",
              border: `2px solid ${agreed ? C.gold : C.text3}`,
              display: "grid", placeItems: "center",
              transition: "background .2s, border-color .2s",
            }}>
              {agreed && (
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <path d="M1.5 5L4 7.5L8.5 2.5" stroke="#000" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                </svg>
              )}
            </div>
            <span style={{ fontSize: 12, color: C.text2, lineHeight: 1.55, userSelect: "none" }}>
              I confirm I am <strong style={{ color: C.text }}>18 years or older</strong> and I agree to the{" "}
              <span
                style={{ color: C.gold, textDecoration: "underline", cursor: "pointer" }}
                onClick={e => { e.stopPropagation(); window.open("/terms", "_blank"); }}
              >
                Terms of Service
              </span>{" "}and{" "}
              <span
                style={{ color: C.gold, textDecoration: "underline", cursor: "pointer" }}
                onClick={e => { e.stopPropagation(); window.open("/privacy", "_blank"); }}
              >
                Privacy Policy
              </span>.
            </span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: "10px 12px", background: `${C.red}18`, border: `1px solid ${C.red}44`, borderRadius: 9 }}>
            <AlertCircle size={14} color={C.red} style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 12, color: C.red, lineHeight: 1.45 }}>{error}</span>
          </div>
        )}

        {/* Submit */}
        <Btn
          onClick={handle}
          loading={loading}
          style={{ width: "100%", marginTop: 16 }}
        >
          {mode === "signup"
            ? <><UserPlus size={15} /> Create Account</>
            : <><LogIn size={15} /> Sign In</>}
        </Btn>

        {/* Mode toggle */}
        <div style={{ textAlign: "center", marginTop: 16, fontSize: 13, color: C.text3 }}>
          {mode === "signup" ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => { setMode(mode === "signup" ? "login" : "signup"); setError(""); setEmailSent(false); }}
            style={{ background: "none", border: "none", cursor: "pointer", color: C.gold, fontWeight: 700, fontSize: 13, padding: 0 }}
          >
            {mode === "signup" ? "Sign In" : "Create Account"}
          </button>
        </div>

        {/* Security note */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 18 }}>
          <Lock size={11} color={C.text4} />
          <span style={{ fontSize: 10, color: C.text4, letterSpacing: "0.04em" }}>
            256-BIT SSL ENCRYPTED · REGULATED PLATFORM
          </span>
        </div>
      </div>
    </div>
  );
}

/* ─── GoldenVaultXM (main app shell) ────────────────────────────────────── */
// NOTE: This is the primary trading app component. It lives *inside* AuthProvider
// (see the App root export above). All useAuth() calls here are safe.
function GoldenVaultXM() {
  const { user, logout } = useAuth(); // FIX [HIGH-2]: safe — AuthProvider guarantees {} fallback
  const { prices, flash } = useLivePrices();
  const [authModal, setAuthModal] = useState(null); // null | "signup" | "login"
  const [activeCat, setActiveCat] = useState("All");

  const filtered = activeCat === "All"
    ? INSTRUMENT_DEFS
    : INSTRUMENT_DEFS.filter(d => d.cat === activeCat);

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Nav ── */}
      <nav style={{ position: "sticky", top: 0, zIndex: 100, background: `${C.bg}ee`, backdropFilter: "blur(20px)", borderBottom: `1px solid ${C.border}`, padding: "0 16px", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg,${C.gold},${C.goldDim})`, display: "grid", placeItems: "center" }}>
            <Zap size={16} color="#000" fill="#000" />
          </div>
          <span style={{ fontWeight: 900, fontSize: 14, color: C.gold, letterSpacing: "0.1em" }}>GOLDEN VAULT XM</span>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          {user ? (
            <>
              <span style={{ fontSize: 13, color: C.text2, alignSelf: "center", marginRight: 4 }}>
                {user.name}
              </span>
              <Btn variant="ghost" onClick={logout} style={{ padding: "8px 14px", fontSize: 12 }}>
                <LogOut size={13} /> Sign Out
              </Btn>
            </>
          ) : (
            <>
              <Btn variant="ghost" onClick={() => setAuthModal("login")} style={{ padding: "8px 14px", fontSize: 12 }}>
                Sign In
              </Btn>
              <Btn variant="gold" onClick={() => setAuthModal("signup")} style={{ padding: "8px 14px", fontSize: 12 }}>
                Get Started
              </Btn>
            </>
          )}
        </div>
      </nav>

      {/* ── Category tabs ── */}
      <div style={{ display: "flex", gap: 6, padding: "12px 16px", overflowX: "auto", borderBottom: `1px solid ${C.border}` }}>
        {CATS.map(cat => (
          <button
            key={cat}  // FIX [LOW-2]: stable key
            onClick={() => setActiveCat(cat)}
            style={{
              background:   activeCat === cat ? C.gold : C.card2,
              color:        activeCat === cat ? "#000" : C.text2,
              border:       `1px solid ${activeCat === cat ? C.gold : C.border}`,
              borderRadius: 8, padding: "6px 14px", fontSize: 12,
              fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap",
              flexShrink: 0, transition: "all .15s",
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* ── Instrument table ── */}
      <div style={{ padding: "0 16px 80px" }}>
        {filtered.map(def => {
          const p = prices[def.pair];
          if (!p) return null;
          const isUp = p.pct24h >= 0;
          return (
            <div
              key={def.pair}  // FIX [LOW-2]: stable key on pair string
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "14px 0", borderBottom: `1px solid ${C.border}`,
                transition: "background .3s",
                background: flash[def.pair] === "up"
                  ? `${C.green}10`
                  : flash[def.pair] === "dn"
                  ? `${C.red}10`
                  : "transparent",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, flex: 1, minWidth: 0 }}>
                <IconBox icon={BarChart2} color={catColor(def.cat)} size={14} boxSize={32} />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: C.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {def.pair}
                  </div>
                  <div style={{ fontSize: 11, color: C.text3, marginTop: 1 }}>{def.name}</div>
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: C.text, fontVariantNumeric: "tabular-nums" }}>
                  {fmtPrice(p.price, def.cat)}
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: isUp ? C.green : C.red, marginTop: 2 }}>
                  {fmtPct(p.pct24h)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Auth Modal ── */}
      {authModal && (
        <AuthModal
          initialMode={authModal}
          onClose={() => setAuthModal(null)}
        />
      )}
    </div>
  );
}

