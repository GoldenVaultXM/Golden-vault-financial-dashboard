import React, { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine, } from "recharts";
import { Wallet, TrendingUp, Activity, Target, BarChart2, Shield, Zap, Globe, ArrowDownToLine, ArrowUpFromLine, FileBarChart, CheckCircle2, Menu, X, ChevronRight, Bell, Settings, LogOut, Home, Search, Lock, Award, BookOpen, Mail, Phone, MapPin, Eye, EyeOff, UserPlus, LogIn, AlertCircle, RefreshCw, Users, } from "lucide-react";

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
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

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
      setPrices(prev => {
        const next = { ...prev };
        const flashNext = {};
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

/* ─── Auth Modal ─────────────────────────────────────────────────────────── */
// FIX: Removed orphaned code (login/setLoading/onClose calls) that was outside
// the handle() function body, causing a crash on every render.
// FIX: Removed supabase.auth calls — replaced with simple in-memory auth.
function AuthModal({ onClose, initialMode = "signup" }) {
  const { login } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const handle = async () => {
    setError("");
    if (!form.email || !form.password) {
      setError("Please fill in all required fields.");
      return;
    }
    if (form.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    // Simulate async auth
    await new Promise(r => setTimeout(r, 900));
    login({ name: form.name || form.email.split("@")[0], email: form.email });
    setLoading(false);
    onClose();
  };

  const inp = { width: "100%", background: C.card2, border: `1px solid ${C.border2}`, borderRadius: 10, padding: "12px 14px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box", };
  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", backdropFilter: "blur(12px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 18, padding: 28, width: "100%", maxWidth: 420, position: "relative", boxShadow: "0 24px 80px #000a", }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: C.text3, padding: 4 }}><X size={18} /></button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: `linear-gradient(135deg,${C.gold},${C.goldDim})`, display: "grid", placeItems: "center" }}><Zap size={18} color="#000" fill="#000" /></div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 13, color: C.gold, letterSpacing: "0.1em" }}>GOLDEN VAULT XM</div>
            <div style={{ fontSize: 9, color: C.text3, letterSpacing: "0.18em" }}>ELITE TRADING</div>
          </div>
        </div>
        <div style={{ fontWeight: 900, fontSize: 22, color: C.text, marginBottom: 4 }}> {mode === "signup" ? "Create Account" : "Welcome Back"} </div>
        <div style={{ fontSize: 13, color: C.text3, marginBottom: 22 }}> {mode === "signup" ? "Join thousands of institutional traders worldwide." : "Sign in to access your trading dashboard."} </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "signup" && (<input placeholder="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp} />)}
          <input placeholder="Email address" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inp} />
          <div style={{ position: "relative" }}>
            <input placeholder="Password" type={showPw ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} onKeyDown={e => e.key === "Enter" && handle()} style={{ ...inp, paddingRight: 44 }} />
            <button onClick={() => setShowPw(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.text3 }}> {showPw ? <EyeOff size={15} /> : <Eye size={15} />} </button>
          </div>
        </div>
        {error && (<div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: "10px 12px", background: `${C.red}14`, border: `1px solid ${C.red}33`, borderRadius: 8 }}><AlertCircle size={13} color={C.red} /><span style={{ fontSize: 12, color: C.red }}>{error}</span></div>)}
        <Btn variant="gold" onClick={handle} loading={loading} style={{ width: "100%", marginTop: 18 }}> {mode === "signup" ? <><UserPlus size={15} /> Create Account</> : <><LogIn size={15} /> Sign In</>} </Btn>
        {mode === "signup" && (<div style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 14 }}> {[["🔒", "Encrypted"], ["✅", "Regulated"], ["🌐", "24/7 Support"]].map(([em, lbl]) => (<div key={lbl} style={{ textAlign: "center" }}><div style={{ fontSize: 14 }}>{em}</div><div style={{ fontSize: 9, color: C.text3, marginTop: 2 }}>{lbl}</div></div>))} </div>)}
        <div style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: C.text3 }}> {mode === "signup" ? "Already have an account? " : "Don't have an account? "} <button onClick={() => setMode(m => m === "signup" ? "login" : "signup")} style={{ background: "none", border: "none", cursor: "pointer", color: C.gold, fontWeight: 800, fontSize: 12 }}> {mode === "signup" ? "Sign In" : "Create Account"} </button> </div>
      </div>
    </div>
  );
}

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [modal, setModal] = useState(null);
  const isAuthenticated = !!user;
  const login = (u) => { setUser(u); setModal(null); };
  const logout = () => setUser(null);
  const requireAuth = (mode = "signup") => { if (!isAuthenticated) { setModal(mode); return false; } return true; };
  return (<AuthContext.Provider value={{ user, isAuthenticated, login, logout, requireAuth }}> {children} {modal && <AuthModal onClose={() => setModal(null)} initialMode={modal} />} </AuthContext.Provider>);
}

