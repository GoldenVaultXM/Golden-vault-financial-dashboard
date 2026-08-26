/**
 * Mining.jsx  →  GoldenVaultXM Live Spot Trading Terminal
 *
 * ┌─ Architecture ────────────────────────────────────────────────────────┐
 * │  Single source of truth: Supabase "vault_account" table               │
 * │    - balance       : USDT available for trading                       │
 * │    - total_profit  : cumulative realized P&L                          │
 * │  Orders: "vault_orders" table (existing schema, extended)             │
 * │    - lifecycle: open → partial → filled → settled                     │
 * │    - settled flag prevents double-booking on refresh                  │
 * │  Dashboard reads same tables — no second financial system             │
 * │  Balance deducted on order placement, profit credited on settlement   │
 * │  All intervals cleaned up on unmount                                  │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * Props
 *   user              – { email: string } | null
 *   onAccountChange   – (patch: { balance?, totalProfit?, activePositions? }) => void
 *                       Call this so the Dashboard/App can stay in sync
 *                       without a second DB round-trip.
 *
 * Supabase tables required:
 *
 *   vault_account (
 *     email         text primary key,
 *     balance       numeric not null default 10000,
 *     total_profit  numeric not null default 0,
 *     updated_at    timestamptz default now()
 *   )
 *
 *   vault_orders (
 *     id          text primary key,
 *     email       text not null,
 *     pair        text not null,
 *     type        text not null,
 *     price       numeric not null,
 *     amount      numeric not null,
 *     total       numeric not null,
 *     fee         numeric not null,
 *     filled      numeric not null default 0,
 *     status      text not null,   -- open|partial|filled|cancelled|settled
 *     settled     boolean not null default false,
 *     profit      numeric,         -- realized profit when settled
 *     "createdAt" timestamptz default now()
 *   )
 */

