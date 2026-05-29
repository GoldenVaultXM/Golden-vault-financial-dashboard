import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from "recharts";
import {
  Wallet, TrendingUp, Activity, Target, BarChart2, Shield, Zap, Globe,
  ArrowDownToLine, ArrowUpFromLine, FileBarChart, CheckCircle2,
  Menu, X, ChevronRight, Bell, Settings, LogOut, Home,
  Search, Lock, Award, BookOpen, Mail, Phone, MapPin,
  Eye, EyeOff, UserPlus, LogIn, AlertCircle, RefreshCw, Users,
} from "lucide-react";

/* ─── Design Tokens ──────────────────────────────────────────────────────── */
const C = {
  bg:      "#080808", card:   "#0f0f0f", card2:  "#141414", card3:  "#1a1a1a",
  border:  "#222222", border2:"#2a2a2a",
  gold:    "#d97706", gold2:  "#f59e0b", gold3:  "#fbbf24", goldDim:"#92400e",
  green:   "#22c55e", red:    "#ef4444", purple: "#7c3aed", blue:   "#3b82f6",
  text:    "#ffffff", text2:  "#a3a3a3", text3:  "#525252", text4:  "#303030",
};

/* ─── Auth Context ───────────────────────────────────────────────────────── */
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

/* ─── Market Instrument Definitions ─────────────────────────────────────── */
const INSTRUMENT_DEFS = [
  // Crypto
  { pair:"BTC/USDT",  name:"Bitcoin",         cat:"Crypto",     base: 67800,   step:0.0003 },
  { pair:"ETH/USDT",  name:"Ethereum",         cat:"Crypto",     base: 3520,    step:0.0003 },
  { pair:"SOL/USDT",  name:"Solana",           cat:"Crypto",     base: 178,     step:0.0004 },
  { pair:"XRP/USDT",  name:"XRP",              cat:"Crypto",     base: 0.5821,  step:0.0005 },
  { pair:"BNB/USDT",  name:"BNB",              cat:"Crypto",     base: 612,     step:0.0003 },
  { pair:"ADA/USDT",  name:"Cardano",          cat:"Crypto",     base: 0.4412,  step:0.0004 },
  { pair:"AVAX/USDT", name:"Avalanche",        cat:"Crypto",     base: 38.5,    step:0.0004 },
  { pair:"DOGE/USDT", name:"Dogecoin",         cat:"Crypto",     base: 0.1634,  step:0.0005 },
  { pair:"MATIC/USDT",name:"Polygon",          cat:"Crypto",     base: 0.8821,  step:0.0004 },
  { pair:"LINK/USDT", name:"Chainlink",        cat:"Crypto",     base: 18.42,   step:0.0004 },
  { pair:"UNI/USDT",  name:"Uniswap",          cat:"Crypto",     base: 10.34,   step:0.0004 },
  { pair:"LTC/USDT",  name:"Litecoin",         cat:"Crypto",     base: 86.5,    step:0.0003 },
  { pair:"DOT/USDT",  name:"Polkadot",         cat:"Crypto",     base: 7.82,    step:0.0004 },
  { pair:"SHIB/USDT", name:"Shiba Inu",        cat:"Crypto",     base: 0.0000248,step:0.0005},
  { pair:"ATOM/USDT", name:"Cosmos",           cat:"Crypto",     base: 9.41,    step:0.0004 },
  // Forex
  { pair:"EUR/USD",   name:"Euro / US Dollar",         cat:"Forex", base:1.08432, step:0.00008 },
  { pair:"GBP/USD",   name:"British Pound / USD",      cat:"Forex", base:1.27180, step:0.00008 },
  { pair:"USD/JPY",   name:"US Dollar / Japanese Yen", cat:"Forex", base:156.84,  step:0.00006 },
  { pair:"AUD/USD",   name:"Australian Dollar / USD",  cat:"Forex", base:0.65820, step:0.00007 },
  { pair:"USD/CHF",   name:"US Dollar / Swiss Franc",  cat:"Forex", base:0.91240, step:0.00007 },
  { pair:"USD/CAD",   name:"US Dollar / Canadian Dollar",cat:"Forex",base:1.36420,step:0.00007 },
  { pair:"NZD/USD",   name:"New Zealand Dollar / USD", cat:"Forex", base:0.60150, step:0.00008 },
  { pair:"EUR/GBP",   name:"Euro / British Pound",     cat:"Forex", base:0.85210, step:0.00006 },
  { pair:"EUR/JPY",   name:"Euro / Japanese Yen",      cat:"Forex", base:169.82,  step:0.00006 },
  { pair:"GBP/JPY",   name:"British Pound / Yen",      cat:"Forex", base:199.41,  step:0.00006 },
  { pair:"EUR/CHF",   name:"Euro / Swiss Franc",       cat:"Forex", base:0.98740, step:0.00007 },
  { pair:"AUD/JPY",   name:"Australian Dollar / Yen",  cat:"Forex", base:103.21,  step:0.00006 },
  { pair:"USD/MXN",   name:"US Dollar / Mexican Peso", cat:"Forex", base:17.2410, step:0.00007 },
  { pair:"USD/SGD",   name:"US Dollar / Singapore Dollar",cat:"Forex",base:1.3562,step:0.00007},
  { pair:"USD/ZAR",   name:"US Dollar / South African Rand",cat:"Forex",base:18.621,step:0.00007},
  // Stocks
  { pair:"AAPL",   name:"Apple Inc.",           cat:"Stocks",  base:189.30, step:0.0002 },
  { pair:"NVDA",   name:"NVIDIA Corporation",   cat:"Stocks",  base:875.40, step:0.0002 },
  { pair:"TSLA",   name:"Tesla Inc.",           cat:"Stocks",  base:248.60, step:0.0003 },
  { pair:"AMZN",   name:"Amazon.com Inc.",      cat:"Stocks",  base:186.80, step:0.0002 },
  { pair:"MSFT",   name:"Microsoft Corporation",cat:"Stocks",  base:420.50, step:0.0002 },
  { pair:"GOOGL",  name:"Alphabet Inc.",        cat:"Stocks",  base:175.20, step:0.0002 },
  { pair:"META",   name:"Meta Platforms Inc.",  cat:"Stocks",  base:508.40, step:0.0002 },
  { pair:"JPM",    name:"JPMorgan Chase",       cat:"Stocks",  base:199.60, step:0.0002 },
  { pair:"V",      name:"Visa Inc.",            cat:"Stocks",  base:278.30, step:0.0002 },
  { pair:"WMT",    name:"Walmart Inc.",         cat:"Stocks",  base:67.82,  step:0.0002 },
  { pair:"NFLX",   name:"Netflix Inc.",         cat:"Stocks",  base:627.40, step:0.0003 },
  { pair:"AMD",    name:"Advanced Micro Devices",cat:"Stocks", base:162.80, step:0.0003 },
  { pair:"COIN",   name:"Coinbase Global",      cat:"Stocks",  base:214.30, step:0.0003 },
  { pair:"PLTR",   name:"Palantir Technologies",cat:"Stocks",  base:22.40,  step:0.0003 },
  // Indices
  { pair:"SPX",    name:"S&P 500 Index",        cat:"Indices", base:5218.0, step:0.0001 },
  { pair:"NDX",    name:"NASDAQ 100",           cat:"Indices", base:18320.0,step:0.0001 },
  { pair:"DJIA",   name:"Dow Jones Industrial", cat:"Indices", base:39200.0,step:0.0001 },
  { pair:"RUT",    name:"Russell 2000",         cat:"Indices", base:2082.0, step:0.0001 },
  { pair:"VIX",    name:"CBOE Volatility Index",cat:"Indices", base:14.82,  step:0.0002 },
  { pair:"FTSE",   name:"FTSE 100",             cat:"Indices", base:8180.0, step:0.0001 },
  { pair:"DAX",    name:"DAX 40",               cat:"Indices", base:18640.0,step:0.0001 },
  { pair:"N225",   name:"Nikkei 225",           cat:"Indices", base:38820.0,step:0.0001 },
  // Commodities
  { pair:"XAU/USD",name:"Gold Spot",            cat:"Commodities",base:2342.0,step:0.0001 },
  { pair:"XAG/USD",name:"Silver Spot",          cat:"Commodities",base:29.82, step:0.0002 },
  { pair:"XTI/USD",name:"Crude Oil WTI",        cat:"Commodities",base:77.40, step:0.0002 },
  { pair:"BRENT",  name:"Crude Oil Brent",      cat:"Commodities",base:81.60, step:0.0002 },
  { pair:"NATGAS", name:"Natural Gas",          cat:"Commodities",base:2.418, step:0.0003 },
  { pair:"COPPER", name:"Copper",               cat:"Commodities",base:4.612, step:0.0002 },
  // Futures
  { pair:"ES",     name:"S&P 500 E-mini Futures",cat:"Futures",base:5220.0, step:0.0001 },
  { pair:"NQ",     name:"NASDAQ 100 Futures",   cat:"Futures", base:18340.0,step:0.0001 },
  { pair:"YM",     name:"Dow Jones Futures",    cat:"Futures", base:39180.0,step:0.0001 },
  { pair:"GC",     name:"Gold Futures",         cat:"Futures", base:2350.0, step:0.0001 },
  { pair:"CL",     name:"Crude Oil Futures",    cat:"Futures", base:77.60,  step:0.0002 },
  { pair:"ZN",     name:"10-Year T-Note Futures",cat:"Futures",base:109.12, step:0.0001 },
  // Bonds
  { pair:"US02Y",  name:"US 2-Year Treasury",   cat:"Bonds",   base:4.921,  step:0.0001 },
  { pair:"US05Y",  name:"US 5-Year Treasury",   cat:"Bonds",   base:4.412,  step:0.0001 },
  { pair:"US10Y",  name:"US 10-Year Treasury",  cat:"Bonds",   base:4.281,  step:0.0001 },
  { pair:"US30Y",  name:"US 30-Year Treasury",  cat:"Bonds",   base:4.480,  step:0.0001 },
  { pair:"TLT",    name:"20+ Year T-Bond ETF",  cat:"Bonds",   base:91.42,  step:0.0001 },
];

