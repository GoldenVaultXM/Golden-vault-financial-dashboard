/**
 * Mining.jsx  →  GoldenVaultXM Live Spot Trading Terminal
 *
 * ┌─ Architecture ────────────────────────────────────────────────────────┐
 * │  MarketEngine  – singleton simulation running in a ref, never causes  │
 * │                  full re-renders; pushes snapshots via callbacks.      │
 * │  useMarket()   – single hook that owns all market state, exposes      │
 * │                  stable selectors to child components.                 │
 * │  Supabase      – persists user orders only; no realtime subscription  │
 * │                  (avoids poll loops).                                  │
 * │  All intervals cleaned up on unmount.                                 │
 * └───────────────────────────────────────────────────────────────────────┘
 *
 * Props
 *   user  – { email: string } | null
 */

import {
  useState, useEffect, useRef, useCallback, useMemo, memo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "./supabaseClient";
import {
  ChevronDown, X, Settings2, BarChart2, RefreshCw,
  TrendingUp, TrendingDown, Clock, CheckCircle2, XCircle,
  ChevronRight, Home, LineChart, Zap, Wallet, LayoutGrid,
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════
   DESIGN TOKENS
═══════════════════════════════════════════════════════════════════════ */
const T = {
  bg0:     "#090C10",   // deepest void
  bg1:     "#0D1117",   // base surface
  bg2:     "#131920",   // card surface
  bg3:     "#1A2230",   // elevated card
  bg4:     "#212C3D",   // input / hover
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
  { base: "AVAX","quote": "USDT",price: 38.92,   vol: 2.18,  precision: 3 },
];

const SUPABASE_DEBOUNCE = 1500;
const CANDLE_LIMIT      = 60;
const BOOK_LEVELS       = 8;
const TRADE_LIMIT       = 20;

/* ═══════════════════════════════════════════════════════════════════════
   MARKET SIMULATION ENGINE
   Stochastic price model: mean-reverting momentum with periodic shocks
═══════════════════════════════════════════════════════════════════════ */
function createMarketEngine(initPair) {
  let price       = initPair.price;
  let momentum    = 0;
  let volatility  = 0.0003;
  let vol24Change = initPair.vol;
  const openPrice = price * (1 - vol24Change / 100);

  function nextPrice() {
    // Mean-reverting momentum with random drift
    const shock     = (Math.random() - 0.5) * 2;
    const volShock  = Math.random() < 0.04 ? (Math.random() - 0.5) * 6 : 1;
    momentum        = momentum * 0.88 + shock * volatility * volShock;
    // Occasional volatility spike
    if (Math.random() < 0.02) volatility = 0.0003 + Math.random() * 0.0008;
    else volatility = volatility * 0.97 + 0.0003 * 0.03;
    price += price * momentum;
    price  = Math.max(price * 0.92, price); // no crash
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
    const o = prev ? prev.c : mid;
    const move = (Math.random() - 0.48) * mid * 0.002;
    const c = o + move;
    const hi = Math.max(o, c) + Math.random() * mid * 0.0008;
    const lo = Math.min(o, c) - Math.random() * mid * 0.0008;
    const vol = Math.random() * 15 + 2;
    return { o, h: hi, l: lo, c, vol, t: Date.now(), bullish: c >= o };
  }

  function getVol24() {
    return ((price - openPrice) / openPrice) * 100;
  }

  return { nextPrice, buildBook, buildTrade, buildCandle, getVol24, getPrice: () => price };
}

/* ═══════════════════════════════════════════════════════════════════════
   useMarket – all market state in one place
═══════════════════════════════════════════════════════════════════════ */
function useMarket(pair) {
  const engineRef = useRef(null);

  const [snap, setSnap] = useState(() => {
    const eng = createMarketEngine(pair);
    engineRef.current = eng;
    const mid   = eng.getPrice();
    const book  = eng.buildBook(mid);
    const candles = Array.from({ length: CANDLE_LIMIT }, (_, i) => {
      const fake = {
        o: pair.price * (0.98 + Math.random() * 0.04),
        c: pair.price * (0.98 + Math.random() * 0.04),
      };
      fake.c = fake.o + (Math.random() - 0.48) * pair.price * 0.002;
      fake.h = Math.max(fake.o, fake.c) + Math.random() * pair.price * 0.001;
      fake.l = Math.min(fake.o, fake.c) - Math.random() * pair.price * 0.001;
      fake.vol = Math.random() * 12 + 1;
      fake.bullish = fake.c >= fake.o;
      fake.t = Date.now() - (CANDLE_LIMIT - i) * 60000;
      return fake;
    });
    return {
      price:     mid,
      prevPrice: mid,
      vol24:     pair.vol,
      book,
      trades:    [],
      candles,
      tick:      0,
    };
  });

  // Reset engine when pair changes
  useEffect(() => {
    const eng = createMarketEngine(pair);
    engineRef.current = eng;
    const mid   = eng.getPrice();
    const book  = eng.buildBook(mid);
    setSnap({
      price: mid, prevPrice: mid, vol24: pair.vol,
      book, trades: [], candles: [], tick: 0,
    });
  }, [pair.base]);

  useEffect(() => {
    const eng = engineRef.current;
    // Price + book: 400ms
    const priceId = setInterval(() => {
      const prev = eng.getPrice();
      const mid  = eng.nextPrice();
      const book = eng.buildBook(mid);
      const vol24 = eng.getVol24();
      setSnap((s) => ({
        ...s,
        price:     mid,
        prevPrice: prev,
        vol24,
        book,
        tick:      s.tick + 1,
      }));
    }, 400);

    // Trades: 600-1400ms random
    let tradeTimeout;
    function scheduleTrade() {
      tradeTimeout = setTimeout(() => {
        const mid   = eng.getPrice();
        const trade = eng.buildTrade(mid);
        setSnap((s) => ({
          ...s,
          trades: [trade, ...s.trades].slice(0, TRADE_LIMIT),
        }));
        scheduleTrade();
      }, 600 + Math.random() * 800);
    }
    scheduleTrade();

    // Candles: every 8s add a candle
    const candleId = setInterval(() => {
      const mid = eng.getPrice();
      setSnap((s) => {
        const prev = s.candles[s.candles.length - 1];
        const c    = eng.buildCandle(prev, mid);
        return { ...s, candles: [...s.candles.slice(-(CANDLE_LIMIT - 1)), c] };
      });
    }, 8000);

    return () => {
      clearInterval(priceId);
      clearTimeout(tradeTimeout);
      clearInterval(candleId);
    };
  }, [pair.base]);

  return snap;
}

/* ═══════════════════════════════════════════════════════════════════════
   UTILITY HELPERS
═══════════════════════════════════════════════════════════════════════ */
function fmtPrice(n, prec = 2) {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: prec,
    maximumFractionDigits: prec,
  });
}
function fmtAmt(n) {
  return n.toFixed(3);
}
function fmtPct(n) {
  return (n >= 0 ? "+" : "") + n.toFixed(2) + "%";
}
function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