import {
  useState, useEffect, useRef, useCallback, useMemo, memo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "./supabaseClient";
import {
  ChevronDown, X, Settings2, BarChart2,
  TrendingUp, Clock, CheckCircle2,
  ChevronRight, Home, LineChart, Zap, Wallet,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════════════════════════ */
const T = {
  bg0:     "#090C10",
  bg1:     "#0D1117",
  bg2:     "#131920",
  bg3:     "#1A2230",
  bg4:     "#212C3D",
  border:  "#1E2A3A",
  border2: "#263346",
  green:   "#00C076",
  green2:  "#00E88A",
  greenDim:"#00C07622",
  red:     "#F6465D",
  red2:    "#FF6070",
  redDim:  "#F6465D22",
  gold:    "#F0B90B",
  goldDim: "#F0B90B18",
  blue:    "#1890FF",
  white:   "#E8EDF5",
  gray1:   "#8B98A9",
  gray2:   "#4A5568",
  gray3:   "#2D3748",
  font:    "'SF Mono', 'Roboto Mono', 'Courier New', monospace",
  sans:    "-apple-system, BlinkMacSystemFont, 'Inter', sans-serif",
};

/* ═══════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════ */
const PAIRS = [
  { base: "BTC", quote: "USDT", price: 67482.31, vol: 1.42,  precision: 2 },
  { base: "ETH", quote: "USDT", price: 3521.88,  vol: -0.87, precision: 2 },
  { base: "SOL", quote: "USDT", price: 172.44,   vol: 3.21,  precision: 3 },
  { base: "BNB", quote: "USDT", price: 594.12,   vol: 0.55,  precision: 2 },
  { base: "XRP", quote: "USDT", price: 0.5841,   vol: -1.23, precision: 4 },
  { base: "AVAX", quote: "USDT", price: 38.92,   vol: 2.18,  precision: 3 },
];

const SUPABASE_DEBOUNCE = 1500;
const CANDLE_LIMIT      = 60;
const BOOK_LEVELS       = 8;
const TRADE_LIMIT       = 20;
const DEFAULT_BALANCE   = 10000.00;

/* ═══════════════════════════════════════════════════════════════════════
   MARKET SIMULATION ENGINE
═══════════════════════════════════════════════════════════════════════ */
function createMarketEngine(initPair) {
  let price       = initPair.price;
  let momentum    = 0;
  let volatility  = 0.0003;
  let vol24Change = initPair.vol;
  const openPrice = price * (1 - vol24Change / 100);

  function nextPrice() {
    const shock    = (Math.random() - 0.5) * 2;
    const volShock = Math.random() < 0.04 ? (Math.random() - 0.5) * 6 : 1;
    momentum       = momentum * 0.88 + shock * volatility * volShock;
    if (Math.random() < 0.02) volatility = 0.0003 + Math.random() * 0.0008;
    else volatility = volatility * 0.97 + 0.0003 * 0.03;
    price += price * momentum;
    price  = Math.max(price * 0.92, price);
    return price;
  }

  function buildBook(mid) {
    const tick = mid * 0.00008;
    const sells = Array.from({ length: BOOK_LEVELS }, (_, i) => {
      const px  = mid + tick * (i + 1) * (1 + Math.random() * 0.4);
      const amt = parseFloat((Math.random() * 1.8 + 0.02).toFixed(3));
      return { price: px, amount: amt };
    }).sort((a, b) => a.price - b.price);
    const buys = Array.from({ length: BOOK_LEVELS }, (_, i) => {
      const px  = mid - tick * (i + 1) * (1 + Math.random() * 0.4);
      const amt = parseFloat((Math.random() * 1.8 + 0.02).toFixed(3));
      return { price: px, amount: amt };
    }).sort((a, b) => b.price - a.price);
    return { sells, buys };
  }

  function buildTrade(mid) {
    const side = Math.random() > 0.5 ? "buy" : "sell";
    return {
      id:     Math.random().toString(36).slice(2),
      price:  mid + (Math.random() - 0.5) * mid * 0.0001,
      amount: parseFloat((Math.random() * 0.5 + 0.002).toFixed(3)),
      side,
      time:   Date.now(),
    };
  }

  function buildCandle(prev, mid) {
    const o    = prev ? prev.c : mid;
    const move = (Math.random() - 0.48) * mid * 0.002;
    const c    = o + move;
    const hi   = Math.max(o, c) + Math.random() * mid * 0.0008;
    const lo   = Math.min(o, c) - Math.random() * mid * 0.0008;
    const vol  = Math.random() * 15 + 2;
    return { o, h: hi, l: lo, c, vol, t: Date.now(), bullish: c >= o };
  }

  function getVol24() {
    return ((price - openPrice) / openPrice) * 100;
  }

  return { nextPrice, buildBook, buildTrade, buildCandle, getVol24, getPrice: () => price };
}

/* ═══════════════════════════════════════════════════════════════════════
   useMarket
═══════════════════════════════════════════════════════════════════════ */
function useMarket(pair) {
  const engineRef = useRef(null);

  const [snap, setSnap] = useState(() => {
    const eng    = createMarketEngine(pair);
    engineRef.current = eng;
    const mid    = eng.getPrice();
    const book   = eng.buildBook(mid);
    const candles = Array.from({ length: CANDLE_LIMIT }, (_, i) => {
      const fake = { o: pair.price * (0.98 + Math.random() * 0.04), c: 0, h: 0, l: 0, vol: 0, bullish: true, t: 0 };
      fake.c = fake.o + (Math.random() - 0.48) * pair.price * 0.002;
      fake.h = Math.max(fake.o, fake.c) + Math.random() * pair.price * 0.001;
      fake.l = Math.min(fake.o, fake.c) - Math.random() * pair.price * 0.001;
      fake.vol = Math.random() * 12 + 1;
      fake.bullish = fake.c >= fake.o;
      fake.t = Date.now() - (CANDLE_LIMIT - i) * 60000;
      return fake;
    });
    return { price: mid, prevPrice: mid, vol24: pair.vol, book, trades: [], candles, tick: 0 };
  });

  useEffect(() => {
    const eng = createMarketEngine(pair);
    engineRef.current = eng;
    const mid  = eng.getPrice();
    setSnap({ price: mid, prevPrice: mid, vol24: pair.vol, book: eng.buildBook(mid), trades: [], candles: [], tick: 0 });
  }, [pair.base]);

  useEffect(() => {
    const eng = engineRef.current;
    const priceId = setInterval(() => {
      const prev  = eng.getPrice();
      const mid   = eng.nextPrice();
      const book  = eng.buildBook(mid);
      const vol24 = eng.getVol24();
      setSnap((s) => ({ ...s, price: mid, prevPrice: prev, vol24, book, tick: s.tick + 1 }));
    }, 400);

    let tradeTimeout;
    function scheduleTrade() {
      tradeTimeout = setTimeout(() => {
        const mid   = eng.getPrice();
        const trade = eng.buildTrade(mid);
        setSnap((s) => ({ ...s, trades: [trade, ...s.trades].slice(0, TRADE_LIMIT) }));
        scheduleTrade();
      }, 600 + Math.random() * 800);
    }
    scheduleTrade();

    const candleId = setInterval(() => {
      const mid = eng.getPrice();
      setSnap((s) => {
        const prev = s.candles[s.candles.length - 1];
        const c    = eng.buildCandle(prev, mid);
        return { ...s, candles: [...s.candles.slice(-(CANDLE_LIMIT - 1)), c] };
      });
    }, 8000);

    return () => { clearInterval(priceId); clearTimeout(tradeTimeout); clearInterval(candleId); };
  }, [pair.base]);

  return snap;
}

/* ═══════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════ */
function fmtPrice(n, prec = 2) {
  return Number(n).toLocaleString("en-US", { minimumFractionDigits: prec, maximumFractionDigits: prec });
}
function fmtAmt(n)  { return Number(n).toFixed(3); }
function fmtPct(n)  { return (n >= 0 ? "+" : "") + Number(n).toFixed(2) + "%"; }

function useFlash(value) {
  const prev  = useRef(value);
  const [dir, setDir] = useState(null);
  useEffect(() => {
    if (value !== prev.current) {
      setDir(value > prev.current ? "up" : "down");
      prev.current = value;
      const t = setTimeout(() => setDir(null), 400);
      return () => clearTimeout(t);
    }
  }, [value]);
  return dir;
}

/* ═══════════════════════════════════════════════════════════════════════
   ACCOUNT HOOK — single source of truth
   Reads from and writes to vault_account in Supabase.
   Exposes debitBalance() and creditProfit() for atomic operations.
═══════════════════════════════════════════════════════════════════════ */
function useAccount(user, onAccountChange) {
  const [balance,     setBalance]     = useState(DEFAULT_BALANCE);
  const [totalProfit, setTotalProfit] = useState(0);
  const debounceRef = useRef(null);

  // Load from DB on mount
  useEffect(() => {
    if (!user?.email) return;
    (async () => {
      const { data, error } = await supabase
        .from("vault_account")
        .select("balance, total_profit")
        .eq("email", user.email)
        .single();

      if (error || !data) {
        // First time user — create row
        await supabase.from("vault_account").upsert(
          { email: user.email, balance: DEFAULT_BALANCE, total_profit: 0 },
          { onConflict: "email" }
        );
        setBalance(DEFAULT_BALANCE);
        setTotalProfit(0);
        onAccountChange?.({ balance: DEFAULT_BALANCE, totalProfit: 0 });
      } else {
        setBalance(Number(data.balance));
        setTotalProfit(Number(data.total_profit));
        onAccountChange?.({ balance: Number(data.balance), totalProfit: Number(data.total_profit) });
      }
    })();
  }, [user?.email]);

  // Persist to Supabase — debounced
  const persist = useCallback((newBalance, newProfit) => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      if (!user?.email) return;
      await supabase.from("vault_account").upsert(
        { email: user.email, balance: newBalance, total_profit: newProfit, updated_at: new Date().toISOString() },
        { onConflict: "email" }
      );
    }, SUPABASE_DEBOUNCE);
  }, [user?.email]);

  // Debit balance when an order is placed
  const debitBalance = useCallback((amount) => {
    setBalance((prev) => {
      const next = Math.max(0, prev - amount);
      setTotalProfit((profit) => { persist(next, profit); return profit; });
      onAccountChange?.({ balance: next });
      return next;
    });
  }, [persist, onAccountChange]);

  // Credit profit when an order is settled
  const creditProfit = useCallback((profitAmount) => {
    setTotalProfit((prev) => {
      const next = prev + profitAmount;
      setBalance((bal) => { persist(bal, next); return bal; });
      onAccountChange?.({ totalProfit: next });
      return next;
    });
  }, [persist, onAccountChange]);

  return { balance, totalProfit, debitBalance, creditProfit };
}