const CATS = ["All","Crypto","Forex","Stocks","Indices","Commodities","Futures","Bonds"];
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
        const next = { ...prev };
        const flashNext = {};
        // Update a random 30% of instruments per tick for realism
        const toUpdate = INSTRUMENT_DEFS
          .filter(() => Math.random() < 0.30)
          .map(d => d.pair);

        toUpdate.forEach(pair => {
          const def  = INSTRUMENT_DEFS.find(d => d.pair === pair);
          const cur  = prev[pair];
          const sign = Math.random() > 0.5 ? 1 : -1;
          const mag  = def.step * (0.5 + Math.random()) * def.base;
          const newPrice = Math.max(cur.price + sign * mag, def.base * 0.7);
          const newPct24h = ((newPrice - cur.prevDay) / cur.prevDay) * 100;
          next[pair] = {
            price:   newPrice,
            pct24h:  newPct24h,
            prevDay: cur.prevDay,
            up:      sign === 1,
          };
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
    if (price < 0.001)   return price.toFixed(6);
    if (price < 1)       return price.toFixed(4);
    if (price < 10)      return price.toFixed(3);
    return price.toLocaleString("en-US", { minimumFractionDigits:2, maximumFractionDigits:2 });
  }
  if (cat === "Forex") return price > 50 ? price.toFixed(3) : price.toFixed(4);
  if (cat === "Bonds") return price.toFixed(3) + "%";
  if (price > 10000) return price.toLocaleString("en-US", { minimumFractionDigits:2, maximumFractionDigits:2 });
  return price.toFixed(2);
};