/* ═══════════════════════════════════════════════════════════════════════
   FLASH HOOK – triggers a color flash when value changes direction
═══════════════════════════════════════════════════════════════════════ */
function useFlash(value) {
  const prev  = useRef(value);
  const [dir, setDir] = useState(null); // "up" | "down" | null
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
   MICRO CHART (SVG sparkline for the header)
═══════════════════════════════════════════════════════════════════════ */
const MiniChart = memo(function MiniChart({ candles, color }) {
  if (!candles || candles.length < 2) return null;
  const prices = candles.map((c) => c.c);
  const min    = Math.min(...prices);
  const max    = Math.max(...prices);
  const range  = max - min || 1;
  const W = 80, H = 28;
  const pts = prices.map((p, i) => {
    const x = (i / (prices.length - 1)) * W;
    const y = H - ((p - min) / range) * H;
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: "block" }}>
      <polyline
        points={pts}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinejoin="round"
        strokeLinecap="round"
        opacity="0.85"
      />
    </svg>
  );
});

/* ═══════════════════════════════════════════════════════════════════════
   LIVE TICK HEATMAP
   28-cell rolling grid (4 rows × 7 cols).
   Each cell = one price tick. Updates every second from the live price.
   Colour intensity scales with the size of the move.
   The "current" cell is the rightmost-bottom one and pulses.
═══════════════════════════════════════════════════════════════════════ */
const GRID_COLS = 7;
const GRID_ROWS = 4;
const GRID_SIZE = GRID_COLS * GRID_ROWS; // 28 cells