function Nav({ page, setPage, open, setOpen }) {
  const { isAuthenticated, user, logout, requireAuth } = useAuth();
  const NAV = [{ id: "home", label: "Home", icon: Home }, { id: "markets", label: "Markets", icon: BarChart2 }, { id: "trade", label: "Trade", icon: TrendingUp }, { id: "settings", label: "Settings", icon: Settings },];
  return (
    <header style={{ position: "sticky", top: 0, zIndex: 100, background: `${C.bg}f0`, backdropFilter: "blur(16px)", borderBottom: `1px solid ${C.border}`, padding: "0 16px", height: 58, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 9, background: `linear-gradient(135deg,${C.gold},${C.goldDim})`, display: "grid", placeItems: "center", flexShrink: 0 }}><Zap size={17} color="#000" fill="#000" /></div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 12, color: C.gold, letterSpacing: "0.1em" }}>GOLDEN VAULT XM</div>
          <div style={{ fontSize: 9, color: C.text3, letterSpacing: "0.2em" }}>ELITE TRADING</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
        {isAuthenticated && (<div style={{ fontSize: 11, color: C.text3, marginRight: 6, display: "flex", alignItems: "center", gap: 5 }}><div style={{ width: 7, height: 7, borderRadius: "50%", background: C.green }} /> {user?.name}</div>)}
        <button style={{ background: "none", border: "none", cursor: "pointer", color: C.text3, padding: 8 }}><Bell size={17} /></button>
        <button onClick={() => setOpen(!open)} style={{ background: "none", border: "none", cursor: "pointer", color: C.text2, padding: 8 }}>{open ? <X size={22} /> : <Menu size={22} />}</button>
      </div>
      {open && (
        <div style={{ position: "fixed", top: 58, left: 0, right: 0, bottom: 0, background: `${C.bg}f8`, backdropFilter: "blur(20px)", zIndex: 200, padding: "24px 20px 32px", display: "flex", flexDirection: "column", gap: 2 }}>
          {NAV.map(n => (
            <button key={n.id} onClick={() => { if (n.id === "trade" && !requireAuth()) return; setPage(n.id); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 14px", background: page === n.id ? `${C.gold}12` : "none", border: "none", borderRadius: 12, cursor: "pointer", borderLeft: page === n.id ? `3px solid ${C.gold}` : "3px solid transparent", }}>
              <n.icon size={18} color={page === n.id ? C.gold : C.text3} />
              <span style={{ fontSize: 17, fontWeight: 800, color: page === n.id ? C.text : C.text3 }}>{n.label}</span>
              {n.id === "trade" && !isAuthenticated && (<Lock size={12} color={C.text3} style={{ marginLeft: "auto" }} />)}
            </button>
          ))}
          <div style={{ marginTop: "auto" }}><GoldLine /> {isAuthenticated ? <button onClick={() => { logout(); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 14px", background: "none", border: "none", cursor: "pointer", width: "100%", color: C.red }}><LogOut size={18} color={C.red} /><span style={{ fontSize: 14, fontWeight: 700, color: C.red }}>Sign Out</span></button> : <button onClick={() => { requireAuth("signup"); setOpen(false); }} style={{ display: "flex", alignItems: "center", gap: 14, padding: "15px 14px", background: "none", border: "none", cursor: "pointer", width: "100%" }}><UserPlus size={18} color={C.gold} /><span style={{ fontSize: 14, fontWeight: 700, color: C.gold }}>Sign Up / Login</span></button>}</div>
        </div>
      )}
    </header>
  );
}

function BottomNav({ page, setPage }) {
  const { isAuthenticated, requireAuth } = useAuth();
  const TABS = [{ id: "home", icon: Home, label: "Home" }, { id: "markets", icon: BarChart2, label: "Markets" }, { id: "trade", icon: Zap, label: "Trade" }, { id: "settings", icon: Settings, label: "More" },];
  return (
    <nav style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 600, background: `${C.bg}f2`, backdropFilter: "blur(16px)", borderTop: `1px solid ${C.border}`, display: "flex", padding: "8px 0 20px", zIndex: 50 }}>
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

/* ─── PAGES ──────────────────────────────────────────────────────────────── */
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

/* ─── Candlestick Simulation ─────────────────────────────────────────────── */
const CHART_SYMBOLS = [
  { label: "GOLD",    base: 2342.0,   step: 0.0001, decimals: 2 },
  { label: "BTC",     base: 67800,    step: 0.0003, decimals: 0 },
  { label: "ETH",     base: 3520,     step: 0.0003, decimals: 1 },
  { label: "EUR/USD", base: 1.08432,  step: 0.00008,decimals: 5 },
  { label: "S&P 500", base: 5218.0,   step: 0.0001, decimals: 1 },
  { label: "OIL",     base: 77.40,    step: 0.0002, decimals: 2 },
  { label: "NVDA",    base: 875.40,   step: 0.0002, decimals: 2 },
  { label: "AAPL",    base: 189.30,   step: 0.0002, decimals: 2 },
];
const INTERVALS_SIM = ["1m","5m","15m","1h","4h","1D"];

function generateCandles(base, step, count = 80) {
  const candles = [];
  let price = base;
  for (let i = 0; i < count; i++) {
    const open = price;
    const move = step * base * (1 + Math.random() * 2);
    const isBull = Math.random() > 0.46;
    const close = open + (isBull ? 1 : -1) * move * (0.3 + Math.random() * 0.7);
    const high = Math.max(open, close) + move * Math.random() * 0.6;
    const low  = Math.min(open, close) - move * Math.random() * 0.6;
    const vol  = 0.3 + Math.random();
    candles.push({ open, high, low, close, vol });
    price = close;
  }
  return candles;
}

function CandlestickChart() {
  const canvasRef = useRef(null);
  const [symIdx, setSymIdx] = useState(0);
  const [interval, setInterval2] = useState("1m");
  const candlesRef = useRef([]);
  const animRef = useRef(null);
  const tooltipRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [priceDir, setPriceDir] = useState(null); // "up"|"dn"

  const sym = CHART_SYMBOLS[symIdx];

  // Init / reset candles when symbol or interval changes
  useEffect(() => {
    candlesRef.current = generateCandles(sym.base, sym.step, 80);
    setCurrentPrice(candlesRef.current[candlesRef.current.length - 1].close);
    setPriceDir(null);
    draw();
  }, [symIdx, interval]);

  // Live tick: evolve last candle and occasionally push new one
  useEffect(() => {
    const tickMs = { "1m": 800, "5m": 1200, "15m": 1600, "1h": 2000, "4h": 2400, "1D": 3000 }[interval] || 1000;
    let elapsed = 0;
    const candleDuration = { "1m":12,"5m":20,"15m":30,"1h":45,"4h":60,"1D":80 }[interval] || 20; // ticks per candle

    const tick = setInterval(() => {
      const candles = candlesRef.current;
      const last = candles[candles.length - 1];
      const def = sym;
      const move = def.step * def.base * (0.1 + Math.random() * 0.4);
      const sign = Math.random() > 0.48 ? 1 : -1;
      const newClose = Math.max(last.close + sign * move, def.base * 0.5);
      const newHigh = Math.max(last.high, newClose);
      const newLow  = Math.min(last.low,  newClose);

      setPriceDir(sign === 1 ? "up" : "dn");
      setTimeout(() => setPriceDir(null), 400);

      elapsed++;
      if (elapsed >= candleDuration) {
        elapsed = 0;
        // push new candle
        candles.push({ open: newClose, high: newClose, low: newClose, close: newClose, vol: 0.3 + Math.random() });
        if (candles.length > 120) candles.shift();
      } else {
        candles[candles.length - 1] = { ...last, close: newClose, high: newHigh, low: newLow, vol: last.vol + 0.01 };
      }

      setCurrentPrice(newClose);
      draw();
    }, tickMs);

    return () => clearInterval(tick);
  }, [symIdx, interval]);

  function draw() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    const ctx = canvas.getContext("2d");
    ctx.scale(dpr, dpr);

    const candles = candlesRef.current;
    const PAD_L = 8, PAD_R = 52, PAD_T = 12, PAD_B = 36;
    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;
    const volH = 36;
    const priceH = chartH - volH - 6;

    // Background
    ctx.fillStyle = "#080808";
    ctx.fillRect(0, 0, W, H);

    // Grid
    const gridLines = 5;
    ctx.strokeStyle = "#1a1a1a";
    ctx.lineWidth = 1;
    for (let i = 0; i <= gridLines; i++) {
      const y = PAD_T + (priceH / gridLines) * i;
      ctx.beginPath(); ctx.moveTo(PAD_L, y); ctx.lineTo(W - PAD_R, y); ctx.stroke();
    }

    // Price range
    const visible = candles.slice(-60);
    const allH = visible.map(c => c.high), allL = visible.map(c => c.low);
    let maxP = Math.max(...allH), minP = Math.min(...allL);
    const pad = (maxP - minP) * 0.08;
    maxP += pad; minP -= pad;
    const pRange = maxP - minP || 1;

    const toY = p => PAD_T + priceH * (1 - (p - minP) / pRange);

    // Y-axis price labels
    ctx.fillStyle = "#525252";
    ctx.font = "9px 'DM Sans',system-ui,sans-serif";
    ctx.textAlign = "left";
    for (let i = 0; i <= gridLines; i++) {
      const p = minP + pRange * (i / gridLines);
      const y = toY(p);
      ctx.fillText(p.toFixed(sym.decimals > 3 ? 4 : sym.decimals > 1 ? 2 : 0), W - PAD_R + 4, y + 3);
    }

    // Volume bars
    const maxVol = Math.max(...visible.map(c => c.vol));
    const cw = chartW / visible.length;
    visible.forEach((c, i) => {
      const isBull = c.close >= c.open;
      const x = PAD_L + i * cw;
      const vH = (c.vol / maxVol) * volH;
      ctx.fillStyle = isBull ? "#22c55e28" : "#ef444428";
      ctx.fillRect(x + cw * 0.1, PAD_T + priceH + 6 + (volH - vH), cw * 0.8, vH);
    });

    // Candles
    visible.forEach((c, i) => {
      const isBull = c.close >= c.open;
      const col = isBull ? "#22c55e" : "#ef4444";
      const x = PAD_L + i * cw + cw / 2;
      const bodyTop    = toY(Math.max(c.open, c.close));
      const bodyBot    = toY(Math.min(c.open, c.close));
      const bodyH      = Math.max(bodyBot - bodyTop, 1);
      const candleW    = Math.max(cw * 0.55, 2);

      // Wick
      ctx.strokeStyle = col;
      ctx.lineWidth = Math.max(cw * 0.12, 1);
      ctx.beginPath();
      ctx.moveTo(x, toY(c.high));
      ctx.lineTo(x, toY(c.low));
      ctx.stroke();

      // Body
      ctx.fillStyle = isBull ? "#22c55e" : "#ef4444";
      // Last candle gets gold glow
      if (i === visible.length - 1) {
        ctx.shadowColor = "#d97706";
        ctx.shadowBlur = 6;
      }
      ctx.fillRect(x - candleW / 2, bodyTop, candleW, bodyH);
      ctx.shadowBlur = 0;
    });

    // Current price line
    const last = candles[candles.length - 1];
    const lastY = toY(last.close);
    const isBullLast = last.close >= last.open;
    ctx.strokeStyle = isBullLast ? "#22c55e88" : "#ef444488";
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 3]);
    ctx.beginPath(); ctx.moveTo(PAD_L, lastY); ctx.lineTo(W - PAD_R, lastY); ctx.stroke();
    ctx.setLineDash([]);

    // Price tag on right
    ctx.fillStyle = isBullLast ? "#22c55e" : "#ef4444";
    ctx.fillRect(W - PAD_R, lastY - 9, PAD_R, 18);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 9px 'DM Sans',system-ui,sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(last.close.toFixed(sym.decimals > 3 ? 4 : sym.decimals > 1 ? 2 : 0), W - PAD_R + PAD_R / 2, lastY + 3);

    // X-axis time labels
    ctx.fillStyle = "#525252";
    ctx.font = "8px 'DM Sans',system-ui,sans-serif";
    ctx.textAlign = "center";
    const labelEvery = Math.ceil(visible.length / 6);
    visible.forEach((_, i) => {
      if (i % labelEvery !== 0) return;
      const x = PAD_L + i * cw + cw / 2;
      ctx.fillText(`-${visible.length - i}`, x, H - 4);
    });
  }

  // Mouse tooltip
  function handleMouseMove(e) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const W = canvas.clientWidth;
    const PAD_L = 8, PAD_R = 52;
    const chartW = W - PAD_L - PAD_R;
    const visible = candlesRef.current.slice(-60);
    const cw = chartW / visible.length;
    const idx = Math.floor((mx - PAD_L) / cw);
    if (idx >= 0 && idx < visible.length) {
      const c = visible[idx];
      setTooltip({ x: mx, c, isBull: c.close >= c.open });
    } else {
      setTooltip(null);
    }
  }

  const fmtP = v => v.toFixed(sym.decimals > 3 ? 4 : sym.decimals > 1 ? 2 : 0);

  return (
    <Card style={{ padding: "14px 14px 12px", overflow: "hidden" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontWeight: 900, fontSize: 14, color: C.text }}>Live Candlestick Chart</div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: C.green, display: "inline-block", animation: "pulse 1.5s infinite" }} />
            <span style={{ fontSize: 10, color: C.green }}>Simulated Live Feed</span>
          </div>
        </div>
        {currentPrice != null && (
          <div style={{ textAlign: "right" }}>
            <div style={{
              fontSize: 18, fontWeight: 900, fontVariantNumeric: "tabular-nums",
              color: priceDir === "up" ? C.green : priceDir === "dn" ? C.red : C.text,
              transition: "color 0.3s",
            }}>
              {currentPrice.toFixed(sym.decimals > 3 ? 4 : sym.decimals > 1 ? 2 : 0)}
            </div>
            <div style={{ fontSize: 9, color: C.text3, letterSpacing: "0.1em" }}>{sym.label}</div>
          </div>
        )}
      </div>

      {/* Symbol selector */}
      <div style={{ display: "flex", gap: 5, overflowX: "auto", paddingBottom: 6, marginBottom: 8 }}>
        {CHART_SYMBOLS.map((s, i) => (
          <button key={s.label} onClick={() => setSymIdx(i)} style={{
            flexShrink: 0, fontSize: 10, fontWeight: 800, padding: "5px 9px", borderRadius: 6,
            border: "none", cursor: "pointer", transition: "all .15s",
            background: i === symIdx ? C.gold : `${C.gold}14`,
            color: i === symIdx ? "#000" : C.text3,
          }}>{s.label}</button>
        ))}
      </div>

      {/* Interval selector */}
      <div style={{ display: "flex", gap: 5, marginBottom: 10 }}>
        {INTERVALS_SIM.map(iv => (
          <button key={iv} onClick={() => setInterval2(iv)} style={{
            flexShrink: 0, fontSize: 10, fontWeight: 800, padding: "4px 9px", borderRadius: 5,
            border: "none", cursor: "pointer", transition: "all .15s",
            background: iv === interval ? C.gold2 : `${C.gold}0f`,
            color: iv === interval ? "#000" : C.text3,
          }}>{iv}</button>
        ))}
      </div>

      {/* Canvas */}
      <div style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: `1px solid ${C.border}`, background: "#080808" }}>
        <canvas
          ref={canvasRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => setTooltip(null)}
          style={{ width: "100%", height: 320, display: "block", cursor: "crosshair" }}
        />
        {tooltip && (
          <div style={{
            position: "absolute", top: 8,
            left: tooltip.x > 180 ? tooltip.x - 130 : tooltip.x + 10,
            background: C.card2, border: `1px solid ${tooltip.isBull ? C.green : C.red}44`,
            borderRadius: 8, padding: "8px 10px", pointerEvents: "none", minWidth: 120,
            boxShadow: "0 4px 20px #0008",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "auto auto", gap: "3px 10px" }}>
              {[["O", tooltip.c.open], ["H", tooltip.c.high], ["L", tooltip.c.low], ["C", tooltip.c.close]].map(([lbl, val]) => (
                <React.Fragment key={lbl}>
                  <span style={{ fontSize: 10, color: C.text3, fontWeight: 700 }}>{lbl}</span>
                  <span style={{ fontSize: 10, color: lbl === "H" ? C.green : lbl === "L" ? C.red : lbl === "C" ? (tooltip.isBull ? C.green : C.red) : C.text, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{fmtP(val)}</span>
                </React.Fragment>
              ))}
            </div>
            <div style={{ marginTop: 4, fontSize: 9, color: C.text4 }}>Vol {tooltip.c.vol.toFixed(2)}K</div>
          </div>
        )}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
        <div style={{ display: "flex", gap: 12 }}>
          {[["▲ Bullish", C.green], ["▼ Bearish", C.red]].map(([lbl, col]) => (
            <span key={lbl} style={{ fontSize: 9, color: col, fontWeight: 800 }}>{lbl}</span>
          ))}
        </div>
        <span style={{ fontSize: 9, color: C.text4 }}>Hover candle for OHLC</span>
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
      <CandlestickChart />
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
  const [loadingDep, setLoadingDep] = useState(false);
  const [loadingWd, setLoadingWd] = useState(false);
  const [range, setRange] = useState("30D");
  const [vote, setVote] = useState(null);
  const [showVote, setShowVote] = useState(true);
  const [totalInvested] = useState(0);
  const [currentValue] = useState(0);

  const perfData = Array.from({ length: 30 }, (_, i) => ({ day: i + 1, value: 3200 + Math.sin(i * 0.6) * 1800 + i * 180 + Math.random() * 400 }));
  const RANGES = ["7D", "30D", "3M", "1Y"];
  const data = range === "7D" ? perfData.slice(-7) : range === "3M" ? [...perfData, ...perfData, ...perfData].slice(0, 60) : perfData;
  const HOLDINGS = [{ pair: "BTC/USDT", label: "Perpetual Futures", color: C.gold2, pct: +5.4, delta: +2310.5 }, { pair: "ETH/USDT", label: "Spot Trading", color: C.blue, pct: +8.2, delta: +1486.7 }, { pair: "EUR/USD", label: "Forex Pairs", color: C.red, pct: -2.1, delta: -689.2 }, { pair: "XAU/USD", label: "Gold Futures", color: C.gold3, pct: +3.8, delta: +1045.3 },];
  const topMarkets = ["BTC/USDT", "ETH/USDT", "EUR/USD", "SPX"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ padding: "20px 0 4px" }}><div style={{ fontSize: 11, color: C.text3, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 6 }}> Trading Overview </div><div style={{ fontSize: 24, fontWeight: 900, color: C.text, lineHeight: 1.15 }}>Welcome Back,</div><div style={{ fontSize: 24, fontWeight: 900, color: C.gold, lineHeight: 1.15 }}>goldenvaultxm</div><div style={{ fontSize: 13, color: "#7c3aed", marginTop: 8, fontStyle: "italic" }}> Here's your trading overview for today </div></div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{[{ icon: Wallet, label: "Total Balance", value: "$0.00", badge: "+5.2%", color: C.green }, { icon: TrendingUp, label: "Total Profit", value: "$0.00", badge: "+11.2%", color: C.green }, { icon: Activity, label: "Active Positions", value: "0", badge: "+3", color: C.gold }, { icon: Target, label: "Win Rate", value: "0.0%", badge: "+2.3%", color: C.gold },].map((s, i) => (<Card key={i} style={{ display: "flex", flexDirection: "column", gap: 10 }}><div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}><IconBox icon={s.icon} color={s.color} /><span style={{ fontSize: 11, fontWeight: 800, color: s.color, background: `${s.color}18`, borderRadius: 20, padding: "3px 8px" }}> ↑ {s.badge} </span></div><div><div style={{ fontSize: 11, color: C.text3, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 4 }}>{s.label}</div><div style={{ fontSize: 26, fontWeight: 900, color: C.text, letterSpacing: "-0.02em", lineHeight: 1 }}>{s.value}</div></div></Card>))}</div>
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
          <Btn variant="gold" loading={loadingDep} onClick={() => { setLoadingDep(true); setTimeout(() => setLoadingDep(false), 1600); }} style={{ width: "100%" }}><ArrowDownToLine size={15} /> Deposit Funds </Btn>
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
        {HOLDINGS.map((h, i) => { const lp = prices[h.pair]?.price; return (<div key={i}><div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0" }}><div style={{ width: 36, height: 36, borderRadius: 9, background: `${h.color}18`, display: "grid", placeItems: "center", flexShrink: 0 }}><span style={{ fontSize: 10, fontWeight: 900, color: h.color }}>{h.pair.split("/")[0]}</span></div><div style={{ flex: 1 }}><div style={{ fontWeight: 800, fontSize: 13, color: C.text }}>{h.pair}</div><div style={{ fontSize: 10, color: C.text3, marginTop: 1 }}>{h.label}</div></div><div style={{ textAlign: "right" }}><div style={{ fontSize: 13, fontWeight: 800, color: h.pct >= 0 ? C.green : C.red }}>{h.pct >= 0 ? "+" : ""}{h.pct}%</div><div style={{ fontSize: 11, color: h.pct >= 0 ? C.green : C.red, marginTop: 1 }}>{h.delta >= 0 ? "+$" : "-$"}{Math.abs(h.delta).toFixed(2)}</div></div></div>{i < HOLDINGS.length - 1 && <GoldLine />}</div>); })}
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
      <div style={{ padding: "20px 0 4px" }}><div style={{ fontSize: 22, fontWeight: 900, color: C.text }}>Account</div><div style={{ fontSize: 12, color: C.text3, marginTop: 4 }}>Manage your profile and settings</div></div>
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

function AppShell() {
  const [page, setPage] = useState("home");
  const [menuOpen, setMenuOpen] = useState(false);
  const { isAuthenticated, requireAuth } = useAuth();
  const { prices, flash } = useLivePrices();
  const handleSetPage = useCallback((p) => { if (p === "trade" && !isAuthenticated) { requireAuth("signup"); return; } setPage(p); }, [isAuthenticated, requireAuth]);
  const PAGES = { home: <HomePage setPage={handleSetPage} />, markets: <MarketsPage prices={prices} flash={flash} />, trade: <TradePage prices={prices} />, settings: <SettingsPage />, };
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.text, fontFamily: "'DM Sans','Sora',system-ui,sans-serif", width: "100%", maxWidth: 600, margin: "0 auto", position: "relative", WebkitFontSmoothing: "antialiased", }}>
      <style>{` *, *::before, *::after { box-sizing: border-box; } body { background: ${C.bg}; margin: 0; } ::-webkit-scrollbar { display: none; } scrollbar-width: none; input, button { font-family: inherit; } input::placeholder { color: #404040; } @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} } @keyframes spin { to { transform: rotate(360deg); } } @keyframes shimmer{ 0%,100%{opacity:.3} 50%{opacity:.7} } #gvxm-root { background: ${C.bg}; min-height: 100vh; } `}</style>
      <div style={{ position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: 400, height: 400, background: `radial-gradient(${C.gold}07 0%,transparent 70%)`, pointerEvents: "none", zIndex: 0 }} />
      <div style={{ position: "relative", zIndex: 1 }}><Nav page={page} setPage={handleSetPage} open={menuOpen} setOpen={setMenuOpen} /><main style={{ padding: "0 16px", paddingBottom: 100 }}>{PAGES[page]}</main><BottomNav page={page} setPage={handleSetPage} /></div>
    </div>
  );
}

export default function GoldenVaultXM() {
  return (<AuthProvider><AppShell /></AuthProvider>);
}