const fmtPct = p => p == null ? "—" : `${p >= 0 ? "+" : ""}${p.toFixed(2)}%`;

const catColor = cat => ({
  Crypto:"#f59e0b", Forex:"#3b82f6", Stocks:"#22c55e",
  Indices:"#a78bfa", Commodities:"#fbbf24", Futures:"#ef4444", Bonds:"#94a3b8"
}[cat] || C.text3);

/* ─── Shared UI Primitives ───────────────────────────────────────────────── */
const GoldLine = () => (
  <div style={{ height:1, background:`linear-gradient(90deg,transparent,${C.gold}33,transparent)` }} />
);

const Card = ({ children, style={} }) => (
  <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:14, padding:"18px 16px", ...style }}>
    {children}
  </div>
);

const Badge = ({ children, color }) => (
  <span style={{
    fontSize:10, fontWeight:800, letterSpacing:"0.06em",
    background:`${color}20`, color, borderRadius:4, padding:"2px 7px",
    display:"inline-block", textTransform:"uppercase",
  }}>{children}</span>
);

const IconBox = ({ icon:Icon, color=C.gold, size=16, boxSize=36 }) => (
  <div style={{ width:boxSize, height:boxSize, borderRadius:9,
    background:`${color}18`, display:"grid", placeItems:"center", flexShrink:0 }}>
    <Icon size={size} color={color} />
  </div>
);