/* ═══════════════════════════════════════════════════════════════════════
   MINI CHART
═══════════════════════════════════════════════════════════════════════ */
const MiniChart = memo(function MiniChart({ candles, color }) {
  if (!candles || candles.length < 2) return null;
  const prices = candles.map((c) => c.c);
  const min    = Math.min(...prices);
  const max    = Math.max(...prices);
  const range  = max - min || 1;
  const W = 80, H = 28;
  const pts = prices.map((p, i) =>
    `${(i / (prices.length - 1)) * W},${H - ((p - min) / range) * H}`
  ).join(" ");
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
});

/* ═══════════════════════════════════════════════════════════════════════
   PRICE CHART (canvas candlesticks)
═══════════════════════════════════════════════════════════════════════ */
const PriceChart = memo(function PriceChart({ candles, pair }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !candles.length) return;
    const ctx  = canvas.getContext("2d");
    const W    = canvas.width;
    const H    = canvas.height;
    ctx.clearRect(0, 0, W, H);

    const prices = candles.flatMap((c) => [c.h, c.l]);
    const pMin   = Math.min(...prices);
    const pMax   = Math.max(...prices);
    const pRange = pMax - pMin || 1;
    const PAD    = { top: 12, bottom: 32, left: 4, right: 52 };
    const chartH = H - PAD.top - PAD.bottom;
    const chartW = W - PAD.left - PAD.right;
    const cw     = Math.max(2, chartW / candles.length - 1);

    function py(price) { return PAD.top + chartH - ((price - pMin) / pRange) * chartH; }
    function px(i)     { return PAD.left + (i / candles.length) * chartW + cw / 2; }

    // Grid
    ctx.strokeStyle = "#1E2A3A";
    ctx.lineWidth   = 1;
    for (let g = 0; g <= 4; g++) {
      const y = PAD.top + (g / 4) * chartH;
      ctx.beginPath(); ctx.moveTo(PAD.left, y); ctx.lineTo(W - PAD.right, y); ctx.stroke();
      ctx.fillStyle = "#4A5568";
      ctx.font = `9px ${T.font}`;
      ctx.textAlign = "right";
      ctx.fillText(fmtPrice(pMax - (g / 4) * pRange, pair.precision), W - PAD.right + 48, y + 3);
    }

    // Candles
    candles.forEach((c, i) => {
      const x  = px(i);
      const oY = py(c.o);
      const cY = py(c.c);
      const hY = py(c.h);
      const lY = py(c.l);
      const color = c.bullish ? T.green : T.red;
      ctx.strokeStyle = color;
      ctx.lineWidth   = 1;
      ctx.beginPath(); ctx.moveTo(x, hY); ctx.lineTo(x, lY); ctx.stroke();
      ctx.fillStyle = c.bullish ? T.green : T.red;
      const top  = Math.min(oY, cY);
      const h    = Math.max(1, Math.abs(oY - cY));
      ctx.fillRect(x - cw / 2, top, cw, h);
    });

    // Time axis
    ctx.fillStyle = "#4A5568";
    ctx.font      = `8px ${T.font}`;
    ctx.textAlign = "center";
    for (let i = 0; i < candles.length; i += Math.floor(candles.length / 5)) {
      const x   = px(i);
      const d   = new Date(candles[i].t);
      const lbl = d.getHours().toString().padStart(2, "0") + ":" + d.getMinutes().toString().padStart(2, "0");
      ctx.fillText(lbl, x, H - 6);
    }
  }, [candles, pair]);

  return (
    <canvas
      ref={canvasRef}
      width={900}
      height={200}
      style={{ width: "100%", height: 200, display: "block" }}
    />
  );
});

