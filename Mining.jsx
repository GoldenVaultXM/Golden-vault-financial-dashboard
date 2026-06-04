/**
 * Mining.jsx  —  GoldenVaultXM Tap-to-Earn Simulation Module
 *
 * ┌─ Architecture Notes ───────────────────────────────────────────────────┐
 * │  • All mining state (balance, energy) is LOCAL to this component.      │
 * │  • Parent app receives zero re-renders from tap events — the component  │
 * │    is fully self-contained and isolated.                                │
 * │  • Supabase sync is debounced (1 500 ms) so rapid taps never flood the  │
 * │    API; only the final resting balance is persisted.                    │
 * │  • Framer Motion drives every animation for consistent 60fps output.   │
 * │  • Energy regenerates at 1 unit/second via a lightweight setInterval.  │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * Props
 *   user  – { email: string } from AuthContext (may be null)
 *           Balance is stored exclusively in the mining table and never
 *           shared with the parent app — fully isolated.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "./supabaseClient";
import { Zap, Cpu, TrendingUp, Info } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────────
   Design tokens (mirror GoldenVaultXM palette)
───────────────────────────────────────────────────────────────────────────── */
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
  text: "#ffffff",
  text2: "#a3a3a3",
  text3: "#525252",
  text4: "#303030",
};

/* ─────────────────────────────────────────────────────────────────────────────
   Mining pair definitions
   logo  – rendered inside the coin face
   rate  – coins earned per tap
   color – accent tint for the pair's card
───────────────────────────────────────────────────────────────────────────── */
const MINING_PAIRS = [
  {
    id: "btc",
    label: "BTC",
    name: "Bitcoin",
    rate: 1,
    color: "#f7931a",
    logo: (
      <svg viewBox="0 0 32 32" width="52" height="52">
        <circle cx="16" cy="16" r="16" fill="#f7931a" />
        <text x="16" y="21" textAnchor="middle" fontSize="14" fontWeight="900" fill="#fff">₿</text>
      </svg>
    ),
  },
  {
    id: "eth",
    label: "ETH",
    name: "Ethereum",
    rate: 2,
    color: "#627eea",
    logo: (
      <svg viewBox="0 0 32 32" width="52" height="52">
        <circle cx="16" cy="16" r="16" fill="#627eea" />
        <text x="16" y="21" textAnchor="middle" fontSize="13" fontWeight="900" fill="#fff">Ξ</text>
      </svg>
    ),
  },
  {
    id: "sol",
    label: "SOL",
    name: "Solana",
    rate: 3,
    color: "#9945ff",
    logo: (
      <svg viewBox="0 0 32 32" width="52" height="52">
        <circle cx="16" cy="16" r="16" fill="#9945ff" />
        <text x="16" y="22" textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff">SOL</text>
      </svg>
    ),
  },
  {
    id: "xau",
    label: "XAU",
    name: "Gold Spot",
    rate: 5,
    color: "#d97706",
    logo: (
      <svg viewBox="0 0 32 32" width="52" height="52">
        <circle cx="16" cy="16" r="16" fill="#d97706" />
        <text x="16" y="21" textAnchor="middle" fontSize="13" fontWeight="900" fill="#000">Au</text>
      </svg>
    ),
  },
];

/* ─────────────────────────────────────────────────────────────────────────────
   Energy constants
───────────────────────────────────────────────────────────────────────────── */
const MAX_ENERGY = 500;
const ENERGY_COST = 10;          // energy consumed per tap
const REGEN_RATE = 1;            // energy units restored per second
const SUPABASE_DEBOUNCE_MS = 1500;

/* ─────────────────────────────────────────────────────────────────────────────
   Floating "+N" particle — rendered for each tap event
───────────────────────────────────────────────────────────────────────────── */
function TapParticle({ x, y, amount, onDone }) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -90, scale: 1.4 }}
      transition={{ duration: 0.85, ease: "easeOut" }}
      onAnimationComplete={onDone}
      style={{
        position: "fixed",
        left: x - 20,
        top: y - 20,
        pointerEvents: "none",
        zIndex: 999,
        fontFamily: "'Courier New', monospace",
        fontWeight: 900,
        fontSize: 22,
        color: C.gold3,
        textShadow: `0 0 12px ${C.gold}cc, 0 0 24px ${C.gold}66`,
        userSelect: "none",
        letterSpacing: "-0.02em",
      }}
    >
      +{amount}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Electric ring — pulsing ring that bursts outward on each tap