/* ─── Hover-aware button ─────────────────────────────────────────────────── */
function Btn({ children, onClick, variant="gold", loading=false, disabled=false, style={} }) {
  const [hov, setHov] = useState(false);
  const base = {
    border:"none", borderRadius:10, padding:"13px 16px", fontWeight:900,
    fontSize:13, cursor: disabled||loading ? "not-allowed" : "pointer",
    display:"flex", alignItems:"center", justifyContent:"center", gap:8,
    transition:"all .18s", letterSpacing:"0.04em", outline:"none",
  };
  const variants = {
    gold:    { background: disabled ? C.goldDim : hov ? C.gold2 : C.gold, color:"#000", transform: hov&&!disabled?"scale(1.01)":"scale(1)" },
    outline: { background:"transparent", color: hov ? C.gold2 : C.gold, border:`1.5px solid ${hov ? C.gold2 : C.gold}`, transform:hov?"scale(1.01)":"scale(1)" },
    ghost:   { background: hov ? C.card3 : C.card2, color:C.text3, border:`1px solid ${C.border}` },
    danger:  { background: hov ? "#b91c1c" : C.card, color:C.red, border:`1px solid ${C.border}` },
    purple:  { background: hov ? "#6d28d9" : C.purple, color:"#fff", transform:hov?"scale(1.01)":"scale(1)" },
    white:   { background: hov ? "#e5e7eb" : C.text, color:"#000", transform:hov?"scale(1.01)":"scale(1)" },
  };
  return (
    <button
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      onClick={!disabled && !loading ? onClick : undefined}
      style={{ ...base, ...variants[variant], opacity: loading||disabled ? 0.7 : 1, ...style }}
    >
      {loading ? <><RefreshCw size={14} style={{ animation:"spin 1s linear infinite" }} /> Processing…</> : children}
    </button>
  );
}