/* ═══════════════════════════════════════════════════════════════════════
   ORDER BOOK
═══════════════════════════════════════════════════════════════════════ */
const OrderBook = memo(function OrderBook({ book, price, prevPrice, pair }) {
  const flash = useFlash(price);
  const maxAmt = useMemo(() => {
    const all = [...(book?.sells || []), ...(book?.buys || [])].map((r) => r.amount);
    return Math.max(...all, 1);
  }, [book]);

  function Row({ row, side }) {
    const isAsk = side === "ask";
    const pct   = (row.amount / maxAmt) * 100;
    return (
      <div style={{ position: "relative", display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: 11, fontFamily: T.font }}>
        <div style={{
          position: "absolute", top: 0, bottom: 0,
          [isAsk ? "right" : "right"]: 0,
          width: `${pct}%`,
          background: isAsk ? T.redDim : T.greenDim,
          borderRadius: 2,
        }} />
        <span style={{ color: isAsk ? T.red : T.green, zIndex: 1, fontWeight: 600 }}>
          {fmtPrice(row.price, pair.precision)}
        </span>
        <span style={{ color: T.gray1, zIndex: 1 }}>{fmtAmt(row.amount)}</span>
      </div>
    );
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: T.gray2, fontFamily: T.font }}>Price (USDT)</span>
        <span style={{ fontSize: 10, color: T.gray2, fontFamily: T.font }}>Amount</span>
      </div>
      {(book?.sells || []).slice().reverse().slice(0, 6).map((row, i) => <Row key={i} row={row} side="ask" />)}
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "5px 0", gap: 8, margin: "3px 0" }}>
        <span style={{ fontSize: 14, fontWeight: 700, fontFamily: T.font, color: flash === "up" ? T.green2 : flash === "down" ? T.red2 : (price >= prevPrice ? T.green : T.red), transition: "color 0.2s" }}>
          {fmtPrice(price, pair.precision)}
        </span>
        <span style={{ fontSize: 9, color: T.gray2 }}>≈ ${fmtPrice(price, 2)}</span>
      </div>
      {(book?.buys || []).slice(0, 6).map((row, i) => <Row key={i} row={row} side="bid" />)}
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════════════
   TRADE FEED
═══════════════════════════════════════════════════════════════════════ */
const TradeFeed = memo(function TradeFeed({ trades, pair }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 10, color: T.gray2, fontFamily: T.font }}>Price</span>
        <span style={{ fontSize: 10, color: T.gray2, fontFamily: T.font }}>Amount</span>
        <span style={{ fontSize: 10, color: T.gray2, fontFamily: T.font }}>Time</span>
      </div>
      {trades.slice(0, 16).map((t) => (
        <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: 11, fontFamily: T.font }}>
          <span style={{ color: t.side === "buy" ? T.green : T.red, fontWeight: 600 }}>
            {fmtPrice(t.price, pair.precision)}
          </span>
          <span style={{ color: T.gray1 }}>{fmtAmt(t.amount)}</span>
          <span style={{ color: T.gray2 }}>
            {new Date(t.time).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}
          </span>
        </div>
      ))}
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════════════
   PLACE ORDER MODAL