const PriceChart = memo(function PriceChart({ candles, pair }) {
  // ticks: rolling array of { price, pl, pct, trades, key }
  const [ticks, setTicks] = useState(() => {
    // Seed from existing candles so grid isn't empty on first render
    const seed = candles.slice(-GRID_SIZE).map((c, i) => {
      const pl  = (c.c - c.o);
      const pct = (pl / c.o) * 100;
      return {
        price:  c.c,
        pl:     pl * pair.price * 0.012,
        pct,
        trades: 1 + (i % 3),
        key:    i,
      };
    });
    // Pad to GRID_SIZE if needed
    while (seed.length < GRID_SIZE) {
      seed.unshift({ price: pair.price, pl: 0, pct: 0, trades: 0, key: -(seed.length) });
    }
    return seed.slice(-GRID_SIZE);
  });

  const prevPriceRef = useRef(pair.price);
  const keyRef       = useRef(GRID_SIZE);
  const tradesRef    = useRef(1);

  // Drive from candles prop — every time candles updates (every ~8s)
  // push a new tick. Between candle updates we push every 1s via interval.
  useEffect(() => {
    const id = setInterval(() => {
      const lastCandle = candles[candles.length - 1];
      if (!lastCandle) return;
      const price  = lastCandle.c;
      const prev   = prevPriceRef.current;
      const rawPl  = (price - prev);
      const pct    = prev > 0 ? (rawPl / prev) * 100 : 0;
      // Scale to a realistic dollar P/L for display
      const pl     = pct * pair.price * (0.8 + Math.random() * 0.6);
      tradesRef.current = 1 + Math.floor(Math.random() * 3);
      prevPriceRef.current = price;
      keyRef.current += 1;

      const newTick = {
        price,
        pl,
        pct,
        trades: tradesRef.current,
        key:    keyRef.current,
      };

      setTicks((prev) => [...prev.slice(-(GRID_SIZE - 1)), newTick]);
    }, 1000);
    return () => clearInterval(id);
  }, [candles, pair.price]);

  function cellBg(tick, isLatest) {
    if (!tick || tick.trades === 0) return "#0c1016";
    if (isLatest) return "#1a2235"; // current cell — neutral highlight
    const intensity = Math.min(1, Math.abs(tick.pct) / 0.15);
    if (tick.pl >= 0) {
      const g = Math.round(55 + intensity * 80);
      return `rgba(0,${g + 30},${g - 10},0.65)`;
    } else {
      const r = Math.round(90 + intensity * 80);
      return `rgba(${r},18,36,0.70)`;
    }
  }

  function cellBorder(tick, isLatest) {
    if (isLatest) return `1.5px solid ${T.gold}99`;
    if (!tick || tick.trades === 0) return `1px solid #12181f`;
    return `1px solid ${tick.pl >= 0 ? T.green + "55" : T.red + "44"}`;
  }

  const LABELS = ["S1","S2","S3","S4","S5","S6","S7"];

  return (
    <div style={{ width: "100%", padding: "10px 12px 8px", boxSizing: "border-box" }}>

      {/* Header row */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: 8,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: T.gray1, fontFamily: T.sans, letterSpacing: "0.04em" }}>
          LIVE TICK GRID · {pair.base}/{pair.quote}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <motion.div
            animate={{ opacity: [1, 0.2, 1] }}
            transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            style={{ width: 6, height: 6, borderRadius: "50%", background: T.green }}
          />
          <span style={{ fontSize: 9, color: T.green, fontFamily: T.font, fontWeight: 700, letterSpacing: "0.1em" }}>
            LIVE
          </span>
        </div>
      </div>

      {/* Column headers */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
        gap: 3, marginBottom: 3,
      }}>
        {LABELS.map((l, i) => (
          <div key={i} style={{
            textAlign: "center", fontSize: 9, fontWeight: 600,
            color: T.gray3, fontFamily: T.font,
          }}>
            {l}
          </div>
        ))}
      </div>

      {/* Grid */}
      <div style={{
        display: "grid",
        gridTemplateColumns: `repeat(${GRID_COLS}, 1fr)`,
        gridTemplateRows: `repeat(${GRID_ROWS}, 1fr)`,
        gap: 3,
      }}>
        {ticks.map((tick, i) => {
          const isLatest = i === ticks.length - 1;
          const hasData  = tick && tick.trades > 0;
          return (
            <motion.div
              key={tick.key}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              style={{
                borderRadius: 7,
                background: cellBg(tick, isLatest),
                border: cellBorder(tick, isLatest),
                padding: "5px 5px 4px",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                minHeight: 54,
                position: "relative",
                overflow: "hidden",
                boxShadow: isLatest ? `0 0 10px ${T.gold}33` : "none",
              }}
            >
              {/* Tick index label */}
              <div style={{
                fontSize: 8, fontWeight: 700,
                color: isLatest ? T.gold : T.gray3,
                fontFamily: T.font, lineHeight: 1,
              }}>
                {isLatest ? "NOW" : `T-${ticks.length - 1 - i}`}
              </div>

              {/* P/L */}
              {hasData && (
                <div>
                  <div style={{
                    fontSize: 10, fontWeight: 800,
                    color: tick.pl >= 0 ? T.green2 : T.red2,
                    fontFamily: T.font, lineHeight: 1.2,
                    letterSpacing: "-0.01em",
                  }}>
                    {tick.pl >= 0 ? "+" : "-"}${Math.abs(tick.pl).toFixed(0)}
                  </div>
                  <div style={{
                    fontSize: 8, color: T.gray2,
                    fontFamily: T.font, marginTop: 1,
                  }}>
                    {tick.trades} trade{tick.trades !== 1 ? "s" : ""}
                  </div>
                </div>
              )}

              {/* Pulse ring on latest cell */}
              {isLatest && (
                <motion.div
                  animate={{ opacity: [0.6, 0, 0.6], scale: [1, 1.4, 1] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "easeInOut" }}
                  style={{
                    position: "absolute", inset: 0,
                    borderRadius: 7,
                    border: `1px solid ${T.gold}66`,
                    pointerEvents: "none",
                  }}
                />
              )}
            </motion.div>
          );
        })}
      </div>

      {/* Footer: price + pct of latest tick */}
      {ticks.length > 0 && ticks[ticks.length - 1].trades > 0 && (
        <div style={{
          display: "flex", justifyContent: "space-between",
          alignItems: "center", marginTop: 8, padding: "0 2px",
        }}>
          <span style={{ fontSize: 10, color: T.gray2, fontFamily: T.font }}>
            Last price
          </span>
          <span style={{
            fontSize: 11, fontWeight: 700, fontFamily: T.font,
            color: ticks[ticks.length - 1].pl >= 0 ? T.green : T.red,
          }}>
            {fmtPrice(ticks[ticks.length - 1].price, pair.precision)}
            {"  "}
            <span style={{ fontSize: 9, opacity: 0.8 }}>
              {ticks[ticks.length - 1].pct >= 0 ? "+" : ""}
              {ticks[ticks.length - 1].pct.toFixed(3)}%
            </span>
          </span>
        </div>
      )}
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════════════
   ORDER BOOK ROW
═══════════════════════════════════════════════════════════════════════ */
const BookRow = memo(function BookRow({ level, side, maxAmt, pair }) {
  const pct   = (level.amount / maxAmt) * 100;
  const color = side === "sell" ? T.red : T.green;
  const bg    = side === "sell" ? T.redDim : T.greenDim;

  return (
    <div style={{ position: "relative", display: "flex", justifyContent: "space-between", padding: "2px 0", fontSize: 11, fontFamily: T.font }}>
      {/* Depth bar */}
      <div style={{
        position: "absolute",
        top: 0, bottom: 0,
        [side === "sell" ? "right" : "left"]: 0,
        width: `${pct}%`,
        background: bg,
        transition: "width 0.3s ease",
      }} />
      <span style={{ color, position: "relative", zIndex: 1, minWidth: 80, textAlign: "left" }}>
        {fmtPrice(level.price, pair.precision)}
      </span>
      <span style={{ color: T.gray1, position: "relative", zIndex: 1, textAlign: "right" }}>
        {fmtAmt(level.amount)}
      </span>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════════════
   ORDER BOOK PANEL
═══════════════════════════════════════════════════════════════════════ */
const OrderBook = memo(function OrderBook({ book, price, prevPrice, pair }) {
  const dir   = price >= prevPrice ? "up" : "down";
  const flash = useFlash(price);
  const maxAmt = useMemo(() => {
    const all = [...(book.sells || []), ...(book.buys || [])].map((l) => l.amount);
    return Math.max(...all, 0.01);
  }, [book]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
      {/* Headers */}
      <div style={{ display: "flex", justifyContent: "space-between", padding: "0 0 4px", fontSize: 10, color: T.gray2, fontFamily: T.font }}>
        <span>Price({pair.quote})</span>
        <span>Amt({pair.base})</span>
      </div>

      {/* Sells */}
      <div style={{ display: "flex", flexDirection: "column-reverse", gap: 1 }}>
        {(book.sells || []).map((l, i) => (
          <BookRow key={i} level={l} side="sell" maxAmt={maxAmt} pair={pair} />
        ))}
      </div>

      {/* Mid price */}
      <div style={{
        padding: "6px 0",
        borderTop: `1px solid ${T.border}`,
        borderBottom: `1px solid ${T.border}`,
        margin: "3px 0",
        textAlign: "center",
      }}>
        <span style={{
          fontSize: 15,
          fontWeight: 700,
          fontFamily: T.font,
          color: flash === "up" ? T.green2 : flash === "down" ? T.red2 : (dir === "up" ? T.green : T.red),
          transition: "color 0.25s",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 4,
        }}>
          {fmtPrice(price, pair.precision)}
          {dir === "up"
            ? <TrendingUp size={12} color={T.green} />
            : <TrendingDown size={12} color={T.red} />}
        </span>
      </div>

      {/* Buys */}
      <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
        {(book.buys || []).map((l, i) => (
          <BookRow key={i} level={l} side="buy" maxAmt={maxAmt} pair={pair} />
        ))}
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════════════
   TRADE FEED
═══════════════════════════════════════════════════════════════════════ */
const TradeFeed = memo(function TradeFeed({ trades, pair }) {
  return (
    <div style={{ flex: 1, overflow: "hidden" }}>
      <div style={{ fontSize: 10, color: T.gray2, fontFamily: T.font, display: "flex", justifyContent: "space-between", padding: "0 0 4px" }}>
        <span>Price({pair.quote})</span>
        <span>Amount({pair.base})</span>
        <span>Time</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        <AnimatePresence initial={false}>
          {trades.slice(0, 16).map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: 11,
                fontFamily: T.font,
                padding: "2px 0",
                color: t.side === "buy" ? T.green : T.red,
              }}
            >
              <span style={{ minWidth: 80 }}>{fmtPrice(t.price, pair.precision)}</span>
              <span style={{ color: T.gray1 }}>{fmtAmt(t.amount)}</span>
              <span style={{ color: T.gray2 }}>{fmtTime(t.time)}</span>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════════════
   PLACE ORDER MODAL
═══════════════════════════════════════════════════════════════════════ */
function PlaceOrderModal({ pair, currentPrice, onClose, onSubmit, balance }) {
  const [orderType,  setOrderType]  = useState("limit");
  const [priceInput, setPriceInput] = useState(fmtPrice(currentPrice, pair.precision));
  const [amtInput,   setAmtInput]   = useState("");
  const [error,      setError]      = useState("");
  const [submitted,  setSubmitted]  = useState(false);

  const execPrice = orderType === "market" ? currentPrice : parseFloat(priceInput.replace(/,/g, "")) || 0;
  const amount    = parseFloat(amtInput) || 0;
  const total     = execPrice * amount;
  const fee       = total * 0.001;
  const maxAmt    = balance / (execPrice || 1);

  function handleConfirm() {
    setError("");
    if (amount <= 0)         return setError("Enter a valid amount.");
    if (total > balance)     return setError("Insufficient balance.");
    if (orderType === "limit" && execPrice <= 0) return setError("Enter a valid price.");

    setSubmitted(true);
    setTimeout(() => {
      onSubmit({
        pair:      `${pair.base}/${pair.quote}`,
        type:      orderType,
        price:     execPrice,
        amount,
        total,
        fee,
        status:    "open",
        filled:    0,
        createdAt: Date.now(),
        id:        "ORD-" + Date.now().toString(36).toUpperCase(),
      });
      onClose();
    }, 600);
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(9,12,16,0.90)",
        backdropFilter: "blur(10px)",
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        // Push entire modal above the app's bottom nav bar (≈60px) + safe area
        paddingBottom: "calc(62px + env(safe-area-inset-bottom, 0px))",
      }}
      onPointerDown={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0,  opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480,
          background: T.bg2,
          borderRadius: 20,
          border: `1px solid ${T.border2}`,
          position: "relative",
          maxHeight: "78vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Scrollable content */}
        <div style={{ overflowY: "auto", flex: 1, padding: "20px 20px 0", WebkitOverflowScrolling: "touch" }}>

        {/* Handle */}
        <div style={{ width: 36, height: 3, borderRadius: 2, background: T.border2, margin: "0 auto 20px" }} />

        {/* Title */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.white }}>{pair.base}/{pair.quote}</div>
            <div style={{ fontSize: 12, color: T.gray1, marginTop: 2 }}>Place Order</div>
          </div>
          <button onClick={onClose} style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.gray1, WebkitTapHighlightColor: "transparent" }}>
            <X size={14} />
          </button>
        </div>

        {/* Order type toggle */}
        <div style={{ display: "flex", background: T.bg3, borderRadius: 8, padding: 3, marginBottom: 16, border: `1px solid ${T.border}` }}>
          {["limit", "market"].map((t) => (
            <button
              key={t}
              onClick={() => setOrderType(t)}
              style={{
                flex: 1, padding: "8px", borderRadius: 6, border: "none",
                background: orderType === t ? T.bg4 : "transparent",
                color: orderType === t ? T.white : T.gray1,
                fontSize: 12, fontWeight: 600, cursor: "pointer", textTransform: "uppercase",
                letterSpacing: "0.06em", transition: "all 0.15s",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Price input */}
        {orderType === "limit" && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: T.gray2, marginBottom: 5, fontFamily: T.font }}>Price ({pair.quote})</div>
            <div style={{ display: "flex", background: T.bg3, border: `1px solid ${T.border2}`, borderRadius: 8, overflow: "hidden" }}>
              <input
                type="number"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                placeholder={fmtPrice(currentPrice, pair.precision)}
                style={{
                  flex: 1, background: "transparent", border: "none", outline: "none",
                  padding: "12px 14px", fontSize: 14, fontFamily: T.font,
                  color: T.white, fontWeight: 600,
                }}
              />
              <button
                onClick={() => setPriceInput(fmtPrice(currentPrice, pair.precision))}
                style={{ background: T.bg4, border: "none", padding: "0 12px", color: T.gold, fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
              >
                MKT
              </button>
            </div>
          </div>
        )}
        {orderType === "market" && (
          <div style={{ marginBottom: 12, padding: "10px 14px", background: T.bg3, borderRadius: 8, border: `1px solid ${T.border}` }}>
            <div style={{ fontSize: 11, color: T.gray2, marginBottom: 3, fontFamily: T.font }}>Execution Price</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: T.green, fontFamily: T.font }}>≈ {fmtPrice(currentPrice, pair.precision)}</div>
          </div>
        )}

        {/* Amount input */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 11, color: T.gray2, marginBottom: 5, fontFamily: T.font }}>Amount ({pair.base})</div>
          <input
            type="number"
            value={amtInput}
            onChange={(e) => setAmtInput(e.target.value)}
            placeholder="0.000"
            style={{
              width: "100%", background: T.bg3, border: `1px solid ${T.border2}`,
              borderRadius: 8, outline: "none", padding: "12px 14px",
              fontSize: 14, fontFamily: T.font, color: T.white,
              fontWeight: 600, boxSizing: "border-box",
            }}
          />
          {/* Quick fill buttons */}
          <div style={{ display: "flex", gap: 6, marginTop: 7 }}>
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                onClick={() => setAmtInput(((maxAmt * pct) / 100).toFixed(4))}
                style={{
                  flex: 1, padding: "5px 0", borderRadius: 6,
                  border: `1px solid ${T.border2}`, background: T.bg3,
                  color: T.gray1, fontSize: 10, fontWeight: 600, cursor: "pointer",
                  WebkitTapHighlightColor: "transparent",
                }}
              >
                {pct}%
              </button>
            ))}
          </div>
        </div>

        {/* Summary */}
        <div style={{ background: T.bg3, borderRadius: 8, padding: "12px 14px", marginBottom: 16, border: `1px solid ${T.border}`, display: "flex", flexDirection: "column", gap: 7 }}>
          {[
            ["Total (USDT)", total > 0 ? fmtPrice(total, 2) : "--"],
            ["Available",    fmtPrice(balance, 2) + " " + pair.quote],
            ["Est. Fee",     fee > 0 ? fmtPrice(fee, 4) + " " + pair.quote : "--"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontFamily: T.font }}>
              <span style={{ color: T.gray1 }}>{k}</span>
              <span style={{ color: T.white, fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>

        {error && (
          <div style={{ color: T.red, fontSize: 12, marginBottom: 10, textAlign: "center", fontWeight: 600 }}>{error}</div>
        )}

        </div>{/* end scrollable */}

        {/* ── STICKY CONFIRM BUTTON — always visible ── */}
        <div style={{
          padding: "14px 20px 18px",
          background: T.bg2,
          borderTop: `1px solid ${T.border}`,
          flexShrink: 0,
        }}>
          {error && (
            <div style={{ color: T.red, fontSize: 12, marginBottom: 10, textAlign: "center", fontWeight: 600 }}>{error}</div>
          )}
          <button
            onClick={handleConfirm}
            disabled={submitted || amount <= 0 || total > balance}
            style={{
              width: "100%", padding: "17px",
              borderRadius: 12, border: "none",
              background: submitted
                ? T.green + "88"
                : (amount <= 0 || total > balance)
                  ? T.bg4
                  : `linear-gradient(90deg, ${T.green} 0%, #00A060 100%)`,
              color: (amount <= 0 || total > balance) && !submitted ? T.gray2 : "#000",
              fontSize: 15, fontWeight: 800,
              letterSpacing: "0.06em",
              cursor: (submitted || amount <= 0 || total > balance) ? "default" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: (amount > 0 && total <= balance && !submitted) ? `0 4px 24px ${T.green}55` : "none",
              transition: "all 0.2s",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            {submitted
              ? <><CheckCircle2 size={18} /> Order Placed!</>
              : amount <= 0
                ? "Enter Amount to Continue"
                : total > balance
                  ? "Insufficient Balance"
                  : `CONFIRM ORDER · $${fmtPrice(total, 2)}`}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MY ORDERS PANEL
═══════════════════════════════════════════════════════════════════════ */
function OrdersPanel({ orders, onCancel, onClose }) {
  const [tab, setTab] = useState("open");
  const filtered = useMemo(() => {
    if (tab === "open")    return orders.filter((o) => o.status === "open" || o.status === "partial");
    if (tab === "history") return orders.filter((o) => o.status === "filled" || o.status === "cancelled");
    return orders;
  }, [orders, tab]);

  const statusColor = (s) => ({
    open:      T.gold,
    partial:   T.blue,
    filled:    T.green,
    cancelled: T.gray2,
  }[s] || T.gray1);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed", inset: 0, zIndex: 200,
        background: "rgba(9,12,16,0.94)",
        backdropFilter: "blur(10px)",
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        paddingBottom: "calc(62px + env(safe-area-inset-bottom, 0px))",
      }}
      onPointerDown={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0,  opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480,
          background: T.bg2,
          borderRadius: 20,
          border: `1px solid ${T.border2}`,
          padding: "20px 0 20px",
          maxHeight: "78vh",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "0 20px", marginBottom: 12 }}>
          <div style={{ width: 36, height: 3, borderRadius: 2, background: T.border2, margin: "0 auto 16px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.white }}>My Orders</div>
            <button onClick={onClose} style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.gray1, WebkitTapHighlightColor: "transparent" }}>
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", padding: "0 20px", gap: 20, borderBottom: `1px solid ${T.border}`, marginBottom: 0 }}>
          {[["open", "Open"], ["history", "History"], ["all", "All"]].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "8px 0 10px",
                fontSize: 13, fontWeight: tab === id ? 700 : 500,
                color: tab === id ? T.white : T.gray1,
                borderBottom: tab === id ? `2px solid ${T.gold}` : "2px solid transparent",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Scroll hint */}
        {filtered.length > 2 && (
          <div style={{ textAlign: "center", padding: "4px 0 0", fontSize: 10, color: T.gray3, letterSpacing: "0.08em" }}>
            ↕ SCROLL TO SEE ALL
          </div>
        )}

        {/* List */}
        <div style={{ overflowY: "auto", flex: 1, padding: "10px 20px 32px", WebkitOverflowScrolling: "touch" }}>
          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px 0", color: T.gray2, fontSize: 13 }}>No orders</div>
          ) : filtered.map((o) => (
            <div
              key={o.id}
              style={{
                background: T.bg3, borderRadius: 10, padding: "12px 14px",
                marginBottom: 8, border: `1px solid ${T.border}`,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: T.white }}>{o.pair}</div>
                  <div style={{ fontSize: 10, color: T.gray2, fontFamily: T.font, marginTop: 2 }}>
                    {o.type.toUpperCase()} · {o.id}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: statusColor(o.status), background: statusColor(o.status) + "18", padding: "3px 8px", borderRadius: 6, letterSpacing: "0.06em" }}>
                    {o.status.toUpperCase()}
                  </span>
                  {(o.status === "open" || o.status === "partial") && (
                    <button
                      onClick={() => onCancel(o.id)}
                      style={{ background: T.redDim, border: `1px solid ${T.red}44`, borderRadius: 6, padding: "3px 8px", cursor: "pointer", color: T.red, fontSize: 10, fontWeight: 700, WebkitTapHighlightColor: "transparent" }}
                    >
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
                  ["Time",   new Date(o.createdAt).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit" })],
                ].map(([k, v]) => (
                  <div key={k}>
                    <div style={{ fontSize: 9, color: T.gray2, fontFamily: T.font, marginBottom: 1 }}>{k}</div>
                    <div style={{ fontSize: 11, color: T.white, fontFamily: T.font, fontWeight: 600 }}>{v}</div>
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
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(9,12,16,0.94)", backdropFilter: "blur(10px)", display: "flex", alignItems: "flex-end", justifyContent: "center" }}
      onPointerDown={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }}
        animate={{ y: 0,  opacity: 1 }}
        exit={{ y: 60, opacity: 0 }}
        transition={{ type: "spring", stiffness: 320, damping: 28 }}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480,
          background: T.bg2, borderRadius: "20px 20px 0 0",
          border: `1px solid ${T.border2}`, borderBottom: "none",
          padding: "20px 0 40px",
        }}
      >
        <div style={{ width: 36, height: 3, borderRadius: 2, background: T.border2, margin: "0 auto 16px" }} />
        <div style={{ fontSize: 15, fontWeight: 700, color: T.white, padding: "0 20px", marginBottom: 14 }}>Select Pair</div>
        {pairs.map((p) => (
          <button
            key={p.base}
            onClick={() => { onSelect(p); onClose(); }}
            style={{
              width: "100%", background: p.base === current.base ? T.bg3 : "transparent",
              border: "none", padding: "13px 20px",
              display: "flex", alignItems: "center", justifyContent: "space-between",
              cursor: "pointer", WebkitTapHighlightColor: "transparent",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: T.bg4, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: T.gold }}>
                {p.base.slice(0, 2)}
              </div>
              <div style={{ textAlign: "left" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: T.white }}>{p.base}/{p.quote}</div>
                <div style={{ fontSize: 11, color: T.gray1, fontFamily: T.font }}>{fmtPrice(p.price, p.precision)}</div>
              </div>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: p.vol >= 0 ? T.green : T.red }}>
              {fmtPct(p.vol)}
            </div>
          </button>
        ))}
      </motion.div>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   INTERVAL SELECTOR (chart timeframes)
═══════════════════════════════════════════════════════════════════════ */
const INTERVALS = ["1m", "5m", "15m", "1H", "4H"];

/* ═══════════════════════════════════════════════════════════════════════
   PAPER TRADING CONSTANTS
   Completely isolated from real-money account state.
═══════════════════════════════════════════════════════════════════════ */
const PAPER_TABLE        = "vault_orders";        // reuses existing table
const PAPER_ACCOUNT      = "account_summary";     // reads/writes balance + profit
const MIN_SESSION_MS     = 30 * 60 * 1000;        // 30 minutes
const MAX_SESSION_MS     = 2  * 60 * 60 * 1000;  // 2 hours
const SETTLE_CHECK_MS    = 5000;                  // check every 5s

function randomDurationMs() {
  return MIN_SESSION_MS + Math.floor(Math.random() * (MAX_SESSION_MS - MIN_SESSION_MS));
}

/* ═══════════════════════════════════════════════════════════════════════
   ACTIVE POSITION CARD — shows live countdown + simulated value
═══════════════════════════════════════════════════════════════════════ */
function ActivePositionCard({ order, currentPrice }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const endTime    = Number(order.end_time);
  const startTime  = Number(order.created_at);
  const totalMs    = endTime - startTime;
  const elapsed    = Math.min(now - startTime, totalMs);
  const remaining  = Math.max(0, endTime - now);
  const progress   = Math.min(1, elapsed / totalMs);

  // Seed consistent multiplier (7x–10x) from order id
  const seed       = order.id ? order.id.charCodeAt(order.id.length - 1) / 255 : 0.5;
  const multiplier = 7 + seed * 3; // 7x–10x final target
  const invested   = Number(order.total);

  // Realistic price-like movement: oscillates up/down but is guaranteed
  // to reach multiplier by end. Uses sine waves + noise seeded from elapsed time.
  const t          = progress; // 0 → 1
  const trendLine  = t * (multiplier - 1); // core upward drift toward target
  // Oscillation amplitude shrinks as we approach end so it converges
  const amplitude  = (1 - t * 0.85) * 0.6;
  const noise1     = Math.sin(t * 18 + seed * 6) * amplitude;
  const noise2     = Math.sin(t * 31 + seed * 3) * amplitude * 0.4;
  const noise3     = Math.sin(t * 7  + seed * 9) * amplitude * 0.25;
  const totalGain  = Math.max(0, trendLine + noise1 + noise2 + noise3);
  const simValue   = invested * (1 + totalGain);
  const simPl      = simValue - invested;
  const plPct      = ((simValue - invested) / invested * 100).toFixed(2);
  const plColor    = simPl >= 0 ? T.green : T.red;

  function fmt2(n) { return Number(n).toFixed(2); }
  function fmtTime(ms) {
    const s = Math.floor(ms / 1000);
    const m = Math.floor(s / 60);
    const h = Math.floor(m / 60);
    if (h > 0) return `${h}h ${String(m % 60).padStart(2,"0")}m`;
    return `${String(m).padStart(2,"0")}m ${String(s % 60).padStart(2,"0")}s`;
  }

  return (
    <div style={{ background: T.bg3, borderRadius: 12, padding: "14px 16px", marginBottom: 10, border: `1px solid ${T.border2}` }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: T.white }}>{order.pair}</span>
          <span style={{ fontSize: 9, fontWeight: 700, color: T.gold, background: T.goldDim, borderRadius: 4, padding: "2px 6px", letterSpacing: "0.08em" }}>ACTIVE</span>
        </div>
        <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.4 }}
          style={{ width: 7, height: 7, borderRadius: "50%", background: T.green }} />
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 10 }}>
        {[
          ["INVESTED",      `$${fmt2(invested)}`],
          ["CURRENT VALUE", `$${fmt2(simValue)}`, plColor],
          ["PNL",           `${simPl >= 0 ? "+" : ""}${plPct}%`, plColor],
        ].map(([label, val, col]) => (
          <div key={label}>
            <div style={{ fontSize: 9, color: T.gray2, letterSpacing: "0.1em", marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 12, fontWeight: 700, color: col || T.white, fontVariantNumeric: "tabular-nums" }}>{val}</div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, borderRadius: 2, background: T.border, overflow: "hidden", marginBottom: 6 }}>
        <motion.div animate={{ width: `${Math.round(progress * 100)}%` }} transition={{ duration: 1 }}
          style={{ height: "100%", borderRadius: 2, background: `linear-gradient(90deg, ${T.gold}88, ${T.gold})` }} />
      </div>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: 10, color: T.gray2 }}>{Math.round(progress * 100)}% complete</span>
        <span style={{ fontSize: 10, color: plColor, fontFamily: T.font, fontWeight: 700 }}>
          {simPl >= 0 ? "+" : ""}{plPct}%
        </span>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   ROOT – TRADING TERMINAL
═══════════════════════════════════════════════════════════════════════ */
export default function Mining({ user }) {
  const [pair,       setPair]       = useState(PAIRS[0]);
  const [balance,    setBalance]    = useState(0);
  const [totalProfit,setTotalProfit]= useState(0);
  const [orders,     setOrders]     = useState([]);
  const [showOrder,  setShowOrder]  = useState(false);
  const [showOrders, setShowOrders] = useState(false);
  const [showPairs,  setShowPairs]  = useState(false);
  const [activeTab,  setActiveTab]  = useState("chart");
  const [interval,   setInterval_]  = useState("1m");
  const [showPositions, setShowPositions] = useState(false);

  const userIdRef  = useRef(null);
  const syncTimer  = useRef(null);
  const settleRef  = useRef(null);
  const balanceRef = useRef(0); // mirrors balance state — prevents stale closure on place order

  const market     = useMarket(pair);
  const priceDir   = market.price >= market.prevPrice ? "up" : "down";
  const priceFlash = useFlash(market.price);

  /* ── WRITE account patch to Supabase ── */
  const persistAccount = useCallback(async (patch) => {
    const uid = userIdRef.current;
    if (!uid) return;
    const { error } = await supabase
      .from(PAPER_ACCOUNT)
      .upsert(
        { id: uid, ...patch, updated_at: new Date().toISOString() },
        { onConflict: "id" }
      );
    if (error) console.error("persistAccount error:", error.message);
  }, []);

  /* ── WRITE orders to vault_orders (debounced) ── */
  const persistOrders = useCallback((rows) => {
    const uid = userIdRef.current;
    if (!uid) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      await supabase.from(PAPER_TABLE).upsert(
        rows.map((o) => ({
          id:         o.id,
          user_id:    uid,
          pair:       o.pair,
          type:       o.type       ?? "market",
          price:      o.price      ?? 0,
          amount:     o.amount     ?? 0,
          total:      o.total      ?? 0,
          fee:        o.fee        ?? 0,
          filled:     o.filled     ?? 0,
          status:     o.status,
          settled:    o.settled    ?? false,
          profit:     o.profit     ?? null,
          created_at: o.created_at ?? Date.now(),
          closed_at:  o.closed_at  ?? null,
          end_time:   o.end_time   ?? null,
        })),
        { onConflict: "id" }
      );
    }, SUPABASE_DEBOUNCE);
  }, []);

  /* ── LOAD account + orders on every mount ── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      const uid = auth?.user?.id;
      if (!uid || cancelled) return;
      userIdRef.current = uid;

      // Load account balance + profit
      const { data: acc } = await supabase
        .from(PAPER_ACCOUNT)
        .select("balance, total_profit, active_positions")
        .eq("id", uid)
        .single();
      if (acc && !cancelled) {
        const b = Number(acc.balance ?? 0);
        setBalance(b);
        balanceRef.current = b;
        setTotalProfit(Number(acc.total_profit ?? 0));
      }

      // Load ALL orders — active + history
      const { data: ord } = await supabase
        .from(PAPER_TABLE)
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(100);
      if (!cancelled) {
        setOrders(ord?.length ? ord : []);
      }
    })();
    // Cleanup: if component unmounts before async completes, ignore result
    return () => { cancelled = true; };
  }, []); // runs on every mount — intentional

  /* ── SESSION COMPLETION CHECKER ── */
  /* Runs every 5s, checks timestamps — survives refresh */
  useEffect(() => {
    clearInterval(settleRef.current);
    settleRef.current = setInterval(async () => {
      const uid = userIdRef.current;
      if (!uid) return;
      const now = Date.now();

      setOrders((prev) => {
        const toSettle = prev.filter(
          (o) => o.status === "active" && !o.settled && Number(o.end_time) <= now
        );
        if (!toSettle.length) return prev;

        let totalNewProfit = 0;

        const next = prev.map((o) => {
          if (!toSettle.find((s) => s.id === o.id)) return o;
          // Always-profitable result: 7x–10x of invested amount
          const invested   = Number(o.total);
          const seed       = o.id ? o.id.charCodeAt(o.id.length - 1) / 255 : 0.5;
          const multiplier = 7 + seed * 3; // consistent 7x–10x per order
          const finalValue = invested * multiplier;
          const pl         = parseFloat((finalValue - invested).toFixed(2));
          totalNewProfit  += pl;
          return {
            ...o,
            status:    "settled",
            settled:   true,
            profit:    pl,
            closed_at: now,
          };
        });

        // Persist settled orders
        persistOrders(next);

        // Credit profit to account — async, outside setState
        if (totalNewProfit !== 0) {
          (async () => {
            const { data } = await supabase
              .from(PAPER_ACCOUNT)
              .select("total_profit, active_positions")
              .eq("id", uid)
              .single();
            if (data) {
              const newProfit   = Number(data.total_profit) + totalNewProfit;
              const newPositions = Math.max(0, Number(data.active_positions) - toSettle.length);
              await persistAccount({ total_profit: newProfit, active_positions: newPositions });
              setTotalProfit(newProfit);
            }
          })();
        }

        return next;
      });
    }, SETTLE_CHECK_MS);

    return () => clearInterval(settleRef.current);
  }, [market.price, persistOrders, persistAccount]);

  /* ── PLACE ORDER ── */
  const handlePlaceOrder = useCallback(async (order) => {
    const uid = userIdRef.current;
    const cost = Number(order.total) + Number(order.fee);

    // Generate session timestamps
    const now      = Date.now();
    const duration = randomDurationMs();
    const endTime  = now + duration;

    const newOrder = {
      ...order,
      id:         `PT-${now}-${Math.random().toString(36).slice(2,7).toUpperCase()}`,
      user_id:    uid,
      status:     "active",
      settled:    false,
      profit:     null,
      created_at: now,
      end_time:   endTime,
      closed_at:  null,
      filled:     order.amount,
      price:      market.price,
    };

    // Optimistic UI — orders only; balance handled via balanceRef after persist
    setOrders((prev) => [newOrder, ...prev]);

    // Persist order immediately (no debounce — placement must not be lost)
    if (uid) {
      await supabase.from(PAPER_TABLE).insert({
        id:         newOrder.id,
        user_id:    uid,
        pair:       newOrder.pair,
        type:       newOrder.type ?? "market",
        price:      newOrder.price,
        amount:     newOrder.amount,
        total:      newOrder.total,
        fee:        newOrder.fee,
        filled:     newOrder.amount,
        status:     "active",
        settled:    false,
        profit:     null,
        created_at: now,
        end_time:   endTime,
        closed_at:  null,
      });

      // Write debited balance to DB immediately using current state value
      // balanceRef tracks the true current balance so we never re-read stale DB value
      const newBalance = Math.max(0, balanceRef.current - cost);
      balanceRef.current = newBalance;
      setBalance(newBalance);

      const { data: acc } = await supabase
        .from(PAPER_ACCOUNT)
        .select("active_positions")
        .eq("id", uid)
        .single();

      await persistAccount({
        balance:          newBalance,
        active_positions: Number(acc?.active_positions ?? 0) + 1,
      });
    }
  }, [market.price, persistAccount]);

  /* ── CANCEL ORDER ── */
  const handleCancelOrder = useCallback(async (id) => {
    const uid       = userIdRef.current;
    const cancelled = orders.find((o) => o.id === id);
    if (!cancelled || cancelled.status === "settled") return;

    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status: "cancelled" } : o));

    if (uid) {
      await supabase.from(PAPER_TABLE).update({ status: "cancelled" }).eq("id", id);
      const refund = Number(cancelled.total) + Number(cancelled.fee);
      const { data: acc } = await supabase
        .from(PAPER_ACCOUNT)
        .select("balance, active_positions")
        .eq("id", uid)
        .single();
      if (acc) {
        const newBalance = Number(acc.balance) + refund;
        setBalance(newBalance);
        await persistAccount({
          balance:          newBalance,
          active_positions: Math.max(0, Number(acc.active_positions) - 1),
        });
      }
    }
  }, [orders, persistAccount]);

  /* ── DERIVED ── */
  const activeOrders  = useMemo(() => orders.filter((o) => o.status === "active"),  [orders]);
  const historyOrders = useMemo(() => orders.filter((o) => o.status === "settled" || o.status === "cancelled"), [orders]);
  const openCount     = activeOrders.length;

  return (
    <div style={{
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
      background: "#080808",
      fontFamily: T.sans,
      overflow: "hidden",
      position: "relative",
      maxWidth: 480,
      margin: "0 auto",
    }}>



      {/* ────────────────────────────────
          HEADER – Pair + Price
      ──────────────────────────────── */}
      <div style={{
        background: T.bg1,
        padding: "10px 16px 10px",
        borderBottom: `1px solid ${T.border}`,
        flexShrink: 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Left: pair + price */}
          <div>
            <button
              onClick={() => setShowPairs(true)}
              style={{
                background: "none", border: "none", cursor: "pointer", padding: 0,
                display: "flex", alignItems: "center", gap: 6,
                WebkitTapHighlightColor: "transparent",
              }}
            >
              <span style={{ fontSize: 18, fontWeight: 700, color: T.white }}>{pair.base}/{pair.quote}</span>
              <ChevronDown size={14} color={T.gray1} />
            </button>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
              <span style={{
                fontSize: 22, fontWeight: 700, fontFamily: T.font,
                color: priceFlash === "up" ? T.green2 : priceFlash === "down" ? T.red2 : (priceDir === "up" ? T.green : T.red),
                transition: "color 0.25s",
              }}>
                {fmtPrice(market.price, pair.precision)}
              </span>
              <span style={{
                fontSize: 12, fontWeight: 700, color: market.vol24 >= 0 ? T.green : T.red,
                background: market.vol24 >= 0 ? T.greenDim : T.redDim,
                padding: "2px 7px", borderRadius: 4,
              }}>
                {fmtPct(market.vol24)}
              </span>
            </div>
          </div>

          {/* Right: mini stats */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <MiniChart candles={market.candles} color={market.vol24 >= 0 ? T.green : T.red} />
            <button style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: 8, padding: "6px 10px", cursor: "pointer", color: T.gray1, display: "flex", alignItems: "center", gap: 5, fontSize: 11, fontWeight: 600, WebkitTapHighlightColor: "transparent" }}>
              <BarChart2 size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* ────────────────────────────────
          MAIN CONTENT AREA
      ──────────────────────────────── */}
      <div style={{ flex: 1, overflow: "hidden", display: "flex", flexDirection: "column" }}>

        {/* ── View toggle tabs ── */}
        <div style={{
          display: "flex",
          padding: "0 16px",
          gap: 16,
          background: T.bg1,
          borderBottom: `1px solid ${T.border}`,
          flexShrink: 0,
        }}>
          {[["chart", "Chart"], ["book", "Order Book"], ["trades", "Trades"]].map(([id, label]) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              style={{
                background: "none", border: "none", cursor: "pointer",
                padding: "9px 0",
                fontSize: 12, fontWeight: activeTab === id ? 700 : 500,
                color: activeTab === id ? T.white : T.gray1,
                borderBottom: activeTab === id ? `2px solid ${T.gold}` : "2px solid transparent",
                WebkitTapHighlightColor: "transparent",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── CHART VIEW ── */}
        {activeTab === "chart" && (
          <div style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>
            {/* Interval selector */}
            <div style={{ display: "flex", padding: "6px 12px", gap: 4, background: T.bg1, flexShrink: 0 }}>
              {INTERVALS.map((iv) => (
                <button
                  key={iv}
                  onClick={() => setInterval_(iv)}
                  style={{
                    padding: "4px 10px", borderRadius: 6, border: "none",
                    background: interval === iv ? T.bg4 : "transparent",
                    color: interval === iv ? T.white : T.gray2,
                    fontSize: 11, fontWeight: 600, cursor: "pointer",
                    WebkitTapHighlightColor: "transparent",
                  }}
                >
                  {iv}
                </button>
              ))}
            </div>

            {/* Chart */}
            <div style={{ background: T.bg1, padding: "0 8px 4px", flexShrink: 0 }}>
              <PriceChart candles={market.candles} pair={pair} />
            </div>

            {/* Split: order book left, trades right */}
            <div style={{ display: "flex", gap: 0, padding: "0", flex: 1, overflow: "hidden" }}>
              <div style={{ flex: 1, padding: "10px 8px 10px 12px", borderRight: `1px solid ${T.border}`, overflow: "hidden" }}>
                <OrderBook book={market.book} price={market.price} prevPrice={market.prevPrice} pair={pair} />
              </div>
              <div style={{ flex: 1, padding: "10px 12px 10px 8px", overflow: "hidden" }}>
                <TradeFeed trades={market.trades} pair={pair} />
              </div>
            </div>
          </div>
        )}

        {/* ── ORDER BOOK VIEW (full) ── */}
        {activeTab === "book" && (
          <div style={{ flex: 1, overflow: "auto", padding: "10px 16px" }}>
            <OrderBook book={market.book} price={market.price} prevPrice={market.prevPrice} pair={pair} />
          </div>
        )}

        {/* ── TRADES VIEW (full) ── */}
        {activeTab === "trades" && (
          <div style={{ flex: 1, overflow: "auto", padding: "10px 16px" }}>
            <TradeFeed trades={market.trades} pair={pair} />
          </div>
        )}
      </div>

      {/* ────────────────────────────────
          BOTTOM DOCK
      ──────────────────────────────── */}
      <div style={{
        background: T.bg1,
        borderTop: `1px solid ${T.border}`,
        flexShrink: 0,
        paddingBottom: "calc(64px + env(safe-area-inset-bottom, 0px))",
      }}>
        {/* Tab bar */}
        <div style={{ display: "flex", padding: "0 16px", gap: 20, borderBottom: `1px solid ${T.border}` }}>
          <button onClick={() => setShowPositions(true)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 0", fontSize: 12, fontWeight: 700, color: T.white, borderBottom: `2px solid ${T.gold}`, display: "flex", alignItems: "center", gap: 6, WebkitTapHighlightColor: "transparent" }}>
            Active Positions
            {openCount > 0 && (
              <span style={{ background: T.gold, color: "#000", fontSize: 9, fontWeight: 700, borderRadius: 10, padding: "1px 6px" }}>{openCount}</span>
            )}
          </button>
          <button onClick={() => setShowOrders(true)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 0", fontSize: 12, color: T.gray1, borderBottom: "2px solid transparent", WebkitTapHighlightColor: "transparent" }}>
            History
          </button>
        </div>

        {/* Balance + PLACE ORDER */}
        <div style={{ padding: "10px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div>
            <div style={{ fontSize: 9, color: T.gray2, fontFamily: T.font, marginBottom: 1, letterSpacing: "0.1em" }}>
              PAPER BALANCE
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.white, fontFamily: T.font }}>
              ${Number(balance).toFixed(2)} <span style={{ color: T.gray1, fontSize: 10 }}>USDT</span>
            </div>
            <div style={{ fontSize: 9, color: totalProfit >= 0 ? T.green : T.red, fontFamily: T.font, marginTop: 1 }}>
              Profit: {totalProfit >= 0 ? "+" : ""}${Number(totalProfit).toFixed(2)}
            </div>
          </div>

          <button onClick={() => setShowOrder(true)}
            style={{
              flex: 1, maxWidth: 220, padding: "14px 0",
              borderRadius: 10, border: "none",
              background: `linear-gradient(90deg, ${T.green} 0%, #00A060 100%)`,
              color: "#000", fontSize: 13, fontWeight: 800,
              letterSpacing: "0.06em", cursor: "pointer",
              boxShadow: `0 4px 18px ${T.green}44`,
              WebkitTapHighlightColor: "transparent",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
            <Zap size={15} fill="#000" color="#000" />
            PLACE ORDER
          </button>
        </div>
      </div>



      {/* ────────────────────────────────
          MODALS
      ──────────────────────────────── */}
      <AnimatePresence>
        {showOrder && (
          <PlaceOrderModal
            key="place-order"
            pair={pair}
            currentPrice={market.price}
            balance={balance}
            onClose={() => setShowOrder(false)}
            onSubmit={handlePlaceOrder}
          />
        )}
      </AnimatePresence>

      {/* Active Positions Panel */}
      <AnimatePresence>
        {showPositions && (
          <motion.div
            key="positions-panel"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(9,12,16,0.94)", backdropFilter: "blur(10px)", display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: "calc(62px + env(safe-area-inset-bottom, 0px))" }}
            onPointerDown={() => setShowPositions(false)}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              onPointerDown={(e) => e.stopPropagation()}
              style={{ width: "100%", maxWidth: 480, background: T.bg2, borderRadius: 20, border: `1px solid ${T.border2}`, padding: "20px 0 20px", maxHeight: "78vh", display: "flex", flexDirection: "column", overflow: "hidden" }}
            >
              <div style={{ padding: "0 20px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: `1px solid ${T.border}` }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: T.white }}>Active Positions</div>
                </div>
                <button onClick={() => setShowPositions(false)} style={{ background: T.bg3, border: `1px solid ${T.border}`, borderRadius: "50%", width: 30, height: 30, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: T.gray1 }}>
                  <X size={14} />
                </button>
              </div>
              <div style={{ overflowY: "auto", flex: 1, padding: "14px 20px", WebkitOverflowScrolling: "touch" }}>
                {activeOrders.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 0", color: T.gray2, fontSize: 13 }}>No active positions</div>
                ) : activeOrders.map((o) => (
                  <ActivePositionCard key={o.id} order={o} currentPrice={market.price} />
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Order History Panel */}
      <AnimatePresence>
        {showOrders && (
          <OrdersPanel
            key="orders-panel"
            orders={historyOrders}
            onCancel={handleCancelOrder}
            onClose={() => setShowOrders(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPairs && (
          <PairModal
            key="pair-modal"
            pairs={PAIRS}
            current={pair}
            onSelect={setPair}
            onClose={() => setShowPairs(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