/* ─── Sign Up / Login Modal ──────────────────────────────────────────────── */
function AuthModal({ onClose, initialMode="signup" }) {
  const { login } = useAuth();
  const [mode, setMode]       = useState(initialMode);
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");
  const [form, setForm]       = useState({ name:"", email:"", password:"" });

  const handle = async () => {
    setError("");
    if (!form.email || !form.password) { setError("Please fill in all fields."); return; }
    if (mode === "signup" && !form.name) { setError("Please enter your name."); return; }
    if (form.password.length < 6) { setError("Password must be at least 6 characters."); return; }
    setLoading(true);
    await new Promise(r => setTimeout(r, 1200));
    login({ name: form.name || form.email.split("@")[0], email: form.email });
    setLoading(false);
    onClose();
  };

  const inp = {
    width:"100%", background:C.card2, border:`1px solid ${C.border2}`,
    borderRadius:10, padding:"12px 14px", color:C.text, fontSize:13,
    outline:"none", boxSizing:"border-box",
  };

  return (
    <div style={{
      position:"fixed", inset:0, background:"#000000cc",
      backdropFilter:"blur(12px)", zIndex:1000,
      display:"flex", alignItems:"center", justifyContent:"center", padding:20,
    }}>
      <div style={{
        background:C.card, border:`1px solid ${C.border}`, borderRadius:18,
        padding:28, width:"100%", maxWidth:420, position:"relative",
        boxShadow:"0 24px 80px #000a",
      }}>
        {/* Close */}
        <button onClick={onClose} style={{ position:"absolute", top:16, right:16,
          background:"none", border:"none", cursor:"pointer", color:C.text3, padding:4 }}>
          <X size={18} />
        </button>

        {/* Logo */}
        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:24 }}>
          <div style={{ width:38, height:38, borderRadius:10,
            background:`linear-gradient(135deg,${C.gold},${C.goldDim})`,
            display:"grid", placeItems:"center" }}>
            <Zap size={18} color="#000" fill="#000" />
          </div>
          <div>
            <div style={{ fontWeight:900, fontSize:13, color:C.gold, letterSpacing:"0.1em" }}>GOLDEN VAULT XM</div>
            <div style={{ fontSize:9, color:C.text3, letterSpacing:"0.18em" }}>ELITE TRADING</div>
          </div>
        </div>

        <div style={{ fontWeight:900, fontSize:22, color:C.text, marginBottom:4 }}>
          {mode === "signup" ? "Create Account" : "Welcome Back"}
        </div>
        <div style={{ fontSize:13, color:C.text3, marginBottom:22 }}>
          {mode === "signup"
            ? "Join thousands of institutional traders worldwide."
            : "Sign in to access your trading dashboard."}
        </div>

        {/* Fields */}
        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {mode === "signup" && (
            <input placeholder="Full Name" value={form.name}
              onChange={e => setForm(f => ({ ...f, name:e.target.value }))} style={inp} />
          )}
          <input placeholder="Email address" type="email" value={form.email}
            onChange={e => setForm(f => ({ ...f, email:e.target.value }))} style={inp} />
          <div style={{ position:"relative" }}>
            <input placeholder="Password" type={showPw ? "text" : "password"} value={form.password}
              onChange={e => setForm(f => ({ ...f, password:e.target.value }))}
              onKeyDown={e => e.key === "Enter" && handle()}
              style={{ ...inp, paddingRight:44 }} />
            <button onClick={() => setShowPw(p => !p)} style={{ position:"absolute", right:12,
              top:"50%", transform:"translateY(-50%)", background:"none", border:"none",
              cursor:"pointer", color:C.text3 }}>
              {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div style={{ display:"flex", alignItems:"center", gap:8, marginTop:12, padding:"10px 12px",
            background:`${C.red}14`, border:`1px solid ${C.red}33`, borderRadius:8 }}>
            <AlertCircle size={13} color={C.red} />
            <span style={{ fontSize:12, color:C.red }}>{error}</span>
          </div>
        )}

        <Btn variant="gold" onClick={handle} loading={loading} style={{ width:"100%", marginTop:18 }}>
          {mode === "signup"
            ? <><UserPlus size={15} /> Create Account</>
            : <><LogIn size={15} /> Sign In</>}
        </Btn>

        {/* Trust badges */}
        {mode === "signup" && (
          <div style={{ display:"flex", justifyContent:"center", gap:16, marginTop:14 }}>
            {[["🔒","Encrypted"],["✅","Regulated"],["🌐","24/7 Support"]].map(([em,lbl]) => (
              <div key={lbl} style={{ textAlign:"center" }}>
                <div style={{ fontSize:14 }}>{em}</div>
                <div style={{ fontSize:9, color:C.text3, marginTop:2 }}>{lbl}</div>
              </div>
            ))}
          </div>
        )}

        {/* Toggle mode */}
        <div style={{ textAlign:"center", marginTop:18, fontSize:12, color:C.text3 }}>
          {mode === "signup" ? "Already have an account? " : "Don't have an account? "}
          <button onClick={() => setMode(m => m === "signup" ? "login" : "signup")}
            style={{ background:"none", border:"none", cursor:"pointer", color:C.gold,
              fontWeight:800, fontSize:12 }}>
            {mode === "signup" ? "Sign In" : "Create Account"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Auth Provider ──────────────────────────────────────────────────────── */
function AuthProvider({ children }) {
  const [user, setUser]   = useState(null);
  const [modal, setModal] = useState(null); // "signup" | "login" | null
  const isAuthenticated   = !!user;

  const login  = (u) => { setUser(u); setModal(null); };
  const logout = ()  => setUser(null);

  const requireAuth = (mode = "signup") => {
    if (!isAuthenticated) { setModal(mode); return false; }
    return true;
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout, requireAuth }}>
      {children}
      {modal && <AuthModal onClose={() => setModal(null)} initialMode={modal} />}
    </AuthContext.Provider>
  );
}

/* ─── Nav ────────────────────────────────────────────────────────────────── */
function Nav({ page, setPage, open, setOpen }) {
  const { isAuthenticated, user, logout, requireAuth } = useAuth();