═══════════════════════════════════════════════════════════════════════ */
function PlaceOrderModal({ pair, currentPrice, balance, onClose, onSubmit }) {
  const [side,      setSide]      = useState("buy");
  const [type,      setType]      = useState("limit");
  const [priceInput, setPriceInput] = useState(fmtPrice(currentPrice, pair.precision));
  const [amtInput,  setAmtInput]  = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error,     setError]     = useState("");

  const px      = parseFloat(priceInput) || currentPrice;
  const amt     = parseFloat(amtInput)   || 0;
  const total   = px * amt;
  const fee     = total * 0.001;
  const maxAmt  = balance / (px * 1.001);
  const cost    = total + fee;

  function handleConfirm() {
    if (amt <= 0)         { setError("Enter a valid amount"); return; }
    if (cost > balance)   { setError("Insufficient balance"); return; }
    setError("");
    setSubmitted(true);

    const order = {
      id:        `ord-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      pair:      `${pair.base}/${pair.quote}`,
      type,
      side,
      price:     px,
      amount:    amt,
      total,
      fee,
      filled:    0,
      status:    "open",
      settled:   false,
      profit:    null,
      createdAt: new Date().toISOString(),
    };

    setTimeout(() => {
      onSubmit(order);
      onClose();
    }, 700);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(9,12,16,0.94)", backdropFilter: "blur(10px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onPointerDown={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onPointerDown={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 480, background: T.bg2, borderRadius: "20px 20px 0 0", border: `1px solid ${T.border2}`, borderBottom: "none", padding: "20px 20px 40px", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div style={{ width: 36, height: 3, borderRadius: 2, background: T.border2, margin: "0 auto 16px" }} />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: T.white }}>Place Order</div>
          <button onClick={onClose} style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.gray1 }}>
            <X size={14} />
          </button>
        </div>

        {/* Buy / Sell toggle */}
        <div style={{ display: "flex", background: T.bg3, borderRadius: 8, padding: 3, marginBottom: 16 }}>
          {["buy", "sell"].map((s) => (
            <button key={s} onClick={() => setSide(s)}
              style={{ flex: 1, padding: "9px 0", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 700, letterSpacing: "0.04em",
                background: side === s ? (s === "buy" ? T.green : T.red) : "transparent",
                color: side === s ? "#000" : T.gray1,
                transition: "all 0.18s",
              }}>
              {s.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Order type */}
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["limit", "market"].map((t) => (
            <button key={t} onClick={() => setType(t)}
              style={{ padding: "6px 14px", borderRadius: 6, border: `1px solid ${type === t ? T.border2 : T.border}`, background: type === t ? T.bg4 : "transparent", color: type === t ? T.white : T.gray2, fontSize: 11, fontWeight: 600, cursor: "pointer" }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* Price input */}
        {type === "limit" && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: T.gray1, fontFamily: T.font, marginBottom: 5 }}>Price (USDT)</div>
            <input type="number" value={priceInput} onChange={(e) => setPriceInput(e.target.value)}
              style={{ width: "100%", background: T.bg3, border: `1px solid ${T.border2}`, borderRadius: 8, outline: "none", padding: "12px 14px", fontSize: 14, fontFamily: T.font, color: T.white, fontWeight: 600, boxSizing: "border-box" }} />
          </div>
        )}

        {/* Amount */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: T.gray1, fontFamily: T.font, marginBottom: 5 }}>Amount ({pair.base})</div>
          <input type="number" value={amtInput} onChange={(e) => setAmtInput(e.target.value)} placeholder="0.000"
            style={{ width: "100%", background: T.bg3, border: `1px solid ${T.border2}`, borderRadius: 8, outline: "none", padding: "12px 14px", fontSize: 14, fontFamily: T.font, color: T.white, fontWeight: 600, boxSizing: "border-box" }} />
          <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
            {[25, 50, 75, 100].map((pct) => (
              <button key={pct} onClick={() => setAmtInput(((maxAmt * pct) / 100).toFixed(4))}
                style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: `1px solid ${T.border2}`, background: T.bg3, color: T.gray1, fontSize: 10, fontWeight: 600, cursor: "pointer" }}>
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div style={{ background: T.bg3, borderRadius: 8, padding: "12px 14px", marginBottom: 16, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 7 }}>
          {[
            ["Total (USDT)", total > 0 ? fmtPrice(total, 2) : "--"],
            ["Available",    fmtPrice(balance, 2) + " USDT"],
            ["Est. Fee",     fee > 0 ? fmtPrice(fee, 4) + " USDT" : "--"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: T.font }}>
              <span style={{ color: T.gray1 }}>{k}</span>
              <span style={{ color: T.white, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>

        {error && <div style={{ color: T.red, fontSize: 12, marginBottom: 10, textAlign: "center", fontWeight: 600 }}>{error}</div>}

        <button onClick={handleConfirm} disabled={submitted}
          style={{ width: "100%", padding: "16px", borderRadius: 10, border: "none",
            background: submitted ? T.green + "88" : (side === "buy" ? `linear-gradient(90deg, ${T.green}, #00A060)` : `linear-gradient(90deg, ${T.red}, #C03040)`),
            color: "#000", fontSize: 15, fontWeight: 700, letterSpacing: "0.04em",
            cursor: submitted ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: submitted ? "none" : `0 4px 20px ${side === "buy" ? T.green : T.red}44`,
            transition: "all 0.2s",
          }}>
          {submitted ? <><CheckCircle2 size={18} /> Placed!</> : `${side === "buy" ? "BUY" : "SELL"} ${pair.base}`}
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ORDERS PANEL
═══════════════════════════════════════════════════════════════════════ */
function OrdersPanel({ orders, onCancel, onClose }) {
  const [tab, setTab] = useState("open");
  const filtered = useMemo(() => {
    if (tab === "open")    return orders.filter((o) => o.status === "open" || o.status === "partial");
    if (tab === "history") return orders.filter((o) => o.status === "filled" || o.status === "settled" || o.status === "cancelled");
    return orders;
  }, [orders, tab]);

  const statusColor = (s) => ({ open: T.gold, partial: T.blue, filled: T.green, settled: T.green, cancelled: T.gray2 }[s] || T.gray1);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(9,12,16,0.94)", backdropFilter: "blur(10px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onPointerDown={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onPointerDown={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 480, background: T.bg2, borderRadius: "20px 20px 0 0", border: `1px solid ${T.border2}`, borderBottom: "none", padding: "20px 0 44px", maxHeight: "75vh", display: "flex", flexDirection: "column" }}
      >
        <div style={{ padding: "0 20px", marginBottom: 12 }}>
          <div style={{ width: 36, height: 3, borderRadius: 2, background: T.border2, margin: "0 auto 16px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.white }}>My Orders</div>
            <button onClick={onClose} style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.gray1 }}>
              <X size={14} />
            </button>
          </div>
        </div>
        <div style={{ display: "flex", padding: "0 20px", gap: 20, borderBottom: `1px solid ${T.border}`, marginBottom: 0 }}>
          {[["open", "Open"], ["history", "History"], ["all", "All"]].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "8px 0 10px", fontSize: 13, fontWeight: tab === id ? 700 : 500, color: tab === id ? T.white : T.gray1, borderBottom: tab === id ? `2px solid ${T.gold}` : "2px solid transparent" }}>
              {label}
            </button>
          ))}
        </div>
        <div style={{ overflowY: "auto", flex: 1, padding: "12px 20px 0" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: T.gray2, fontSize: 13 }}>No orders</div>
          ) : filtered.map((o) => (
            <div key={o.id} style={{ background: T.bg3, borderRadius: 10, padding: "12px 14px", marginBottom: 8, border: `1px solid ${T.border}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>{o.pair}</div>
                  <div style={{ fontSize: 10, color: T.gray2, fontFamily: T.font, marginTop: 2 }}>{(o.type || "limit").toUpperCase()} · {o.side?.toUpperCase()}</div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(o.status), background: statusColor(o.status) + "18", padding: "3px 8px", borderRadius: 6, letterSpacing: "0.06em" }}>
                    {o.status.toUpperCase()}
                  </span>
                  {(o.status === "open" || o.status === "partial") && (
                    <button onClick={() => onCancel(o.id)}
                      style={{ background: T.redDim, border: `1px solid ${T.red}44`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: T.red, fontSize: 10, fontWeight: 700 }}>
                      Cancel
                    </button>
                  )}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                {[
                  ["Price",  fmtPrice(o.price, 2)],
                  ["Amount", fmtAmt(o.amount)],
                  ["Filled", fmtAmt(o.filled || 0)],
                  ["Total",  fmtPrice(o.total, 2)],
                  ["Fee",    fmtPrice(o.fee, 4)],
                  ["P/L",    o.profit != null ? (o.profit >= 0 ? "+" : "") + fmtPrice(o.profit, 2) : "--"],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 9, color: T.gray2, fontFamily: T.font, marginBottom: 1 }}>{k}</div>
                    <div style={{ fontSize: 11, color: k === "P/L" ? (o.profit >= 0 ? T.green : T.red) : T.white, fontFamily: T.font, fontWeight: 600 }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   PAIR SELECTOR MODAL
═══════════════════════════════════════════════════════════════════════ */
function PairModal({ pairs, current, onSelect, onClose }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(9,12,16,0.94)", backdropFilter: "blur(10px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onPointerDown={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onPointerDown={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 480, background: T.bg2, borderRadius: "20px 20px 0 0", border: `1px solid ${T.border2}`, borderBottom: "none", padding: "20px 0 40px" }}
      >
        <div style={{ width: 36, height: 3, borderRadius: 2, background: T.border2, margin: "0 auto 16px" }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: T.white, padding: "0 20px", marginBottom: 14 }}>Select Pair</div>
        {pairs.map((p) => (
          <button key={p.base} onClick={() => { onSelect(p); onClose(); }}
            style={{ width: "100%", background: p.base === current.base ? T.bg3 : "transparent", border: "none", padding: "13px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.bg4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: T.gold }}>
                {p.base.slice(0, 2)}
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.white }}>{p.base}/{p.quote}</div>
                <div style={{ fontSize: 11, color: T.gray1, fontFamily: T.font }}>{fmtPrice(p.price, p.precision)}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: p.vol >= 0 ? T.green : T.red }}>{fmtPct(p.vol)}</div>
          </button>
        ))}
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ROOT — TRADING TERMINAL
═══════════════════════════════════════════════════════════════════════ */
const INTERVALS = ["1m", "5m", "15m", "1H", "4H"];

export default function Mining({ user, onAccountChange }) {
  const [pair,       setPair]       = useState(PAIRS[0]);
  const [orders,     setOrders]     = useState([]);
  const [showOrder,  setShowOrder]  = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [showPairs,  setShowPairs]  = useState(false);
  const [activeTab,  setActiveTab]  = useState("chart");
  const [interval,   setInterval_]  = useState("1m");
  const [navTab,     setNavTab]     = useState("trade");

  const syncTimer   = useRef(null);
  const market      = useMarket(pair);
  const priceDir    = market.price >= market.prevPrice ? "up" : "down";
  const priceFlash  = useFlash(market.price);

  /* ── Single source of truth: account ── */
  const { balance, totalProfit, debitBalance, creditProfit } = useAccount(user, onAccountChange);

  /* ── Persist orders to Supabase ── */
  const persistOrders = useCallback((next) => {
    if (!user?.email) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      await supabase
        .from("vault_orders")
        .upsert(next.map((o) => ({ ...o, email: user.email })), { onConflict: "id" });
    }, SUPABASE_DEBOUNCE);
  }, [user]);

  /* ── Load persisted orders on mount ── */
  useEffect(() => {
    if (!user?.email) return;
    (async () => {
      const { data } = await supabase
        .from("vault_orders")
        .select("*")
        .eq("email", user.email)
        .order("createdAt", { ascending: false })
        .limit(50);
      if (data?.length) setOrders(data);
    })();
  }, [user?.email]);

  /* ── Market fill simulation + settlement (idempotent via `settled` flag) ── */
  useEffect(() => {
    if (!orders.length) return;
    setOrders((prev) => {
      let changed = false;
      const next = prev.map((o) => {
        // Only process open/partial, skip already settled/cancelled
        if (o.status !== "open" && o.status !== "partial") return o;

        const mkt = market.price;
        let updated = null;

        if (o.type === "market" && o.status === "open") {
          updated = { ...o, filled: o.amount, status: "filled" };
        } else if (o.type === "limit" && mkt <= o.price) {
          const fillPct  = 0.3 + Math.random() * 0.7;
          const newFilled = Math.min(o.amount, (o.filled || 0) + o.amount * fillPct * 0.25);
          const status    = newFilled >= o.amount * 0.999 ? "filled" : "partial";
          updated = { ...o, filled: newFilled, status };
        }

        if (updated && updated.status === "filled" && !o.settled) {
          // Calculate simulated profit: 0.1% to 2% gain on the total
          const profitPct = 0.001 + Math.random() * 0.019;
          const profit    = updated.total * profitPct;
          const settled   = { ...updated, settled: true, status: "settled", profit };
          changed = true;
          // Credit profit to account — this fires once per order (settled flag prevents re-run)
          creditProfit(profit);
          // Notify dashboard
          onAccountChange?.({ activePositions: prev.filter(x => x.status === "open" || x.status === "partial").length - 1 });
          return settled;
        }

        if (updated) { changed = true; return updated; }
        return o;
      });

      if (changed) { persistOrders(next); return next; }
      return prev;
    });
  }, [market.tick]);

  /* ── Place order: debit balance immediately ── */
  function handlePlaceOrder(order) {
    const cost = order.total + order.fee;
    debitBalance(cost);
    setOrders((prev) => {
      const next = [order, ...prev];
      persistOrders(next);
      // Notify dashboard: active positions count
      const openCount = next.filter(o => o.status === "open" || o.status === "partial").length;
      onAccountChange?.({ activePositions: openCount });
      return next;
    });
  }

  /* ── Cancel order ── */
  function handleCancelOrder(id) {
    setOrders((prev) => {
      const next = prev.map((o) => o.id === id ? { ...o, status: "cancelled" } : o);
      persistOrders(next);
      const openCount = next.filter(o => o.status === "open" || o.status === "partial").length;
      onAccountChange?.({ activePositions: openCount });
      return next;
    });
  }

  const openCount = useMemo(() => orders.filter((o) => o.status === "open" || o.status === "partial").length, [orders]);

  /* ═══════════════════════════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════════════════════════ */
  return (
    <div style={{
      minHeight: "100dvh", display: "flex", flexDirection: "column",
      background: T.bg0, fontFamily: T.sans, overflow: "hidden",
      position: "relative", maxWidth: 480, margin: "0 auto",
    }}>

      {/* ── TOP NAV TABS ── */}
      <div style={{ display: "flex", gap: 20, padding: "12px 16px 0", borderBottom: `1px solid ${T.border}`, background: T.bg1, flexShrink: 0 }}>
        {["Convert", "Spot", "Futures", "Options"].map((t) => (
          <button key={t}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "0 0 10px", fontSize: 13, fontWeight: t === "Spot" ? 700 : 500, color: t === "Spot" ? T.white : T.gray2, borderBottom: t === "Spot" ? `2px solid ${T.gold}` : "2px solid transparent", WebkitTapHighlightColor: "transparent" }}>
            {t}
          </button>
        ))}
        <div style={{ flex: 1 }} />
        <button style={{ background: "none", border: "none", cursor: "pointer", color: T.gray1, padding: "0 0 10px", WebkitTapHighlightColor: "transparent" }}>
          <Settings2 size={16} />
        </button>
      </div>

      {/* ── HEADER: Pair + Price ── */}
      <div style={{ background: T.bg1, padding: "10px 16px", borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <button onClick={() => setShowPairs(true)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center", gap: 6, WebkitTapHighlightColor: "transparent" }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: T.white }}>{pair.base}/{pair.quote}</span>
              <ChevronDown size={14} color={T.gray1} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
              <span style={{ fontSize: 22, fontWeight: 700, fontFamily: T.font, color: priceFlash === "up" ? T.green2 : priceFlash === "down" ? T.red2 : (priceDir === "up" ? T.green : T.red), transition: "color 0.25s" }}>
                {fmtPrice(market.price, pair.precision)}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, color: market.vol24 >= 0 ? T.green : T.red, background: market.vol24 >= 0 ? T.greenDim : T.redDim, padding: "2px 7px", borderRadius: 4 }}>
                {fmtPct(market.vol24)}
              </span>
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <MiniChart candles={market.candles} color={market.vol24 >= 0 ? T.green : T.red} />
            <button style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: T.gray1, display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, WebkitTapHighlightColor: "transparent" }}>
              <BarChart2 size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        {/* View toggle */}
        <div style={{ display: "flex", padding: "0 16px", gap: 16, background: T.bg1, borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          {[["chart", "Chart"], ["book", "Order Book"], ["trades", "Trades"]].map(([id, label]) => (
            <button key={id} onClick={() => setActiveTab(id)}
              style={{ background: "none", border: "none", cursor: "pointer", padding: "9px 0", fontSize: 12, fontWeight: activeTab === id ? 700 : 500, color: activeTab === id ? T.white : T.gray1, borderBottom: activeTab === id ? `2px solid ${T.gold}` : "2px solid transparent", WebkitTapHighlightColor: "transparent" }}>
              {label}
            </button>
          ))}
        </div>

        {/* Chart view */}
        {activeTab === "chart" && (
          <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", padding: "6px 12px", gap: 4, background: T.bg1, flexShrink: 0 }}>
              {INTERVALS.map((iv) => (
                <button key={iv} onClick={() => setInterval_(iv)}
                  style={{ padding: "4px 10px", borderRadius: 6, border: "none", background: interval === iv ? T.bg4 : "transparent", color: interval === iv ? T.white : T.gray2, fontSize: 11, fontWeight: 600, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}>
                  {iv}
                </button>
              ))}
            </div>
            <div style={{ background: T.bg1, padding: "0 8px 4px", flexShrink: 0 }}>
              <PriceChart candles={market.candles} pair={pair} />
            </div>
            <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
              <div style={{ flex: 1, padding: "10px 8px 10px 12px", borderRight: `1px solid ${T.border}`, overflow: "hidden" }}>
                <OrderBook book={market.book} price={market.price} prevPrice={market.prevPrice} pair={pair} />
              </div>
              <div style={{ flex: 1, padding: "10px 12px 10px 8px", overflow: "hidden" }}>
                <TradeFeed trades={market.trades} pair={pair} />
              </div>
            </div>
          </div>
        )}

        {activeTab === "book" && (
          <div style={{ flex: 1, overflow: "auto", padding: "10px 16px" }}>
            <OrderBook book={market.book} price={market.price} prevPrice={market.prevPrice} pair={pair} />
          </div>
        )}

        {activeTab === "trades" && (
          <div style={{ flex: 1, overflow: "auto", padding: "10px 16px" }}>
            <TradeFeed trades={market.trades} pair={pair} />
          </div>
        )}
      </div>

      {/* ── BOTTOM DOCK ── */}
      <div style={{ background: T.bg1, borderTop: `1px solid ${T.border}`, flexShrink: 0 }}>
        <div style={{ display: "flex", padding: "0 16px", gap: 20, borderBottom: `1px solid ${T.border}` }}>
          <button onClick={() => setShowOrders(true)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 0", fontSize: 12, fontWeight: 700, color: T.white, borderBottom: `2px solid ${T.gold}`, display: "flex", alignItems: "center", gap: 6, WebkitTapHighlightColor: "transparent" }}>
            Open Orders
            {openCount > 0 && (
              <span style={{ background: T.gold, color: "#000", fontSize: 9, fontWeight: 700, borderRadius: 10, padding: "1px 6px" }}>{openCount}</span>
            )}
          </button>
          <button onClick={() => setShowOrders(true)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 0", fontSize: 12, color: T.gray1, borderBottom: "2px solid transparent", WebkitTapHighlightColor: "transparent" }}>
            History
          </button>
        </div>

        <div style={{ padding: "10px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          {/* Available balance */}
          <div>
            <div style={{ fontSize: 10, color: T.gray2, fontFamily: T.font, marginBottom: 2 }}>Available</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.white, fontFamily: T.font }}>
              {fmtPrice(balance, 2)} <span style={{ color: T.gray1 }}>USDT</span>
            </div>
          </div>
          {/* Profit */}
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: T.gray2, fontFamily: T.font, marginBottom: 2 }}>Total Profit</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: totalProfit >= 0 ? T.green : T.red, fontFamily: T.font }}>
              {totalProfit >= 0 ? "+" : ""}{fmtPrice(totalProfit, 2)} <span style={{ color: T.gray1 }}>USDT</span>
            </div>
          </div>

          {/* PLACE ORDER */}
          <button onClick={() => setShowOrder(true)}
            style={{ flex: 1, maxWidth: 200, padding: "14px 0", borderRadius: 10, border: "none", background: `linear-gradient(90deg, ${T.green} 0%, #00A060 100%)`, color: "#000", fontSize: 14, fontWeight: 700, letterSpacing: "0.06em", cursor: "pointer", boxShadow: `0 4px 18px ${T.green}44`, WebkitTapHighlightColor: "transparent", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Zap size={15} fill="#000" color="#000" />
            PLACE ORDER
          </button>
        </div>
      </div>

      {/* ── BOTTOM NAV ── */}
      <div style={{ display: "flex", background: T.bg1, borderTop: `1px solid ${T.border}`, flexShrink: 0, paddingBottom: "env(safe-area-inset-bottom, 8px)" }}>
        {[
          { id: "home",    label: "Home",    Icon: Home },
          { id: "markets", label: "Markets", Icon: LineChart },
          { id: "trade",   label: "Trade",   Icon: Zap },
          { id: "futures", label: "Futures", Icon: TrendingUp },
          { id: "assets",  label: "Assets",  Icon: Wallet },
        ].map(({ id, label, Icon }) => {
          const active = navTab === id;
          return (
            <button key={id} onClick={() => setNavTab(id)}
              style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "8px 0 10px", background: "none", border: "none", cursor: "pointer", WebkitTapHighlightColor: "transparent", position: "relative" }}>
              <Icon size={20} color={active ? T.gold : T.gray2} />
              <span style={{ fontSize: 9, fontWeight: active ? 700 : 500, color: active ? T.gold : T.gray2, letterSpacing: "0.04em" }}>{label}</span>
              {active && <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 20, height: 2, borderRadius: 1, background: T.gold }} />}
            </button>
          );
        })}
      </div>

      {/* ── MODALS ── */}
      <AnimatePresence>
        {showOrder && (
          <PlaceOrderModal key="place-order" pair={pair} currentPrice={market.price} balance={balance}
            onClose={() => setShowOrder(false)} onSubmit={handlePlaceOrder} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showOrders && (
          <OrdersPanel key="orders-panel" orders={orders} onCancel={handleCancelOrder} onClose={() => setShowOrders(false)} />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showPairs && (
          <PairModal key="pair-modal" pairs={PAIRS} current={pair} onSelect={setPair} onClose={() => setShowPairs(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
