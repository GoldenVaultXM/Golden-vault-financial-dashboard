/**
 * Mining.jsx  –  VAULT Tap Module
 *
 * ┌─ Architecture Notes ───────────────────────────────────────────────────┐
 * │  • All mining state (balance, energy, upgrades) is LOCAL to this       │
 * │    component.                                                           │
 * │  • Supabase sync is debounced (1 500 ms) so rapid taps never flood the │
 * │    API; only the final resting balance is persisted.                   │
 * │  • Framer Motion drives every animation for consistent 60fps output.  │
 * │  • Energy regenerates based on recharge speed upgrade via setInterval. │
 * │  • Tap Bot auto-earns coins_per_hour on a 12-hour collection cycle.   │
 * │  • Swap interface for NOT, HMSTR, CATI is manual & atomic.            │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * Token Economics:
 *   $1 USD ≈ 1,000–1,150 VAULT tokens
 *   500 taps = $1 (fixed gameplay conversion)
 *
 * Props
 *   user  – { email: string } from AuthContext (may be null)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "./supabaseClient";
import {
  Zap, Cpu, TrendingUp, Lock, X, UserPlus, LogIn,
  ArrowRightLeft, ChevronRight, Shield, Bot, Battery,
  Bolt, Clock, Star, Info
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────
   Design tokens
───────────────────────────────────────────────────────────────────────── */
const C = {
  bg: "#07050f",
  bgMid: "#0e0a1c",
  card: "#110d20",
  card2: "#160f28",
  card3: "#1c1430",
  border: "#2a1f4a",
  border2: "#352860",
  gold: "#d97706",
  gold2: "#f59e0b",
  gold3: "#fbbf24",
  goldDim: "#92400e",
  purple: "#7c3aed",
  purple2: "#9d5cf5",
  purple3: "#c084fc",
  purpleGlow: "#a855f7",
  pink: "#ec4899",
  pink2: "#f472b6",
  green: "#22c55e",
  red: "#ef4444",
  text: "#ffffff",
  text2: "#c4b5d8",
  text3: "#6b5a8a",
  text4: "#3d2f5c",
  amber: "#f59e0b",
  cyan: "#06b6d4",
};

/* ─────────────────────────────────────────────────────────────────────────
   Token economics constants
───────────────────────────────────────────────────────────────────────── */
const VAULT_PER_TAP_BASE = 1;            // base reward per tap
const TAPS_PER_DOLLAR = 500;             // 500 taps = $1
const VAULT_PER_USD_MIN = 1000;
const VAULT_PER_USD_MAX = 1150;
const VAULT_PER_USD = (VAULT_PER_USD_MIN + VAULT_PER_USD_MAX) / 2; // 1075

/* ─────────────────────────────────────────────────────────────────────────
   Mining pair definitions (now earn VAULT tokens, display crypto pair)
───────────────────────────────────────────────────────────────────────── */
const MINING_PAIRS = [
  { id: "btc", label: "BTC", name: "Bitcoin",  rate: 1, color: "#f7931a" },
  { id: "eth", label: "ETH", name: "Ethereum", rate: 2, color: "#627eea" },
  { id: "sol", label: "SOL", name: "Solana",   rate: 3, color: "#9945ff" },
  { id: "xau", label: "XAU", name: "Gold Spot",rate: 5, color: "#d97706" },
];

/* ─────────────────────────────────────────────────────────────────────────
   Energy / regen constants (base values, modified by upgrades)
───────────────────────────────────────────────────────────────────────── */
const BASE_MAX_ENERGY    = 500;
const ENERGY_COST        = 10;
const BASE_REGEN_RATE    = 1;     // units per second
const SUPABASE_DEBOUNCE  = 1500;

/* ─────────────────────────────────────────────────────────────────────────
   Upgrade definitions
───────────────────────────────────────────────────────────────────────── */
const UPGRADES = {
  multitap: {
    id: "multitap",
    label: "Multitap",
    desc: "Earn more VAULT per tap",
    icon: "⚡",
    maxLevel: 10,
    baseCost: 500,
    costMultiplier: 2.2,
    effect: (lvl) => `+${1 + lvl} per tap`,
  },
  energyLimit: {
    id: "energyLimit",
    label: "Energy Limit",
    desc: "+500 energy capacity per level",
    icon: "🔋",
    maxLevel: 8,
    baseCost: 800,
    costMultiplier: 2.5,
    effect: (lvl) => `${BASE_MAX_ENERGY + lvl * 500} max`,
  },
  rechargeSpeed: {
    id: "rechargeSpeed",
    label: "Recharge Speed",
    desc: "Faster energy regeneration",
    icon: "⏩",
    maxLevel: 8,
    baseCost: 600,
    costMultiplier: 2.3,
    effect: (lvl) => `${BASE_REGEN_RATE + lvl}/sec`,
  },
  tapBot: {
    id: "tapBot",
    label: "Tap Bot",
    desc: "Auto-earns 24/7, collect every 12h",
    icon: "🤖",
    maxLevel: 5,
    baseCost: 5000,
    costMultiplier: 3.5,
    effect: (lvl) => `${lvl * 200}/hr auto`,
  },
};

function getUpgradeCost(upgradeId, currentLevel) {
  const u = UPGRADES[upgradeId];
  return Math.floor(u.baseCost * Math.pow(u.costMultiplier, currentLevel));
}

/* ─────────────────────────────────────────────────────────────────────────
   Swap partner tokens
───────────────────────────────────────────────────────────────────────── */
const SWAP_TOKENS = [
  { id: "not",   label: "Notcoin",        symbol: "$NOT",   color: "#ffd700", rate: 0.85 },
  { id: "hmstr", label: "Hamster Kombat", symbol: "$HMSTR", color: "#ff6b35", rate: 0.90 },
  { id: "cati",  label: "Catizen",        symbol: "$CATI",  color: "#8b5cf6", rate: 0.88 },
];

