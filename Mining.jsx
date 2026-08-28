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
        display: "flex", alignItems: "flex-end", justifyContent: "center",
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
          borderRadius: "20px 20px 0 0",
          border: `1px solid ${T.border2}`,
          borderBottom: "none",
          padding: "24px 20px 0",
          position: "relative",
          maxHeight: "92vh",
          overflowY: "auto",
          paddingBottom: "calc(28px + env(safe-area-inset-bottom, 20px))",
        }}
      >
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

        <button
          onClick={handleConfirm}
          disabled={submitted}
          style={{
            width: "100%", padding: "16px",
            borderRadius: 10, border: "none",
            background: submitted ? T.green + "88" : `linear-gradient(90deg, ${T.green} 0%, #00A060 100%)`,
            color: "#000", fontSize: 15, fontWeight: 700,
            letterSpacing: "0.04em", cursor: submitted ? "default" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            boxShadow: submitted ? "none" : `0 4px 20px ${T.green}44`,
            transition: "all 0.2s",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {submitted ? <><CheckCircle2 size={18} /> Placed!</> : "CONFIRM ORDER"}
        </button>
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
          background: T.bg2,
          borderRadius: "20px 20px 0 0",
          border: `1px solid ${T.border2}`,
          borderBottom: "none",
          padding: "20px 0 0",
          maxHeight: "85vh",
          display: "flex",
          flexDirection: "column",
          paddingBottom: "env(safe-area-inset-bottom, 0px)",
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
   ROOT – TRADING TERMINAL
═══════════════════════════════════════════════════════════════════════ */
export default function Mining({ user }) {
  const [pair,         setPair]         = useState(PAIRS[0]);
  const [balance,      setBalance]      = useState(0);
  const [orders,       setOrders]       = useState([]);
  const [showOrder,    setShowOrder]    = useState(false);
  const [showOrders,   setShowOrders]   = useState(false);
  const [showPairs,    setShowPairs]    = useState(false);
  const [activeTab,    setActiveTab]    = useState("chart"); // chart | book | trades
  const [interval,     setInterval_]    = useState("1m");
  const [navTab,       setNavTab]       = useState("trade");
  const syncTimer   = useRef(null);
  const userIdRef   = useRef(null); // stores auth uuid

  // ── 1. Load user ID + balance from account_summary (same table as Trade) ──
  useEffect(() => {
    if (!user?.email) return;
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) return;
      userIdRef.current = uid;

      const { data } = await supabase
        .from("account_summary")
        .select("balance, total_profit, active_positions")
        .eq("id", uid)
        .single();

      if (data) {
        setBalance(Number(data.balance ?? 0));
      }
    })();
  }, [user?.email]);

  // ── 2. Load persisted open orders from vault_orders ──
  useEffect(() => {
    if (!user?.email) return;
    (async () => {
      const { data: authData } = await supabase.auth.getUser();
      const uid = authData?.user?.id;
      if (!uid) return;
      userIdRef.current = uid;

      const { data } = await supabase
        .from("vault_orders")
        .select("*")
        .eq("user_id", uid)
        .order("created_at", { ascending: false })
        .limit(50);

      if (data?.length) setOrders(data);
    })();
  }, [user?.email]);

  const market     = useMarket(pair);
  const priceDir   = market.price >= market.prevPrice ? "up" : "down";
  const priceFlash = useFlash(market.price);

  // ── 3. Persist orders to vault_orders (debounced, uses user_id) ──
  const persistOrders = useCallback((next) => {
    const uid = userIdRef.current;
    if (!uid) return;
    clearTimeout(syncTimer.current);
    syncTimer.current = setTimeout(async () => {
      const rows = next.map((o) => ({
        id:         o.id,
        user_id:    uid,
        pair:       o.pair,
        type:       o.type,
        price:      o.price,
        amount:     o.amount,
        total:      o.total,
        fee:        o.fee,
        filled:     o.filled ?? 0,
        status:     o.status,
        settled:    o.settled ?? false,
        profit:     o.profit ?? null,
        created_at: o.created_at ?? Date.now(),
        closed_at:  o.closed_at ?? null,
      }));
      await supabase
        .from("vault_orders")
        .upsert(rows, { onConflict: "id" });
    }, SUPABASE_DEBOUNCE);
  }, []);

  // ── 4. Write account changes to account_summary ──
  const persistAccount = useCallback(async (patch) => {
    const uid = userIdRef.current;
    if (!uid) return;
    await supabase
      .from("account_summary")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", uid);
  }, []);

  // ── 5. Market engine fills open orders + credits profit ──
  useEffect(() => {
    if (!orders.length) return;
    setOrders((prev) => {
      let changed = false;
      let profitDelta    = 0;
      let positionDelta  = 0;

      const next = prev.map((o) => {
        if (o.status !== "open" && o.status !== "partial") return o;
        const mkt = market.price;

        let updated = null;
        if (o.type === "market" && o.status === "open") {
          updated = { ...o, filled: o.amount, status: "filled" };
        } else if (o.type === "limit" && mkt <= o.price) {
          const newFilled = Math.min(o.amount, (o.filled || 0) + o.amount * (0.3 + Math.random() * 0.7) * 0.25);
          const status    = newFilled >= o.amount * 0.999 ? "filled" : "partial";
          updated = { ...o, filled: newFilled, status };
        }

        // Settle filled orders exactly once
        if (updated?.status === "filled" && !o.settled) {
          const profitPct = 0.001 + Math.random() * 0.019;
          const profit    = parseFloat((updated.total * profitPct).toFixed(2));
          profitDelta    += profit;
          positionDelta  -= 1;
          changed = true;
          return { ...updated, settled: true, profit, closed_at: Date.now() };
        }

        if (updated) { changed = true; return updated; }
        return o;
      });

      if (changed) {
        persistOrders(next);
        // Update account_summary: credit profit, decrement active_positions
        if (profitDelta > 0 || positionDelta !== 0) {
          // Read current values then patch
          (async () => {
            const uid = userIdRef.current;
            if (!uid) return;
            const { data } = await supabase
              .from("account_summary")
              .select("total_profit, active_positions")
              .eq("id", uid)
              .single();
            if (data) {
              await persistAccount({
                total_profit:     (Number(data.total_profit) + profitDelta),
                active_positions: Math.max(0, Number(data.active_positions) + positionDelta),
              });
            }
          })();
        }
        return next;
      }
      return prev;
    });
  }, [market.tick]);

  // ── 6. Place order: debit balance + increment active_positions ──
  async function handlePlaceOrder(order) {
    const uid = userIdRef.current;
    const cost = order.total + order.fee;

    // Optimistic UI update
    setBalance((b) => Math.max(0, b - cost));
    setOrders((prev) => {
      const next = [order, ...prev];
      persistOrders(next);
      return next;
    });

    // Write to account_summary
    if (uid) {
      const { data } = await supabase
        .from("account_summary")
        .select("balance, active_positions")
        .eq("id", uid)
        .single();
      if (data) {
        await persistAccount({
          balance:          Math.max(0, Number(data.balance) - cost),
          active_positions: Number(data.active_positions) + 1,
        });
      }
    }
  }

  // ── 7. Cancel order: restore balance ──
  async function handleCancelOrder(id) {
    const cancelled = orders.find((o) => o.id === id);
    setOrders((prev) => {
      const next = prev.map((o) => o.id === id ? { ...o, status: "cancelled" } : o);
      persistOrders(next);
      return next;
    });

    // Refund to account_summary
    if (cancelled && userIdRef.current) {
      const refund = (cancelled.total || 0) + (cancelled.fee || 0);
      const { data } = await supabase
        .from("account_summary")
        .select("balance, active_positions")
        .eq("id", userIdRef.current)
        .single();
      if (data) {
        setBalance(Number(data.balance) + refund);
        await persistAccount({
          balance:          Number(data.balance) + refund,
          active_positions: Math.max(0, Number(data.active_positions) - 1),
        });
      }
    }
  }

  const openCount = useMemo(() => orders.filter((o) => o.status === "open" || o.status === "partial").length, [orders]);

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
      }}>
        {/* Open orders tab bar */}
        <div style={{ display: "flex", padding: "0 16px", gap: 20, borderBottom: `1px solid ${T.border}` }}>
          <button
            onClick={() => setShowOrders(true)}
            style={{
              background: "none", border: "none", cursor: "pointer",
              padding: "10px 0",
              fontSize: 12, fontWeight: 700, color: T.white,
              borderBottom: `2px solid ${T.gold}`,
              display: "flex", alignItems: "center", gap: 6,
              WebkitTapHighlightColor: "transparent",
            }}
          >
            Open Orders
            {openCount > 0 && (
              <span style={{ background: T.gold, color: "#000", fontSize: 9, fontWeight: 700, borderRadius: 10, padding: "1px 6px" }}>
                {openCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowOrders(true)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 0", fontSize: 12, color: T.gray1, borderBottom: "2px solid transparent", WebkitTapHighlightColor: "transparent" }}
          >
            History
          </button>
          <button
            onClick={() => setShowOrders(true)}
            style={{ background: "none", border: "none", cursor: "pointer", padding: "10px 0", fontSize: 12, color: T.gray1, borderBottom: "2px solid transparent", WebkitTapHighlightColor: "transparent" }}
          >
            Trades
          </button>
        </div>

        {/* Status row + PLACE ORDER CTA */}
        <div style={{ padding: "10px 16px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          {/* Balance info */}
          <div>
            <div style={{ fontSize: 10, color: T.gray2, fontFamily: T.font, marginBottom: 2 }}>Available</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: T.white, fontFamily: T.font }}>
              {fmtPrice(balance, 2)} <span style={{ color: T.gray1 }}>USDT</span>
            </div>
          </div>

          {/* PLACE ORDER button */}
          <button
            onClick={() => setShowOrder(true)}
            style={{
              flex: 1, maxWidth: 220,
              padding: "14px 0",
              borderRadius: 10, border: "none",
              background: `linear-gradient(90deg, ${T.green} 0%, #00A060 100%)`,
              color: "#000", fontSize: 14, fontWeight: 700,
              letterSpacing: "0.06em", cursor: "pointer",
              boxShadow: `0 4px 18px ${T.green}44`,
              WebkitTapHighlightColor: "transparent",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
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

      <AnimatePresence>
        {showOrders && (
          <OrdersPanel
            key="orders-panel"
            orders={orders}
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
