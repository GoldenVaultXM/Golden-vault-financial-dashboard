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

      const id = ++particleId.current;
      setParticles((prev) => [...prev, { id, x: px, y: py, amount: earned }]);

      // Persist
      syncToSupabase(newBalance);
    },
    [energy, selectedPair.rate, syncToSupabase]
  );

  const exhausted = energy < ENERGY_COST;

  const removeParticle = useCallback((id) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  /* ── Memoised pair selector to avoid re-renders ── */
  const pairSelector = useMemo(
    () => (
      <PairSelector
        pairs={MINING_PAIRS}
        selected={selectedPair}
        onSelect={(p) => setSelectedPair(p)}
      />
    ),
    [selectedPair]
  );

  /* ─── Render ────────────────────────────────────────────────────────────── */
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, paddingBottom: 8 }}>

      {/* ── Page Header ── */}
      <div style={{ padding: "20px 0 4px", display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, color: C.text, lineHeight: 1.1 }}>
            Tap <span style={{ color: C.gold }}>Mining</span>
          </div>
          <div style={{ fontSize: 11, color: C.text3, marginTop: 4, letterSpacing: "0.06em", textTransform: "uppercase" }}>
            Simulation only — no real assets
          </div>
        </div>

        {/* Simulation badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            background: `${C.gold}12`,
            border: `1px solid ${C.gold}44`,
            borderRadius: 20,
            padding: "5px 10px",
            flexShrink: 0,
          }}
        >
          <Info size={11} color={C.gold} />
          <span style={{ fontSize: 9, fontWeight: 900, color: C.gold, letterSpacing: "0.12em" }}>
            MINING SIMULATION
          </span>
        </div>
      </div>

      {/* ── Pair selector ── */}
      {pairSelector}

      {/* ── Stats ── */}
      <StatsRow balance={balance} sessionEarned={sessionEarned} taps={tapCount} />

      {/* ── Coin card ── */}
      <div
        style={{
          background: `linear-gradient(160deg, #1a0f00 0%, ${C.bg} 70%)`,
          border: `1px solid ${selectedPair.color}33`,
          borderRadius: 18,
          padding: "10px 16px 18px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Ambient glow behind coin */}
        <div
          style={{
            position: "absolute",
            top: "30%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 220,
            height: 220,
            borderRadius: "50%",
            background: `radial-gradient(${C.gold}1a, transparent 70%)`,
            pointerEvents: "none",
          }}
        />

        {/* Active pair info */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 2 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: selectedPair.color }}>{selectedPair.name}</span>
          <span
            style={{
              fontSize: 9,
              fontWeight: 700,
              background: `${selectedPair.color}22`,
              color: selectedPair.color,
              borderRadius: 10,
              padding: "2px 7px",
              letterSpacing: "0.08em",
            }}
          >
            +{selectedPair.rate} / TAP
          </span>
        </div>

        {/* Coin */}
        <TapCoin pair={selectedPair} onTap={handleTap} exhausted={exhausted} />

        {/* Exhausted message */}
        <AnimatePresence>
          {exhausted && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              style={{ textAlign: "center", fontSize: 11, color: C.red, fontWeight: 700, marginTop: -6, marginBottom: 10 }}
            >
              ⚡ Energy depleted — regenerating…
            </motion.div>
          )}
        </AnimatePresence>

        {/* Energy bar */}
        <EnergyBar energy={energy} max={MAX_ENERGY} />

        {/* Tap prompt */}
        {!exhausted && (
          <motion.div
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            style={{ textAlign: "center", fontSize: 10, color: C.text3, letterSpacing: "0.16em", marginTop: 12, textTransform: "uppercase", fontWeight: 700 }}
          >
            Tap the coin to mine
          </motion.div>
        )}
      </div>

      {/* Disclaimer card */}
      <div
        style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: "12px 14px", display: "flex", alignItems: "flex-start", gap: 10 }}
      >
        <Info size={14} color={C.text3} style={{ flexShrink: 0, marginTop: 1 }} />
        <p style={{ margin: 0, fontSize: 11, color: C.text3, lineHeight: 1.65 }}>
          <span style={{ color: C.gold, fontWeight: 800 }}>Mining Simulation</span> — This feature is
          an educational tap-to-earn simulation for the GoldenVaultXM school project. No real
          cryptocurrency is mined, transferred, or held. Balances exist for demonstration purposes
          only and carry no monetary value.
        </p>
      </div>

      {/* Floating particles */}
      {particles.map((p) => (
        <TapParticle key={p.id} x={p.x} y={p.y} amount={p.amount} onDone={() => removeParticle(p.id)} />
      ))}
    </div>
  );
}
