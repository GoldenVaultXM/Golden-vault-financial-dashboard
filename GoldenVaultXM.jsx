import { useState, useEffect, useRef } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from "recharts";
import {
  Wallet, TrendingUp, Activity, BarChart2, Shield, Zap, Globe,
  ArrowDownToLine, ArrowUpFromLine, FileBarChart, CheckCircle2,
  Menu, X, ChevronRight, Bell, Settings, LogOut, Home,
  BookOpen, Search, Filter, Star, Target, Eye, Lock,
  Phone, Mail, MapPin, Users, DollarSign, Award
} from "lucide-react";

// ─── Design Tokens ────────────────────────────────────────────────────────────
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

// ─── Static Data ──────────────────────────────────────────────────────────────
const perfData = [
  3200,4100,3800,4900,4200,5100,4700,5800,5200,6100,
  5500,6400,5900,7000,6200,7500,6800,7200,6600,8100,
  7400,6900,8300,7800,9000,8200,7600,8800,8400,9200
].map((v, i) => ({ day: i + 1, value: v }));

const holdings = [
  { pair:"BTC/USDT", label:"Perpetual Futures", value:45230.50, pct:+5.4,  delta:+2310.50, color:C.gold2  },
  { pair:"ETH/USDT", label:"Spot Trading",      value:19600.00, pct:+8.2,  delta:+1486.70, color:C.blue   },
  { pair:"EUR/USD",  label:"Forex Pairs",        value:32100.00, pct:-2.1,  delta:-689.20,  color:C.red    },
  { pair:"XAU/USD",  label:"Gold Futures",       value:28500.00, pct:+3.8,  delta:+1045.30, color:C.gold3  },
];

const liveMarkets = [
  { name:"Bitcoin",    pair:"BTC/USDT", price:"75,244.02", raw:75244.02, pct:"+0.01%", up:true  },
  { name:"Ethereum",   pair:"ETH/USDT", price:"2,073.54",  raw:2073.54,  pct:"+0.00%", up:true  },
  { name:"EUR/Dollar", pair:"EUR/USD",  price:"1.1629",    raw:1.1629,   pct:"-0.00%", up:false },
  { name:"S&P 500",    pair:"S&P 500",  price:"4,701.11",  raw:4701.11,  pct:"+0.02%", up:true  },
];

const allInstruments = [
  { cat:"Crypto",    pair:"BTC/USDT",  name:"Bitcoin",              price:"75,244.02", pct:"+0.01%", up:true  },
  { cat:"Crypto",    pair:"ETH/USDT",  name:"Ethereum",             price:"2,073.54",  pct:"+0.00%", up:true  },
  { cat:"Forex",     pair:"EUR/USD",   name:"Euro / US Dollar",     price:"1.1629",    pct:"-0.00%", up:false },
  { cat:"Futures",   pair:"S&P 500",   name:"S&P 500 Index",        price:"4,701.11",  pct:"+0.02%", up:true  },
  { cat:"Commodity", pair:"XAU/USD",   name:"Gold Spot",            price:"2,380.77",  pct:"-0.02%", up:false },
  { cat:"Forex",     pair:"GBP/CHF",   name:"British Pound / CHF",  price:"1.1445",    pct:"+0.01%", up:true  },
  { cat:"Forex",     pair:"GBP/AUD",   name:"British Pound / AUD",  price:"1.9222",    pct:"+0.03%", up:true  },
  { cat:"Forex",     pair:"AUD/JPY",   name:"Australian Dollar/JPY",price:"101.52",    pct:"-0.00%", up:false },
  { cat:"NFT",       pair:"ETH NFTs",  name:"ETH NFT Floor Index",  price:"0.042",     pct:"+1.20%", up:true  },
  { cat:"Stock",     pair:"AAPL",      name:"Apple Inc.",           price:"189.30",    pct:"+0.34%", up:true  },
];

const CATS = ["All","Crypto","Forex","Stock","Futures","Commodity","NFT"];