───────────────────────────────────────────────────────────────────────────── */
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

/* ─────────────────────────────────────────────────────────────────────────────
   Pair selector pill row
───────────────────────────────────────────────────────────────────────────── */
function PairSelector({ pairs, selected, onSelect }) {
  return (
    <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4 }}>
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
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: active ? p.color : C.text4,
                background: active ? `${p.color}22` : C.card3,
                borderRadius: 10,
                padding: "1px 6px",
              }}
            >
              +{p.rate}/tap
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Energy bar
───────────────────────────────────────────────────────────────────────────── */
function EnergyBar({ energy, max }) {
  const pct = Math.max(0, Math.min(1, energy / max));
  const barColor =
    pct > 0.6 ? C.gold2 : pct > 0.3 ? "#fb923c" : C.red;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Zap size={13} color={barColor} />
          <span style={{ fontSize: 11, fontWeight: 800, color: barColor, letterSpacing: "0.06em" }}>
            ENERGY
          </span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.text2, fontVariantNumeric: "tabular-nums" }}>
          {Math.floor(energy)} / {max}
        </span>
      </div>

      {/* Track */}
      <div
        style={{
          height: 8,
          borderRadius: 4,
          background: C.card3,
          overflow: "hidden",
          border: `1px solid ${C.border}`,
        }}
      >
        <motion.div
          animate={{ width: `${pct * 100}%` }}
          transition={{ type: "spring", stiffness: 180, damping: 24 }}
          style={{
            height: "100%",
            borderRadius: 4,
            background: `linear-gradient(90deg, ${barColor}bb, ${barColor})`,
            boxShadow: `0 0 8px ${barColor}88`,
          }}
        />
      </div>

      <div style={{ fontSize: 10, color: C.text3, textAlign: "right" }}>
        Regenerates {REGEN_RATE}/sec
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Central tap coin
───────────────────────────────────────────────────────────────────────────── */
function TapCoin({ pair, onTap, exhausted }) {
  const [ringKey, setRingKey] = useState(0);

  const handleTap = useCallback(
    (e) => {
      if (exhausted) return;
      onTap(e);
      setRingKey((k) => k + 1);
    },
    [exhausted, onTap]
  );

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "12px 0" }}>
      <motion.div
        whileTap={exhausted ? {} : { scale: 0.88 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        onPointerDown={handleTap}
        style={{
          position: "relative",
          width: 180,
          height: 180,
          borderRadius: "50%",
          cursor: exhausted ? "not-allowed" : "pointer",
          userSelect: "none",
          WebkitUserSelect: "none",
          touchAction: "none",
        }}
      >
        {/* Outer glow ring */}
        <div
          style={{
            position: "absolute",
            inset: -6,
            borderRadius: "50%",
            background: `conic-gradient(from 0deg, ${pair.color}55, ${C.gold}88, ${pair.color}44, ${C.gold2}99, ${pair.color}55)`,
            filter: "blur(8px)",
            opacity: exhausted ? 0.2 : 0.7,
            transition: "opacity 0.3s",
          }}
        />

        {/* Coin body */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: exhausted
              ? `radial-gradient(circle at 38% 32%, #2a2a2a, #111)`
              : `radial-gradient(circle at 38% 32%, ${C.gold3}, ${C.gold}, ${C.goldDim})`,
            boxShadow: exhausted
              ? "none"
              : `0 8px 32px ${C.gold}55, 0 2px 0 #fff3 inset, 0 -4px 0 #0006 inset`,
            border: `3px solid ${exhausted ? C.border : C.gold2}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 4,
            transition: "background 0.4s, box-shadow 0.4s",
            overflow: "hidden",
          }}
        >
          {/* Coin rim detail */}
          <div
            style={{
              position: "absolute",
              inset: 6,
              borderRadius: "50%",
              border: `1.5px solid ${exhausted ? "#333" : "#fff5"}`,
              pointerEvents: "none",
            }}
          />

          {/* Logo */}
          <div style={{ opacity: exhausted ? 0.3 : 1, transition: "opacity 0.3s", zIndex: 1 }}>
            {pair.logo}
          </div>

          {/* Pair label under logo */}
          <span
            style={{
              fontSize: 10,
              fontWeight: 900,
              color: exhausted ? C.text4 : "#000",
              letterSpacing: "0.14em",
              zIndex: 1,
              marginTop: -2,
            }}
          >
            {exhausted ? "RECHARGING" : pair.label}
          </span>
        </div>

        {/* Electric burst ring */}
        <ElectricRing trigger={ringKey} />
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Stats row
───────────────────────────────────────────────────────────────────────────── */
function StatsRow({ balance, sessionEarned, taps }) {
  const stats = [
    { label: "Balance", value: balance.toFixed(2), icon: <TrendingUp size={13} color={C.gold} />, color: C.gold },
    { label: "Session", value: `+${sessionEarned}`, icon: <Zap size={13} color={C.green} />, color: C.green },
    { label: "Taps", value: taps.toLocaleString(), icon: <Cpu size={13} color={C.purple} />, color: C.purple },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: "12px 10px",
            textAlign: "center",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 4 }}>{s.icon}</div>
          <div
            style={{
              fontSize: 15,
              fontWeight: 900,
              color: s.color,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1.1,
            }}
          >
            {s.value}
          </div>
          <div style={{ fontSize: 9, color: C.text3, textTransform: "uppercase", letterSpacing: "0.1em", marginTop: 3 }}>
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────────
   Main Mining component
───────────────────────────────────────────────────────────────────────────── */
export default function Mining({ user }) {
  /* ── State ── */
  const [selectedPair, setSelectedPair] = useState(MINING_PAIRS[0]);
  const [balance, setBalance] = useState(0);
  const [energy, setEnergy] = useState(MAX_ENERGY);
  const [sessionEarned, setSessionEarned] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [particles, setParticles] = useState([]);  // [{id, x, y, amount}]

  /* ── Refs ── */
  const balanceRef = useRef(0);       // latest balance without re-render cost
  const debounceTimer = useRef(null);
  const particleId = useRef(0);

  /* ── Load persisted balance from Supabase on mount ── */
  useEffect(() => {
    if (!user?.email) return;
    (async () => {
      const { data } = await supabase
        .from("mining")
        .select("balance")
        .eq("user_email", user.email)
        .single();
      if (data?.balance != null) {
        setBalance(data.balance);
        balanceRef.current = data.balance;
      }
    })();
  }, [user?.email]);

  /* ── Energy regeneration (1 unit / second) ── */
  useEffect(() => {
    const id = setInterval(() => {
      setEnergy((e) => Math.min(MAX_ENERGY, e + REGEN_RATE));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  /* ── Debounced Supabase upsert ── */
  const syncToSupabase = useCallback(
    (newBalance) => {
      if (!user?.email) return;
      clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(async () => {
        await supabase.from("mining").upsert(
          { user_email: user.email, balance: newBalance, updated_at: new Date().toISOString() },
          { onConflict: "user_email" }
        );
      }, SUPABASE_DEBOUNCE_MS);
    },
    [user?.email]
  );
/**
 * Mining.jsx  –  GoldenVaultXM Tap-to-Earn Module
 *
 * ┌─ Architecture Notes ───────────────────────────────────────────────────┐
 * │  • All mining state (balance, energy) is LOCAL to this component.      │
 * │  • Parent app receives zero re-renders from tap events – the component  │
 * │    is fully self-contained and isolated.                                │
 * │  • Supabase sync is debounced (1 500 ms) so rapid taps never flood the  │
 * │    API; only the final resting balance is persisted.                    │
 * │  • Framer Motion drives every animation for consistent 60fps output.   │
 * │  • Energy regenerates at 1 unit/second via a lightweight setInterval.  │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * Props
 *   user  – { email: string } from AuthContext (may be null)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "./supabaseClient";
import { Zap, Cpu, TrendingUp } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────
   Design tokens
───────────────────────────────────────────────────────────────────────── */
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
  text: "#ffffff",
  text2: "#a3a3a3",
  text3: "#525252",
  text4: "#303030",
};

/* ─────────────────────────────────────────────────────────────────────────
   Mining pair definitions
───────────────────────────────────────────────────────────────────────── */
const MINING_PAIRS = [
  {
    id: "btc",
    label: "BTC",
    name: "Bitcoin",
    rate: 1,
    color: "#f7931a",
    logo: (
      <svg viewBox="0 0 32 32" width="64" height="64">
        <circle cx="16" cy="16" r="16" fill="none" />
        <text x="16" y="22" textAnchor="middle" fontSize="26" fontWeight="900" fill="#000">₿</text>
      </svg>
    ),
  },
  {
    id: "eth",
    label: "ETH",
    name: "Ethereum",
    rate: 2,
    color: "#627eea",
    logo: (
      <svg viewBox="0 0 32 32" width="64" height="64">
        <circle cx="16" cy="16" r="16" fill="none" />
        <text x="16" y="22" textAnchor="middle" fontSize="22" fontWeight="900" fill="#000">Ξ</text>
      </svg>
    ),
  },
  {
    id: "sol",
    label: "SOL",
    name: "Solana",
    rate: 3,
    color: "#9945ff",
    logo: (
      <svg viewBox="0 0 32 32" width="64" height="64">
        <circle cx="16" cy="16" r="16" fill="none" />
        <text x="16" y="22" textAnchor="middle" fontSize="12" fontWeight="900" fill="#000">SOL</text>
      </svg>
    ),
  },
  {
    id: "xau",
    label: "XAU",
    name: "Gold Spot",
    rate: 5,
    color: "#d97706",
    logo: (
      <svg viewBox="0 0 32 32" width="64" height="64">
        <circle cx="16" cy="16" r="16" fill="none" />
        <text x="16" y="22" textAnchor="middle" fontSize="16" fontWeight="900" fill="#000">Au</text>
      </svg>
    ),
  },
];

/* ─────────────────────────────────────────────────────────────────────────
   Energy constants
───────────────────────────────────────────────────────────────────────── */
const MAX_ENERGY = 500;
const ENERGY_COST = 10;
const REGEN_RATE = 1;
const SUPABASE_DEBOUNCE_MS = 1500;

/* ─────────────────────────────────────────────────────────────────────────
   Floating "+N" particle
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
        left: x - 20,
        top: y - 20,
        pointerEvents: "none",
        zIndex: 999,
        fontFamily: "'Courier New', monospace",
        fontWeight: 900,
        fontSize: 22,
        color: C.gold3,
        textShadow: `0 0 12px ${C.gold}cc, 0 0 24px ${C.gold}66`,
        userSelect: "none",
        letterSpacing: "-0.02em",
      }}
    >
      +{amount}
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
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: active ? p.color : C.text4,
                background: active ? `${p.color}22` : C.card3,
                borderRadius: 10,
                padding: "1px 6px",
              }}
            >
              +{p.rate}/tap
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Large floating vault coin – Priority 1 visual
───────────────────────────────────────────────────────────────────────── */
function TapCoin({ pair, onTap, exhausted }) {
  const [ringKey, setRingKey] = useState(0);
  const [pressed, setPressed] = useState(false);

  const handleTap = useCallback(
    (e) => {
      if (exhausted) return;
      onTap(e);
      setRingKey((k) => k + 1);
    },
    [exhausted, onTap]
  );

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        // Coin takes up ~40% of viewport height on mobile
        height: "42vw",
        maxHeight: 320,
        minHeight: 220,
        position: "relative",
      }}
    >
      {/* Ambient outer glow pool */}
      <div
        style={{
          position: "absolute",
          width: "90%",
          height: "90%",
          borderRadius: "50%",
          background: exhausted
            ? "transparent"
            : `radial-gradient(circle, ${pair.color}30 0%, transparent 70%)`,
          filter: "blur(28px)",
          transform: "scale(1.3)",
          transition: "background 0.4s",
          pointerEvents: "none",
        }}
      />

      <motion.div
        whileTap={exhausted ? {} : { scale: 0.87 }}
        transition={{ type: "spring", stiffness: 380, damping: 18 }}
        onPointerDown={handleTap}
        style={{
          position: "relative",
          width: "38vw",
          height: "38vw",
          maxWidth: 260,
          maxHeight: 260,
          minWidth: 180,
          minHeight: 180,
          borderRadius: "50%",
          cursor: exhausted ? "not-allowed" : "pointer",
          userSelect: "none",
          WebkitUserSelect: "none",
          touchAction: "none",
        }}
      >
        {/* Multi-layer conic glow ring */}
        <motion.div
          animate={exhausted ? {} : { rotate: 360 }}
          transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
          style={{
            position: "absolute",
            inset: -8,
            borderRadius: "50%",
            background: exhausted
              ? "none"
              : `conic-gradient(from 0deg, ${pair.color}88, ${C.gold3}cc, ${pair.color}44, ${C.gold2}aa, transparent, ${pair.color}88)`,
            filter: "blur(10px)",
            opacity: exhausted ? 0 : 0.85,
            transition: "opacity 0.4s",
          }}
        />

        {/* Static border ring */}
        <div
          style={{
            position: "absolute",
            inset: -3,
            borderRadius: "50%",
            border: `2px solid ${exhausted ? C.border : C.gold2 + "66"}`,
            pointerEvents: "none",
          }}
        />

        {/* Coin body */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            background: exhausted
              ? `radial-gradient(circle at 38% 32%, #2a2a2a, #111)`
              : `radial-gradient(circle at 35% 28%, ${C.gold3}, ${C.gold2} 40%, ${C.gold} 65%, ${C.goldDim})`,
            boxShadow: exhausted
              ? "none"
              : `0 12px 48px ${C.gold}66, 0 3px 0 #fff4 inset, 0 -6px 0 #0008 inset, 0 0 0 1px ${C.gold}33`,
            border: `3px solid ${exhausted ? C.border : C.gold + "aa"}`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 0,
            transition: "background 0.4s, box-shadow 0.4s",
            overflow: "hidden",
          }}
        >
          {/* Inner rim */}
          <div
            style={{
              position: "absolute",
              inset: 8,
              borderRadius: "50%",
              border: `1.5px solid ${exhausted ? "#333" : "#fff3"}`,
              pointerEvents: "none",
            }}
          />

          {/* Lightning bolt logo overlay */}
          {!exhausted && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: 0.07,
              }}
            >
              <Zap size={100} color="#000" strokeWidth={3} />
            </div>
          )}

          {/* Asset logo */}
          <div style={{ opacity: exhausted ? 0.3 : 1, transition: "opacity 0.3s", zIndex: 1 }}>
            {pair.logo}
          </div>

          {/* Pair label */}
          <span
            style={{
              fontSize: 13,
              fontWeight: 900,
              color: exhausted ? C.text4 : "#000",
              letterSpacing: "0.18em",
              zIndex: 1,
              marginTop: -4,
              textShadow: exhausted ? "none" : "0 1px 0 #fff6",
            }}
          >
            {exhausted ? "RECHARGING" : pair.label}
          </span>
        </div>

        {/* Tap instruction hint when not exhausted */}
        {!exhausted && (
          <motion.div
            animate={{ opacity: [0.4, 0.9, 0.4] }}
            transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
            style={{
              position: "absolute",
              bottom: -32,
              left: "50%",
              transform: "translateX(-50%)",
              fontSize: 9,
              fontWeight: 700,
              letterSpacing: "0.2em",
              color: C.text3,
              whiteSpace: "nowrap",
              textTransform: "uppercase",
            }}
          >
            TAP TO MINE
          </motion.div>
        )}

        {/* Electric burst ring */}
        <ElectricRing trigger={ringKey} />
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Stats strip – Priority 2, glassmorphism dark-metal cards
───────────────────────────────────────────────────────────────────────── */
function StatsStrip({ balance, sessionEarned, taps }) {
  const stats = [
    {
      label: "Balance",
      value: balance.toFixed(2),
      icon: <TrendingUp size={14} color={C.gold2} />,
      color: C.gold2,
    },
    {
      label: "Session",
      value: `+${sessionEarned}`,
      icon: <Zap size={14} color={C.green} />,
      color: C.green,
    },
    {
      label: "Taps",
      value: taps.toLocaleString(),
      icon: <Cpu size={14} color={C.purple} />,
      color: C.purple,
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(3,1fr)",
        gap: 8,
        marginTop: 44,
        paddingLeft: 16,
        paddingRight: 16,
      }}
    >
      {stats.map((s) => (
        <div
          key={s.label}
          style={{
            background: "linear-gradient(145deg, #161616, #0e0e0e)",
            border: `1px solid #282828`,
            borderRadius: 14,
            padding: "14px 8px 12px",
            textAlign: "center",
            boxShadow: "0 2px 12px #00000066, inset 0 1px 0 #ffffff08",
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 5 }}>{s.icon}</div>
          <div
            style={{
              fontSize: 16,
              fontWeight: 900,
              color: s.color,
              fontVariantNumeric: "tabular-nums",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            {s.value}
          </div>
          <div
            style={{
              fontSize: 9,
              color: C.text3,
              textTransform: "uppercase",
              letterSpacing: "0.12em",
              marginTop: 4,
            }}
          >
            {s.label}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Asset info card – Priority 3
───────────────────────────────────────────────────────────────────────── */
function AssetInfo({ pair }) {
  return (
    <div
      style={{
        marginLeft: 16,
        marginRight: 16,
        background: "linear-gradient(135deg, #131313, #0d0d0d)",
        border: `1px solid ${pair.color}22`,
        borderLeft: `3px solid ${pair.color}`,
        borderRadius: 12,
        padding: "12px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div>
        <div style={{ fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: "0.04em" }}>
          {pair.name}
        </div>
        <div style={{ fontSize: 10, color: C.text3, marginTop: 2, letterSpacing: "0.06em" }}>
          Active Mining Pair
        </div>
      </div>
      <div
        style={{
          background: `${pair.color}18`,
          border: `1px solid ${pair.color}44`,
          borderRadius: 20,
          padding: "5px 12px",
          fontSize: 11,
          fontWeight: 900,
          color: pair.color,
          letterSpacing: "0.08em",
        }}
      >
        +{pair.rate} / TAP
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Energy bar – Priority 4
───────────────────────────────────────────────────────────────────────── */
function EnergyBar({ energy, max }) {
  const pct = Math.max(0, Math.min(1, energy / max));
  const barColor = pct > 0.6 ? C.gold2 : pct > 0.3 ? "#fb923c" : C.red;

  return (
    <div
      style={{
        marginLeft: 16,
        marginRight: 16,
        background: "linear-gradient(135deg, #111, #0c0c0c)",
        border: `1px solid ${C.border}`,
        borderRadius: 14,
        padding: "14px 16px",
        boxShadow: "0 2px 12px #00000044",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Zap size={13} color={barColor} fill={barColor} />
          <span style={{ fontSize: 11, fontWeight: 800, color: barColor, letterSpacing: "0.08em" }}>
            ENERGY
          </span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color: C.text2, fontVariantNumeric: "tabular-nums" }}>
          {Math.floor(energy)} / {max}
        </span>
      </div>

      <div
        style={{
          height: 7,
          borderRadius: 4,
          background: "#1a1a1a",
          overflow: "hidden",
          border: `1px solid ${C.border}`,
        }}
      >
        <motion.div
          animate={{ width: `${pct * 100}%` }}
          transition={{ type: "spring", stiffness: 180, damping: 24 }}
          style={{
            height: "100%",
            borderRadius: 4,
            background: `linear-gradient(90deg, ${barColor}99, ${barColor})`,
            boxShadow: `0 0 10px ${barColor}88`,
          }}
        />
      </div>

      <div style={{ fontSize: 10, color: C.text3, textAlign: "right", marginTop: 6, letterSpacing: "0.04em" }}>
        Regenerates {REGEN_RATE}/sec
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Main Mining component
───────────────────────────────────────────────────────────────────────── */
export default function Mining({ user }) {
  const [selectedPair, setSelectedPair] = useState(MINING_PAIRS[0]);
  const [balance, setBalance] = useState(0);
  const [energy, setEnergy] = useState(MAX_ENERGY);
  const [sessionEarned, setSessionEarned] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [particles, setParticles] = useState([]);

  const balanceRef = useRef(0);
  const debounceTimer = useRef(null);
  const particleId = useRef(0);

  /* Load persisted balance */
  useEffect(() => {
    if (!user?.email) return;
    (async () => {
      const { data } = await supabase
        .from("mining")
        .select("balance")
        .eq("user_email", user.email)
        .single();
      if (data?.balance != null) {
        setBalance(data.balance);
        balanceRef.current = data.balance;
      }
    })();
  }, [user?.email]);

  /* Energy regeneration */
  useEffect(() => {
    const id = setInterval(() => {
      setEnergy((e) => Math.min(MAX_ENERGY, e + REGEN_RATE));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  /* Debounced Supabase upsert */
  const syncToSupabase = useCallback(
    (newBalance) => {
      if (!user?.email) return;
      clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(async () => {
        await supabase.from("mining").upsert(
          { user_email: user.email, balance: newBalance, updated_at: new Date().toISOString() },
          { onConflict: "user_email" }
        );
      }, SUPABASE_DEBOUNCE_MS);
    },
    [user?.email]
  );

  /* ── Tap handler ── */
  const handleTap = useCallback(
    (e) => {
      if (energy < ENERGY_COST) return;

      const earned = selectedPair.rate;
      const newBalance = balanceRef.current + earned;
      balanceRef.current = newBalance;

      // State updates (batched by React 18 automatically)
      setBalance(newBalance);
      setEnergy((en) => Math.max(0, en - ENERGY_COST));
      setSessionEarned((s) => s + earned);
      setTapCount((t) => t + 1);

      // Floating particle at touch/click position
      const rect = e.currentTarget
        ? e.currentTarget.getBoundingClientRect()
        : { left: 0, top: 0, width: 0, height: 0 };
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;

      // Scatter particles around center for multi-finger feel
      const spread = 40;
      const px = cx + (Math.random() - 0.5) * spread;
      const py = cy + (Math.random() - 0.5) * spread;

      const id = particleId.current++;
      setParticles((prev) => [...prev, { id, x: px, y: py, amount: earned }]);

      syncToSupabase(newBalance);
    },
    [energy, selectedPair, syncToSupabase]
  );

  const removeParticle = useCallback((id) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const exhausted = energy < ENERGY_COST;

  /* ── Render ── */
  return (
    <div
      style={{
        background: C.bg,
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        gap: 16,
        fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
        paddingBottom: 96,
        overflowX: "hidden",
      }}
    >
      {/* Header */}
      <div style={{ padding: "20px 16px 0" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2
            style={{
              margin: 0,
              fontSize: 22,
              fontWeight: 900,
              color: C.text,
              letterSpacing: "-0.02em",
            }}
          >
            Tap{" "}
            <span style={{ color: C.gold2 }}>Mining</span>
          </h2>
        </div>
      </div>

      {/* Pair selector */}
      <div style={{ paddingLeft: 16, paddingRight: 16 }}>
        <PairSelector pairs={MINING_PAIRS} selected={selectedPair} onSelect={setSelectedPair} />
      </div>

      {/* Stats row */}
      <div style={{ paddingLeft: 16, paddingRight: 16 }}>
        <StatsRow balance={balance} sessionEarned={sessionEarned} taps={tapCount} />
      </div>

      {/* Tap coin */}
      <div
        style={{
          paddingLeft: 16,
          paddingRight: 16,
          background: C.card,
          border: `1px solid ${C.border}`,
          borderRadius: 20,
          marginLeft: 16,
          marginRight: 16,
          paddingTop: 16,
          paddingBottom: 20,
        }}
      >
        {/* Pair name + rate badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: C.text }}>{selectedPair.name}</span>
          <span
            style={{
              fontSize: 10,
              fontWeight: 700,
              color: selectedPair.color,
              background: `${selectedPair.color}1a`,
              border: `1px solid ${selectedPair.color}44`,
              borderRadius: 12,
              padding: "2px 8px",
            }}
          >
            +{selectedPair.rate} / TAP
          </span>
        </div>

        <TapCoin pair={selectedPair} onTap={handleTap} exhausted={exhausted} />

        {/* Energy bar */}
        <div style={{ marginTop: 8 }}>
          <EnergyBar energy={energy} max={MAX_ENERGY} />
        </div>

        {/* Tap hint */}
        {!exhausted && (
          <div
            style={{
              textAlign: "center",
              fontSize: 10,
              color: C.text3,
              fontWeight: 700,
              letterSpacing: "0.16em",
              marginTop: 10,
              textTransform: "uppercase",
            }}
          >
            TAP THE COIN TO MINE
          </div>
        )}
      </div>

      {/* Tap particles */}
      <AnimatePresence>
        {particles.map((p) => (
          <TapParticle
            key={p.id}
            x={p.x}
            y={p.y}
            amount={p.amount}
            onDone={() => removeParticle(p.id)}
          />
        ))}
      </AnimatePresence>
    </div>
  );
         }
