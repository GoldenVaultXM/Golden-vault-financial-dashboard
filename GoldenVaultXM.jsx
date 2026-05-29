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