/* ─────────────────────────────────────────────────────────────────────────
   Coin Bag SVG Icon (inline, no external asset required)
   Renders a stylised money-bag with gold coins bursting out
───────────────────────────────────────────────────────────────────────── */
function CoinBagIcon({ size = 200, exhausted = false, popping = false }) {
  const bagColor    = exhausted ? "#2a2040"  : "#8B5E3C";
  const bagShadow   = exhausted ? "#1a1030"  : "#6B4226";
  const bagHighlight= exhausted ? "#3d3060"  : "#A0714F";
  const coinColor   = exhausted ? "#3d2f5c"  : "#F5C518";
  const coinEdge    = exhausted ? "#2a1f4a"  : "#D4A017";
  const zapColor    = exhausted ? "#3d2f5c"  : "#FFFFFF";

  return (
    <svg width={size} height={size} viewBox="0 0 200 200" style={{ overflow: "visible" }}>
      <defs>
        <radialGradient id="bagGrad" cx="38%" cy="30%" r="65%">
          <stop offset="0%"   stopColor={bagHighlight} />
          <stop offset="45%"  stopColor={bagColor} />
          <stop offset="100%" stopColor={bagShadow} />
        </radialGradient>
        <radialGradient id="coinGrad" cx="35%" cy="28%" r="65%">
          <stop offset="0%"   stopColor={exhausted ? "#4a3a6a" : "#FFE566"} />
          <stop offset="50%"  stopColor={coinColor} />
          <stop offset="100%" stopColor={coinEdge} />
        </radialGradient>
        <filter id="bagGlow">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Bag body */}
      <ellipse cx="100" cy="130" rx="68" ry="58" fill="url(#bagGrad)" />

      {/* Bag highlight / sheen */}
      {!exhausted && (
        <ellipse cx="80" cy="108" rx="22" ry="28" fill="#ffffff18" />
      )}

      {/* Bag neck / tie */}
      <rect x="76" y="70" width="48" height="28" rx="12" fill={bagColor} />
      <rect x="82" y="72" width="36" height="8" rx="4" fill={bagShadow} />

      {/* Drawstring knot */}
      <ellipse cx="100" cy="72" rx="14" ry="7" fill={bagShadow} />
      <ellipse cx="100" cy="72" rx="10" ry="5" fill={bagColor} />

      {/* Bag top opening */}
      <ellipse cx="100" cy="60" rx="30" ry="14" fill={bagColor} />
      <ellipse cx="100" cy="58" rx="25" ry="9"  fill={bagHighlight} />

      {/* Coins at top of bag */}
      {!exhausted && [
        { cx: 84,  cy: 52, rx: 11, ry: 5 },
        { cx: 100, cy: 48, rx: 12, ry: 5.5 },
        { cx: 116, cy: 52, rx: 11, ry: 5 },
      ].map((c, i) => (
        <g key={i}>
          <ellipse cx={c.cx} cy={c.cy + 2} rx={c.rx} ry={c.ry - 1} fill={coinEdge} />
          <ellipse cx={c.cx} cy={c.cy}     rx={c.rx} ry={c.ry}     fill="url(#coinGrad)" />
        </g>
      ))}

      {/* Scattered coins at base */}
      {!exhausted && [
        { cx: 52,  cy: 174, rx: 14, ry: 6 },
        { cx: 76,  cy: 182, rx: 13, ry: 5.5 },
        { cx: 100, cy: 186, rx: 14, ry: 6 },
        { cx: 124, cy: 182, rx: 13, ry: 5.5 },
        { cx: 148, cy: 174, rx: 14, ry: 6 },
        { cx: 64,  cy: 186, rx: 10, ry: 4 },
        { cx: 136, cy: 186, rx: 10, ry: 4 },
      ].map((c, i) => (
        <g key={i}>
          <ellipse cx={c.cx} cy={c.cy + 2} rx={c.rx} ry={c.ry - 1} fill={coinEdge} />
          <ellipse cx={c.cx} cy={c.cy}     rx={c.rx} ry={c.ry}     fill="url(#coinGrad)" />
          <ellipse cx={c.cx - 3} cy={c.cy - 1} rx={c.rx * 0.35} ry={c.ry * 0.45} fill="#ffffff30" />
        </g>
      ))}

      {/* ⚡ Lightning bolt centrepiece */}
      <text
        x="100" y="146"
        textAnchor="middle"
        fontSize="44"
        fill={zapColor}
        style={{ filter: exhausted ? "none" : `drop-shadow(0 0 8px ${C.gold3}cc)` }}
      >
        ⚡
      </text>

      {/* "vault Token" label underneath bolt */}
      <text
        x="100" y="162"
        textAnchor="middle"
        fontSize="10"
        fontWeight="bold"
        fill={exhausted ? C.text4 : "#00000099"}
        letterSpacing="1"
      >
        vault Token
      </text>

      {/* Side coin tag */}
      {!exhausted && (
        <g>
          <ellipse cx="152" cy="130" rx="10" ry="10" fill={coinEdge} />
          <ellipse cx="152" cy="128" rx="10" ry="10" fill="url(#coinGrad)" />
          <text x="152" y="132" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#8B5E3C">V</text>
        </g>
      )}
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Coin burst particle (pops out on tap)
───────────────────────────────────────────────────────────────────────── */
function CoinBurst({ id, onDone }) {
  const coins = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * 360 + Math.random() * 30;
    const dist  = 60 + Math.random() * 55;
    const rad   = (angle * Math.PI) / 180;
    return {
      tx: Math.cos(rad) * dist,
      ty: Math.sin(rad) * dist,
      size: 10 + Math.random() * 10,
      delay: i * 0.03,
    };
  });

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10 }}>
      {coins.map((c, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 1, scale: 0.4, x: 0, y: 0 }}
          animate={{ opacity: 0, scale: 1.1, x: c.tx, y: c.ty }}
          transition={{ duration: 0.7, delay: c.delay, ease: "easeOut" }}
          onAnimationComplete={i === 0 ? onDone : undefined}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            marginTop: -c.size / 2,
            marginLeft: -c.size / 2,
            width: c.size,
            height: c.size,
            borderRadius: "50%",
            background: `radial-gradient(circle at 35% 28%, #FFE566, #F5C518 50%, #D4A017)`,
            boxShadow: `0 0 8px #f59e0b88`,
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Floating "+N 🪙" tap particle
───────────────────────────────────────────────────────────────────────── */
function TapParticle({ x, y, amount, onDone }) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -90, scale: 1.4 }}
      transition={{ duration: 0.85, ease: "easeOut" }}
      onAnimationComplete={onDone}
      style={{
        position: "fixed",
        left: x - 28,
        top:  y - 20,
        pointerEvents: "none",
        zIndex: 999,
        fontWeight: 900,
        fontSize: 20,
        color: C.gold3,
        textShadow: `0 0 12px ${C.gold}cc, 0 0 24px ${C.gold}66`,
        userSelect: "none",
        letterSpacing: "-0.01em",
        whiteSpace: "nowrap",
      }}
    >
      +{amount} 🪙
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Electric ring burst on tap
───────────────────────────────────────────────────────────────────────── */
function ElectricRing({ trigger }) {
  return (
    <AnimatePresence>
      {trigger && (
        <motion.div
          key={trigger}
          initial={{ scale: 0.7, opacity: 0.9 }}
          animate={{ scale: 1.7, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `3px solid ${C.gold2}`,
            boxShadow: `0 0 18px ${C.gold}99, inset 0 0 18px ${C.gold}44`,
            pointerEvents: "none",
          }}
        />
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Asset selector pill row
───────────────────────────────────────────────────────────────────────── */
function PairSelector({ pairs, selected, onSelect }) {
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, paddingLeft: 16, paddingRight: 16 }}>
      {pairs.map((p) => {
        const active = p.id === selected.id;
        return (
          <motion.button
            key={p.id}
            whileTap={{ scale: 0.93 }}
            onClick={() => onSelect(p)}
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 7,
              padding: "8px 14px",
              borderRadius: 20,
              border: `1px solid ${active ? p.color + "88" : C.border2}`,
              background: active ? `${p.color}1a` : C.card2,
              cursor: "pointer",
              transition: "all 0.18s",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 900, color: active ? p.color : C.text3, letterSpacing: "0.06em" }}>
              {p.label}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700,
              color: active ? p.color : C.text4,
              background: active ? `${p.color}22` : C.card3,
              borderRadius: 10, padding: "1px 6px",
            }}>
              +{p.rate}/tap
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Large Coin Bag tapping element
───────────────────────────────────────────────────────────────────────── */
function TapBag({ pair, onTap, exhausted, upgradeLevel }) {
  const [ringKey, setBursts] = useState(0);
  const [bursts, setPopBursts] = useState([]);
  const burstId = useRef(0);

  const handleTap = useCallback((e) => {
    onTap(e);
    if (!exhausted) {
      setBursts(k => k + 1);
      const bid = burstId.current++;
      setPopBursts(b => [...b, bid]);
    }
  }, [exhausted, onTap]);

  const removeBurst = useCallback((id) => {
    setPopBursts(b => b.filter(x => x !== id));
  }, []);

  const bagSize = Math.min(280, Math.max(220, window.innerWidth * 0.72));

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      justifyContent: "center", alignItems: "center",
      minHeight: 340, position: "relative",
      paddingTop: 8, paddingBottom: 0,
    }}>
      {/* Ambient glow beneath bag */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ repeat: Infinity, duration: 3.8, ease: "easeInOut" }}
        style={{
          position: "absolute", top: "8%", left: "50%", transform: "translateX(-50%)",
          width: "86%", height: "68%", borderRadius: "50%",
          background: `radial-gradient(ellipse, ${C.gold}30 0%, ${C.purpleGlow}18 45%, transparent 70%)`,
          filter: "blur(36px)", pointerEvents: "none",
        }}
      />

      {/* Bag wrapper with float animation */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 3.4, ease: "easeInOut" }}
        style={{ position: "relative", zIndex: 2 }}
      >
        <motion.div
          whileTap={exhausted ? {} : { scale: 0.88, rotate: -1 }}
          transition={{ type: "spring", stiffness: 380, damping: 18 }}
          onPointerDown={handleTap}
          style={{
            position: "relative",
            width: bagSize, height: bagSize,
            cursor: exhausted ? "not-allowed" : "pointer",
            userSelect: "none",
            WebkitUserSelect: "none",
            touchAction: "none",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          {/* Glow ring behind bag */}
          {!exhausted && (
            <div style={{
              position: "absolute", inset: -8, borderRadius: "50%",
              background: `radial-gradient(circle, ${C.gold}22 0%, transparent 70%)`,
              filter: "blur(12px)", pointerEvents: "none",
            }} />
          )}

          <CoinBagIcon size={bagSize * 0.92} exhausted={exhausted} />

          {/* Coin pop bursts */}
          <AnimatePresence>
            {bursts.map(bid => (
              <CoinBurst key={bid} id={bid} onDone={() => removeBurst(bid)} />
            ))}
          </AnimatePresence>

          {/* Electric ring */}
          <div style={{ position: "absolute", inset: 0 }}>
            <ElectricRing trigger={ringKey} />
          </div>
        </motion.div>
      </motion.div>

      {/* Pedestal shadow */}
      <div style={{ position: "relative", zIndex: 1, marginTop: -12, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <motion.div
          animate={{ scaleX: [1, 0.88, 1], opacity: [0.5, 0.3, 0.5] }}
          transition={{ repeat: Infinity, duration: 3.4, ease: "easeInOut" }}
          style={{
            width: "55%", height: 12, borderRadius: "50%",
            background: `radial-gradient(ellipse, ${C.gold}55 0%, transparent 70%)`,
            filter: "blur(6px)", marginBottom: -6,
          }}
        />
        <div style={{
          width: "58vw", maxWidth: 210, height: 16, borderRadius: "50%",
          background: `linear-gradient(180deg, #2a1f4a, #1a1030)`,
          border: `1px solid ${C.border2}`,
          boxShadow: `0 4px 18px #00000077, 0 1px 0 ${C.purple2}33 inset`,
        }} />
        <div style={{
          width: "42vw", maxWidth: 148, height: 20,
          background: `linear-gradient(180deg, #1e1535, #110d20)`,
          borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`,
          clipPath: "polygon(4% 0%, 96% 0%, 100% 100%, 0% 100%)",
        }} />
        <div style={{
          width: "50vw", maxWidth: 178, height: 9, borderRadius: "0 0 6px 6px",
          background: `linear-gradient(180deg, #160f28, #0d0a18)`,
          border: `1px solid ${C.border}`, borderTop: "none",
        }} />
      </div>

      {/* Tap hint */}
      {!exhausted ? (
        <motion.div
          animate={{ opacity: [0.3, 0.75, 0.3] }}
          transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
          style={{ marginTop: 14, fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", color: C.text3 }}
        >
          TAP THE VAULT TO MINE
        </motion.div>
      ) : (
        <div style={{ marginTop: 14, fontSize: 9, fontWeight: 700, letterSpacing: "0.22em", color: C.red }}>
          ⚡ RECHARGING...
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Stats strip — VAULT token🪙 balance
───────────────────────────────────────────────────────────────────────── */
function StatsStrip({ balance, sessionEarned, taps }) {
  const stats = [
    { label: "VAULT token🪙", value: balance.toLocaleString(undefined, { maximumFractionDigits: 0 }), icon: <TrendingUp size={14} color={C.gold2} />, color: C.gold2 },
    { label: "Session",        value: `+${sessionEarned}`,  icon: <Zap   size={14} color={C.green} />,  color: C.green  },
    { label: "Taps",           value: taps.toLocaleString(), icon: <Cpu   size={14} color={C.purple} />, color: C.purple },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8, marginTop: 36, paddingLeft: 16, paddingRight: 16 }}>
      {stats.map(s => (
        <div key={s.label} style={{
          background: `linear-gradient(145deg, ${C.card2}, ${C.card})`,
          border: `1px solid ${C.border}`, borderRadius: 14,
          padding: "14px 8px 12px", textAlign: "center",
          boxShadow: "0 2px 12px #00000066, inset 0 1px 0 #ffffff08",
          backdropFilter: "blur(10px)",
        }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 5 }}>{s.icon}</div>
          <div style={{ fontSize: s.label === "VAULT token🪙" ? 14 : 16, fontWeight: 900, color: s.color, lineHeight: 1.1 }}>
            {s.value}
          </div>
          <div style={{ fontSize: 8, color: C.text3, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 4 }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Asset info + USD value
───────────────────────────────────────────────────────────────────────── */
function AssetInfo({ pair, balance }) {
  const usdValue = (balance / VAULT_PER_USD).toFixed(4);
  return (
    <div style={{
      marginLeft: 16, marginRight: 16,
      background: "linear-gradient(135deg, #131313, #0d0d0d)",
      border: `1px solid ${pair.color}22`,
      borderLeft: `3px solid ${pair.color}`,
      borderRadius: 12, padding: "12px 14px",
      display: "flex", alignItems: "center", justifyContent: "space-between",
    }}>
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.text }}>{pair.name}</div>
        <div style={{ fontSize: 10, color: C.text3, marginTop: 2 }}>Active Mining Pair</div>
        <div style={{ fontSize: 9, color: C.text4, marginTop: 3 }}>≈ ${usdValue} USD</div>
      </div>
      <div style={{ textAlign: "right" }}>
        <div style={{
          background: `${pair.color}18`, border: `1px solid ${pair.color}44`,
          borderRadius: 20, padding: "5px 12px",
          fontSize: 11, fontWeight: 900, color: pair.color, letterSpacing: "0.08em",
        }}>
          +{pair.rate} / TAP
        </div>
        <div style={{ fontSize: 8, color: C.text4, marginTop: 4 }}>
          1,000–1,150 VAULT/$1
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Energy bar
───────────────────────────────────────────────────────────────────────── */
function EnergyBar({ energy, max, regenRate }) {
  const pct      = Math.max(0, Math.min(1, energy / max));
  const barColor = pct > 0.6 ? C.gold2 : pct > 0.3 ? "#fb923c" : C.red;

  return (
    <div style={{
      marginLeft: 16, marginRight: 16,
      background: "linear-gradient(135deg, #111, #0c0c0c)",
      border: `1px solid ${C.border}`, borderRadius: 14,
      padding: "14px 16px", boxShadow: "0 2px 12px #00000044",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Zap size={13} color={barColor} fill={barColor} />
          <span style={{ fontSize: 11, fontWeight: 800, color: barColor, letterSpacing: "0.08em" }}>ENERGY</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.text2 }}>
          {Math.floor(energy)} / {max}
        </span>
      </div>
      <div style={{ height: 7, borderRadius: 4, background: "#1a1a1a", overflow: "hidden", border: `1px solid ${C.border}` }}>
        <motion.div
          animate={{ width: `${pct * 100}%` }}
          transition={{ type: "spring", stiffness: 180, damping: 24 }}
          style={{ height: "100%", borderRadius: 4, background: `linear-gradient(90deg, ${barColor}99, ${barColor})`, boxShadow: `0 0 10px ${barColor}88` }}
        />
      </div>
      <div style={{ fontSize: 10, color: C.text3, textAlign: "right", marginTop: 6 }}>
        Regenerates {regenRate}/sec
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Upgrades panel
───────────────────────────────────────────────────────────────────────── */
function UpgradesPanel({ upgradeLevels, balance, onUpgrade }) {
  const upgradeList = Object.values(UPGRADES);

  return (
    <div style={{ marginLeft: 16, marginRight: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <Star size={14} color={C.gold2} />
        <span style={{ fontSize: 13, fontWeight: 900, color: C.text, letterSpacing: "0.04em" }}>UPGRADES</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {upgradeList.map(u => {
          const lvl     = upgradeLevels[u.id] || 0;
          const cost    = getUpgradeCost(u.id, lvl);
          const maxed   = lvl >= u.maxLevel;
          const canAfford = balance >= cost && !maxed;

          return (
            <div key={u.id} style={{
              background: `linear-gradient(145deg, ${C.card2}, ${C.card})`,
              border: `1px solid ${maxed ? C.gold + "55" : C.border}`,
              borderRadius: 14, padding: "14px 12px",
              boxShadow: maxed ? `0 0 14px ${C.gold}22` : "0 2px 10px #00000055",
              position: "relative", overflow: "hidden",
            }}>
              {maxed && (
                <div style={{
                  position: "absolute", top: 0, right: 0,
                  background: `${C.gold}cc`, fontSize: 7, fontWeight: 900,
                  padding: "2px 7px", borderRadius: "0 14px 0 8px",
                  color: "#000", letterSpacing: "0.1em",
                }}>MAX</div>
              )}
              <div style={{ fontSize: 22, marginBottom: 6 }}>{u.icon}</div>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.text, marginBottom: 3 }}>{u.label}</div>
              <div style={{ fontSize: 9, color: C.text3, marginBottom: 8, lineHeight: 1.4 }}>{u.desc}</div>

              {/* Level indicator */}
              <div style={{ display: "flex", gap: 3, marginBottom: 10 }}>
                {Array.from({ length: u.maxLevel }).map((_, i) => (
                  <div key={i} style={{
                    flex: 1, height: 4, borderRadius: 2,
                    background: i < lvl ? C.gold2 : C.border,
                    boxShadow: i < lvl ? `0 0 4px ${C.gold}88` : "none",
                    transition: "background 0.3s",
                  }} />
                ))}
              </div>

              <div style={{ fontSize: 9, color: C.purple3, marginBottom: 8 }}>
                {maxed ? "Fully upgraded" : u.effect(lvl)}
              </div>

              <motion.button
                whileTap={canAfford ? { scale: 0.95 } : {}}
                onClick={() => canAfford && onUpgrade(u.id)}
                style={{
                  width: "100%", padding: "8px 6px", borderRadius: 10,
                  border: `1px solid ${canAfford ? C.gold + "66" : C.border}`,
                  background: canAfford
                    ? `linear-gradient(135deg, ${C.gold}22, ${C.gold2}11)`
                    : maxed ? `${C.gold}0d` : C.card3,
                  color: canAfford ? C.gold2 : maxed ? C.gold3 : C.text4,
                  fontSize: 10, fontWeight: 900, cursor: canAfford ? "pointer" : "default",
                  letterSpacing: "0.04em",
                  transition: "all 0.2s",
                }}
              >
                {maxed ? "✓ Maxed" : `${cost.toLocaleString()} 🪙`}
              </motion.button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Tap Bot panel – shows auto-earn status & collection button
───────────────────────────────────────────────────────────────────────── */
function TapBotPanel({ botLevel, botAccumulated, botLastCollected, onCollect }) {
  if (botLevel === 0) return null;

  const coinsPerHour = botLevel * 200;
  const hoursSince   = botLastCollected
    ? Math.min(12, (Date.now() - botLastCollected) / 3600000)
    : 0;
  const readyToCollect = botAccumulated > 0;
  const pct = Math.min(1, hoursSince / 12);

  return (
    <div style={{
      marginLeft: 16, marginRight: 16,
      background: `linear-gradient(135deg, #0d1520, #0a1018)`,
      border: `1px solid ${C.cyan}33`, borderRadius: 16,
      padding: "16px 16px", boxShadow: `0 2px 20px ${C.cyan}11`,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Bot size={14} color={C.cyan} />
        <span style={{ fontSize: 12, fontWeight: 900, color: C.cyan, letterSpacing: "0.06em" }}>TAP BOT</span>
        <span style={{
          fontSize: 8, fontWeight: 700, color: C.green,
          background: `${C.green}22`, border: `1px solid ${C.green}44`,
          borderRadius: 8, padding: "2px 7px", letterSpacing: "0.1em",
        }}>ACTIVE</span>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 900, color: C.text }}>
            {botAccumulated.toLocaleString()} 🪙
          </div>
          <div style={{ fontSize: 9, color: C.text3, marginTop: 2 }}>
            {coinsPerHour.toLocaleString()}/hr · 12h cycle
          </div>
        </div>
        <motion.button
          whileTap={readyToCollect ? { scale: 0.95 } : {}}
          onClick={() => readyToCollect && onCollect()}
          style={{
            alignSelf: "center",
            padding: "10px 18px", borderRadius: 12,
            border: `1px solid ${readyToCollect ? C.cyan + "66" : C.border}`,
            background: readyToCollect ? `linear-gradient(135deg, ${C.cyan}22, ${C.cyan}11)` : C.card3,
            color: readyToCollect ? C.cyan : C.text4,
            fontSize: 11, fontWeight: 900, cursor: readyToCollect ? "pointer" : "default",
            letterSpacing: "0.04em",
          }}
        >
          {readyToCollect ? "COLLECT" : "Accumulating..."}
        </motion.button>
      </div>

      {/* 12h progress */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 8, color: C.text4, marginBottom: 4 }}>
          <span>Cycle progress</span>
          <span>{(pct * 100).toFixed(0)}% / 12h</span>
        </div>
        <div style={{ height: 5, borderRadius: 3, background: "#1a1a1a", overflow: "hidden" }}>
          <motion.div
            animate={{ width: `${pct * 100}%` }}
            transition={{ duration: 1 }}
            style={{ height: "100%", borderRadius: 3, background: `linear-gradient(90deg, ${C.cyan}88, ${C.cyan})` }}
          />
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Swap panel – manual atomic swap of VAULT → NOT / HMSTR / CATI
───────────────────────────────────────────────────────────────────────── */
function SwapPanel({ balance, cryptoWallets, onSwap }) {
  const [selectedToken, setSelectedToken] = useState(SWAP_TOKENS[0]);
  const [vaultAmount,   setVaultAmount]   = useState("");
  const [swapStatus,    setSwapStatus]    = useState(null); // null | "pending" | "success" | "error"
  const [statusMsg,     setStatusMsg]     = useState("");

  const vaultNum   = parseFloat(vaultAmount) || 0;
  const receiveAmt = vaultNum > 0 ? (vaultNum / VAULT_PER_USD * selectedToken.rate).toFixed(6) : "0.000000";
  const canSwap    = vaultNum >= 100 && vaultNum <= balance;

  const handleSwap = async () => {
    if (!canSwap || swapStatus === "pending") return;
    setSwapStatus("pending");
    setStatusMsg("Processing atomic transaction...");

    // Simulate server-side atomic tx (replace with real API call)
    await new Promise(r => setTimeout(r, 1800));

    const success = Math.random() > 0.05; // 95% success sim
    if (success) {
      onSwap(selectedToken.id, vaultNum, parseFloat(receiveAmt));
      setSwapStatus("success");
      setStatusMsg(`Swapped ${vaultNum.toLocaleString()} 🪙 → ${receiveAmt} ${selectedToken.symbol}`);
      setVaultAmount("");
    } else {
      setSwapStatus("error");
      setStatusMsg("Transaction failed. Please try again.");
    }
    setTimeout(() => setSwapStatus(null), 3500);
  };

  return (
    <div style={{ marginLeft: 16, marginRight: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <ArrowRightLeft size={14} color={C.purple3} />
        <span style={{ fontSize: 13, fontWeight: 900, color: C.text, letterSpacing: "0.04em" }}>SWAP</span>
        <span style={{ fontSize: 9, color: C.text3 }}>Manual · Atomic</span>
      </div>

      <div style={{
        background: `linear-gradient(145deg, ${C.card2}, ${C.card})`,
        border: `1px solid ${C.border}`, borderRadius: 16, padding: "16px",
      }}>
        {/* Token selector */}
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          {SWAP_TOKENS.map(t => (
            <motion.button
              key={t.id}
              whileTap={{ scale: 0.94 }}
              onClick={() => setSelectedToken(t)}
              style={{
                flex: 1, padding: "9px 4px", borderRadius: 10,
                border: `1px solid ${selectedToken.id === t.id ? t.color + "88" : C.border}`,
                background: selectedToken.id === t.id ? `${t.color}18` : C.card3,
                color: selectedToken.id === t.id ? t.color : C.text3,
                fontSize: 10, fontWeight: 800, cursor: "pointer", letterSpacing: "0.04em",
              }}
            >
              {t.symbol}
            </motion.button>
          ))}
        </div>

        {/* From: VAULT */}
        <div style={{ marginBottom: 6 }}>
          <div style={{ fontSize: 9, color: C.text3, marginBottom: 6, letterSpacing: "0.08em" }}>FROM</div>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: C.card3, border: `1px solid ${C.border}`, borderRadius: 10, padding: "10px 12px",
          }}>
            <span style={{ fontSize: 13, color: C.gold2, fontWeight: 800 }}>VAULT 🪙</span>
            <input
              type="number"
              placeholder="0"
              value={vaultAmount}
              onChange={e => setVaultAmount(e.target.value)}
              style={{
                background: "transparent", border: "none", outline: "none",
                color: C.text, fontSize: 15, fontWeight: 700, textAlign: "right",
                width: 120, fontVariantNumeric: "tabular-nums",
              }}
            />
          </div>
          <div style={{ fontSize: 9, color: C.text4, textAlign: "right", marginTop: 4 }}>
            Available: {balance.toLocaleString()} 🪙
          </div>
        </div>

        {/* Arrow */}
        <div style={{ textAlign: "center", fontSize: 16, color: C.text4, marginBottom: 6 }}>↓</div>

        {/* To: selected crypto */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, color: C.text3, marginBottom: 6, letterSpacing: "0.08em" }}>TO</div>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            background: C.card3, border: `1px solid ${selectedToken.color}33`, borderRadius: 10, padding: "10px 12px",
          }}>
            <span style={{ fontSize: 13, color: selectedToken.color, fontWeight: 800 }}>{selectedToken.symbol}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.text, fontVariantNumeric: "tabular-nums" }}>
              {receiveAmt}
            </span>
          </div>
          <div style={{ fontSize: 9, color: C.text4, textAlign: "right", marginTop: 4 }}>
            Balance: {(cryptoWallets[selectedToken.id] || 0).toFixed(6)} {selectedToken.symbol}
          </div>
        </div>

        {/* Rate info */}
        <div style={{
          display: "flex", justifyContent: "space-between", fontSize: 9, color: C.text4,
          background: C.card3, borderRadius: 8, padding: "6px 10px", marginBottom: 14,
        }}>
          <span>Rate</span>
          <span>1,000 VAULT ≈ {selectedToken.rate.toFixed(3)} {selectedToken.symbol}</span>
        </div>

        {/* Swap status */}
        <AnimatePresence>
          {swapStatus && (
            <motion.div
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              style={{
                marginBottom: 12, padding: "10px 12px", borderRadius: 10,
                background: swapStatus === "success"
                  ? `${C.green}18` : swapStatus === "error"
                  ? `${C.red}18` : `${C.cyan}18`,
                border: `1px solid ${swapStatus === "success" ? C.green : swapStatus === "error" ? C.red : C.cyan}44`,
                fontSize: 10, color: swapStatus === "success" ? C.green : swapStatus === "error" ? C.red : C.cyan,
                textAlign: "center",
              }}
            >
              {swapStatus === "pending" && "⏳ "}{swapStatus === "success" && "✓ "}{swapStatus === "error" && "✗ "}
              {statusMsg}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Minimum notice */}
        {vaultNum > 0 && vaultNum < 100 && (
          <div style={{ fontSize: 9, color: C.red, textAlign: "center", marginBottom: 8 }}>
            Minimum swap: 100 VAULT tokens
          </div>
        )}

        {/* Swap button */}
        <motion.button
          whileTap={canSwap ? { scale: 0.97 } : {}}
          onClick={handleSwap}
          disabled={!canSwap || swapStatus === "pending"}
          style={{
            width: "100%", padding: "14px", borderRadius: 12,
            border: `1px solid ${canSwap ? selectedToken.color + "66" : C.border}`,
            background: canSwap
              ? `linear-gradient(135deg, ${selectedToken.color}22, ${selectedToken.color}11)`
              : C.card3,
            color: canSwap ? selectedToken.color : C.text4,
            fontSize: 13, fontWeight: 900, cursor: canSwap ? "pointer" : "not-allowed",
            letterSpacing: "0.06em",
            transition: "all 0.2s",
          }}
        >
          {swapStatus === "pending"
            ? "PROCESSING..."
            : `SWAP TO ${selectedToken.symbol}`}
        </motion.button>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Auth Gate Modal (bottom sheet)
───────────────────────────────────────────────────────────────────────── */
function AuthGateModal({ pair, onClose, onNavigate }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "flex-end", justifyContent: "center", background: "rgba(0,0,0,0.82)", backdropFilter: "blur(6px)" }}
      onPointerDown={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
        onPointerDown={e => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480,
          background: "linear-gradient(160deg, #141414, #0c0c0c)",
          border: `1px solid ${C.border2}`, borderBottom: "none",
          borderRadius: "24px 24px 0 0", padding: "28px 24px 48px",
          boxShadow: `0 -8px 48px #000a, 0 -2px 0 ${pair.color}33 inset`,
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border2, margin: "0 auto 24px" }} />

        <div style={{
          width: 60, height: 60, borderRadius: "50%",
          background: `linear-gradient(135deg, ${pair.color}22, ${pair.color}0a)`,
          border: `1px solid ${pair.color}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px", boxShadow: `0 0 24px ${pair.color}33`,
        }}>
          <Lock size={26} color={pair.color} strokeWidth={2.5} />
        </div>

        <h3 style={{ margin: "0 0 8px", textAlign: "center", fontSize: 20, fontWeight: 900, color: C.text }}>
          Start Mining {pair.name}
        </h3>
        <p style={{ margin: "0 0 28px", textAlign: "center", fontSize: 13, color: C.text3, lineHeight: 1.6 }}>
          Create a free account to begin earning{" "}
          <span style={{ color: pair.color, fontWeight: 700 }}>+{pair.rate} VAULT🪙</span> per tap.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate("register")}
            style={{
              width: "100%", padding: "16px", borderRadius: 14, border: "none",
              background: `linear-gradient(135deg, ${pair.color}, ${C.gold})`,
              color: "#000", fontSize: 15, fontWeight: 900, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: `0 4px 20px ${pair.color}55`,
            }}
          >
            <UserPlus size={17} strokeWidth={2.5} />
            Create Free Account
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate("login")}
            style={{
              width: "100%", padding: "15px", borderRadius: 14,
              border: `1px solid ${C.border2}`, background: C.card2,
              color: C.text2, fontSize: 14, fontWeight: 700, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}
          >
            <LogIn size={16} strokeWidth={2} />
            Sign In
          </motion.button>
        </div>

        <button
          onClick={onClose}
          style={{
            position: "absolute", top: 20, right: 20, background: C.card3,
            border: `1px solid ${C.border}`, borderRadius: "50%",
            width: 32, height: 32, display: "flex", alignItems: "center",
            justifyContent: "center", cursor: "pointer", color: C.text3,
          }}
        >
          <X size={15} />
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Section tab nav
───────────────────────────────────────────────────────────────────────── */
function TabNav({ activeTab, onTab }) {
  const tabs = [
    { id: "mine",     label: "Mine",     emoji: "⛏️" },
    { id: "upgrades", label: "Upgrades", emoji: "⬆️" },
    { id: "swap",     label: "Swap",     emoji: "🔄" },
  ];
  return (
    <div style={{ display: "flex", gap: 0, marginLeft: 16, marginRight: 16, background: C.card, borderRadius: 14, padding: 4, border: `1px solid ${C.border}` }}>
      {tabs.map(t => (
        <motion.button
          key={t.id}
          whileTap={{ scale: 0.96 }}
          onClick={() => onTab(t.id)}
          style={{
            flex: 1, padding: "9px 4px", borderRadius: 11,
            border: "none",
            background: activeTab === t.id
              ? `linear-gradient(135deg, ${C.gold}22, ${C.purple}22)`
              : "transparent",
            color: activeTab === t.id ? C.gold2 : C.text3,
            fontSize: 11, fontWeight: 800, cursor: "pointer",
            letterSpacing: "0.04em",
            boxShadow: activeTab === t.id ? `0 0 10px ${C.gold}22` : "none",
            transition: "all 0.2s",
          }}
        >
          {t.emoji} {t.label}
        </motion.button>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Main Mining component
   Props:
     user               – { email } | null
     onNavigateSignUp   – () => void
     onNavigateSignIn   – () => void
───────────────────────────────────────────────────────────────────────── */
export default function Mining({ user, onNavigateSignUp, onNavigateSignIn }) {
  const [selectedPair,  setSelectedPair]  = useState(MINING_PAIRS[0]);
  const [balance,       setBalance]       = useState(0);
  const [energy,        setEnergy]        = useState(BASE_MAX_ENERGY);
  const [sessionEarned, setSessionEarned] = useState(0);
  const [tapCount,      setTapCount]      = useState(0);
  const [particles,     setParticles]     = useState([]);
  const [showAuthGate,  setShowAuthGate]  = useState(false);
  const [activeTab,     setActiveTab]     = useState("mine");

  // Upgrade levels: { multitap: 0, energyLimit: 0, rechargeSpeed: 0, tapBot: 0 }
  const [upgradeLevels, setUpgradeLevels] = useState({
    multitap: 0, energyLimit: 0, rechargeSpeed: 0, tapBot: 0,
  });

  // Tap Bot state
  const [botAccumulated,  setBotAccumulated]  = useState(0);
  const [botLastCollected, setBotLastCollected] = useState(null);

  // Crypto wallets (received from swaps)
  const [cryptoWallets, setCryptoWallets] = useState({ not: 0, hmstr: 0, cati: 0 });

  const balanceRef   = useRef(0);
  const debounceTimer = useRef(null);
  const particleId   = useRef(0);

  const isGuest = !user?.email;

  // Derived upgrade values
  const multitapLevel    = upgradeLevels.multitap;
  const rewardPerTap     = (1 + multitapLevel) * selectedPair.rate;
  const maxEnergy        = BASE_MAX_ENERGY + upgradeLevels.energyLimit * 500;
  const regenRate        = BASE_REGEN_RATE  + upgradeLevels.rechargeSpeed;
  const botLevel         = upgradeLevels.tapBot;
  const coinsPerHour     = botLevel * 200;
  const exhausted        = !isGuest && energy < ENERGY_COST;

  /* Load persisted balance */
  useEffect(() => {
    if (!user?.email) return;
    (async () => {
      const { data } = await supabase
        .from("mining")
        .select("balance, upgrade_levels, crypto_wallets, bot_accumulated, bot_last_collected")
        .eq("user_email", user.email)
        .single();
      if (data) {
        if (data.balance != null) { setBalance(data.balance); balanceRef.current = data.balance; }
        if (data.upgrade_levels) setUpgradeLevels(data.upgrade_levels);
        if (data.crypto_wallets) setCryptoWallets(data.crypto_wallets);
        if (data.bot_accumulated) setBotAccumulated(data.bot_accumulated);
        if (data.bot_last_collected) setBotLastCollected(data.bot_last_collected);
      }
    })();
  }, [user?.email]);

  /* Energy regeneration */
  useEffect(() => {
    const id = setInterval(() => {
      setEnergy(e => Math.min(maxEnergy, e + regenRate));
    }, 1000);
    return () => clearInterval(id);
  }, [maxEnergy, regenRate]);

  /* Tap Bot accumulation */
  useEffect(() => {
    if (botLevel === 0) return;
    const id = setInterval(() => {
      setBotAccumulated(prev => {
        const maxAccumulate = coinsPerHour * 12;
        return Math.min(prev + coinsPerHour / 3600, maxAccumulate);
      });
    }, 1000);
    return () => clearInterval(id);
  }, [botLevel, coinsPerHour]);

  /* Debounced Supabase upsert */
  const syncToSupabase = useCallback((newBalance, newUpgrades, newWallets) => {
    if (!user?.email) return;
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(async () => {
      await supabase.from("mining").upsert({
        user_email: user.email,
        balance: newBalance,
        upgrade_levels: newUpgrades,
        crypto_wallets: newWallets,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_email" });
    }, SUPABASE_DEBOUNCE);
  }, [user?.email]);

  /* Tap handler */
  const handleTap = useCallback((e) => {
    if (isGuest) { setShowAuthGate(true); return; }
    if (energy < ENERGY_COST) return;

    const earned    = rewardPerTap;
    const newBalance = balanceRef.current + earned;
    balanceRef.current = newBalance;

    setBalance(newBalance);
    setEnergy(en => Math.max(0, en - ENERGY_COST));
    setSessionEarned(s => s + earned);
    setTapCount(t => t + 1);
    syncToSupabase(newBalance, upgradeLevels, cryptoWallets);

    const rect = e.currentTarget
      ? e.currentTarget.getBoundingClientRect()
      : { left: 0, top: 0, width: 0, height: 0 };
    const cx = rect.left + rect.width  / 2;
    const cy = rect.top  + rect.height / 2;
    const px = cx + (Math.random() - 0.5) * 50;
    const py = cy + (Math.random() - 0.5) * 50;

    const pid = particleId.current++;
    setParticles(prev => [...prev, { id: pid, x: px, y: py, amount: earned }]);
  }, [isGuest, energy, rewardPerTap, syncToSupabase, upgradeLevels, cryptoWallets]);

  const removeParticle = useCallback(id => {
    setParticles(prev => prev.filter(p => p.id !== id));
  }, []);

  /* Upgrade purchase */
  const handleUpgrade = useCallback((upgradeId) => {
    const lvl  = upgradeLevels[upgradeId] || 0;
    const cost = getUpgradeCost(upgradeId, lvl);
    if (balanceRef.current < cost) return;

    const newBalance  = balanceRef.current - cost;
    balanceRef.current = newBalance;
    setBalance(newBalance);

    const newUpgrades = { ...upgradeLevels, [upgradeId]: lvl + 1 };
    setUpgradeLevels(newUpgrades);
    syncToSupabase(newBalance, newUpgrades, cryptoWallets);
  }, [upgradeLevels, cryptoWallets, syncToSupabase]);

  /* Tap Bot collect */
  const handleBotCollect = useCallback(() => {
    const collected = Math.floor(botAccumulated);
    if (collected <= 0) return;

    const newBalance = balanceRef.current + collected;
    balanceRef.current = newBalance;
    setBalance(newBalance);
    setBotAccumulated(0);
    setBotLastCollected(Date.now());
    syncToSupabase(newBalance, upgradeLevels, cryptoWallets);
  }, [botAccumulated, upgradeLevels, cryptoWallets, syncToSupabase]);

  /* Swap handler – atomic debit VAULT / credit crypto */
  const handleSwap = useCallback((tokenId, vaultAmt, cryptoAmt) => {
    const newBalance = balanceRef.current - vaultAmt;
    if (newBalance < 0) return;
    balanceRef.current = newBalance;
    setBalance(newBalance);

    const newWallets = { ...cryptoWallets, [tokenId]: (cryptoWallets[tokenId] || 0) + cryptoAmt };
    setCryptoWallets(newWallets);
    syncToSupabase(newBalance, upgradeLevels, newWallets);
  }, [cryptoWallets, upgradeLevels, syncToSupabase]);

  /* Auth gate nav */
  const handleNavigate = useCallback((route) => {
    setShowAuthGate(false);
    if (route === "register") onNavigateSignUp?.();
    else onNavigateSignIn?.();
  }, [onNavigateSignUp, onNavigateSignIn]);

  return (
    <div style={{
      background: `linear-gradient(160deg, #0d0818 0%, #07050f 40%, #0a0618 70%, #06040e 100%)`,
      minHeight: "100vh",
      display: "flex", flexDirection: "column", gap: 0,
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
      paddingBottom: 110, position: "relative", overflow: "hidden",
    }}>
      {/* ── Background orbs ── */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        {[
          { t: "-10%", l: "-15%", w: 320, h: 320, c: "#7c3aed22" },
          { t:  "5%",  r: "-10%", w: 260, h: 260, c: "#a855f718" },
          { t:  "25%", cx: true,  w: 400, h: 400, c: "#6d28d912" },
          { b:  "8%",  r:  "10%", w: 200, h: 200, c: "#ec489914" },
          { t:  "50%", l:  "20%", w: 160, h: 160, c: "#f59e0b14" },
        ].map((o, i) => (
          <div key={i} style={{
            position: "absolute",
            top: o.t, bottom: o.b, left: o.cx ? "50%" : o.l, right: o.r,
            transform: o.cx ? "translateX(-50%)" : undefined,
            width: o.w, height: o.h, borderRadius: "50%",
            background: `radial-gradient(circle, ${o.c} 0%, transparent 70%)`,
            filter: "blur(50px)",
          }} />
        ))}
      </div>

      {/* ── Header ── */}
      <div style={{
        padding: "18px 16px 14px",
        borderBottom: `1px solid ${C.border}`,
        background: `linear-gradient(180deg, #0d0818ee, ${C.bg}ee)`,
        position: "relative", zIndex: 1,
        display: "flex", alignItems: "center", justifyContent: "space-between",
      }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: C.text, letterSpacing: "-0.02em" }}>
          VAULT{" "}
          <span style={{ color: C.gold2, textShadow: `0 0 20px ${C.gold}66` }}>Tap</span>
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 6,
          background: `${C.gold}11`, border: `1px solid ${C.gold}33`, borderRadius: 20, padding: "4px 10px" }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: C.gold2 }}>🪙</span>
          <span style={{ fontSize: 11, fontWeight: 900, color: C.gold2 }}>{balance.toLocaleString()}</span>
        </div>
      </div>

      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 16, paddingTop: 12 }}>

        {/* ── Pair selector ── */}
        <PairSelector pairs={MINING_PAIRS} selected={selectedPair} onSelect={setSelectedPair} />

        {/* ── Tab Nav ── */}
        <TabNav activeTab={activeTab} onTab={setActiveTab} />

        {/* ── MINE TAB ── */}
        {activeTab === "mine" && (
          <>
            {/* Coin Bag */}
            <div style={{ position: "relative" }}>
              <TapBag
                pair={selectedPair}
                onTap={handleTap}
                exhausted={exhausted}
                upgradeLevel={multitapLevel}
              />
              {isGuest && (
                <div style={{
                  position: "absolute", top: 12, right: 24,
                  display: "flex", alignItems: "center", gap: 5,
                  background: "#0f0f0fcc", border: `1px solid ${C.border2}`,
                  borderRadius: 20, padding: "5px 10px", backdropFilter: "blur(8px)",
                }}>
                  <Lock size={11} color={C.gold2} strokeWidth={2.5} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: C.gold2, letterSpacing: "0.08em" }}>
                    SIGN IN TO MINE
                  </span>
                </div>
              )}
            </div>

            {/* Stats */}
            <StatsStrip balance={balance} sessionEarned={sessionEarned} taps={tapCount} />

            {/* Asset info */}
            <AssetInfo pair={selectedPair} balance={balance} />

            {/* Energy */}
            <EnergyBar energy={energy} max={maxEnergy} regenRate={regenRate} />

            {/* Tap Bot panel (only if unlocked) */}
            {botLevel > 0 && (
              <TapBotPanel
                botLevel={botLevel}
                botAccumulated={Math.floor(botAccumulated)}
                botLastCollected={botLastCollected}
                onCollect={handleBotCollect}
              />
            )}

            {/* Reward per tap info */}
            <div style={{
              marginLeft: 16, marginRight: 16,
              background: C.card, border: `1px solid ${C.border}`,
              borderRadius: 12, padding: "10px 14px",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Info size={12} color={C.purple3} />
                <span style={{ fontSize: 10, color: C.text3 }}>Reward per tap</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 900, color: C.gold2 }}>
                +{rewardPerTap} 🪙
              </span>
            </div>
          </>
        )}

        {/* ── UPGRADES TAB ── */}
        {activeTab === "upgrades" && (
          <>
            {/* Snowball guide */}
            <div style={{
              marginLeft: 16, marginRight: 16, padding: "12px 14px",
              background: `${C.purple}11`, border: `1px solid ${C.purple}33`,
              borderRadius: 12,
            }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: C.purple3, marginBottom: 4 }}>🎯 PROGRESSION GUIDE</div>
              <div style={{ fontSize: 9, color: C.text3, lineHeight: 1.6 }}>
                <span style={{ color: C.gold2 }}>Early:</span> Manual tapping · {" "}
                <span style={{ color: C.gold2 }}>Mid:</span> Multitap + Recharge · {" "}
                <span style={{ color: C.gold2 }}>Late:</span> Tap Bot automation
              </div>
            </div>

            <UpgradesPanel
              upgradeLevels={upgradeLevels}
              balance={balance}
              onUpgrade={handleUpgrade}
            />
          </>
        )}

        {/* ── SWAP TAB ── */}
        {activeTab === "swap" && (
          <SwapPanel
            balance={balance}
            cryptoWallets={cryptoWallets}
            onSwap={handleSwap}
          />
        )}
      </div>

      {/* ── Floating particles ── */}
      <AnimatePresence>
        {particles.map(p => (
          <TapParticle key={p.id} x={p.x} y={p.y} amount={p.amount} onDone={() => removeParticle(p.id)} />
        ))}
      </AnimatePresence>

      {/* ── Auth gate ── */}
      <AnimatePresence>
        {showAuthGate && (
          <AuthGateModal
            pair={selectedPair}
            onClose={() => setShowAuthGate(false)}
            onNavigate={handleNavigate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
