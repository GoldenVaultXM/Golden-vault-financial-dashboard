/**
 * Mining.jsx  –  GoldenVaultXM Session Mining Module
 *
 * ┌─ Architecture Notes ───────────────────────────────────────────────────┐
 * │  • Mining sessions are timestamp-based (startTime / endTime).          │
 * │  • Remaining time = endTime - Date.now() — survives page refreshes.    │
 * │  • Sessions persisted to Supabase "mining_sessions" table.             │
 * │  • Balance persisted to "mining" table (existing schema preserved).    │
 * │  • Framer Motion drives all animation. No CSS keyframe hacks.          │
 * │  • One active session per user enforced at the application level.      │
 * │  • All intervals cleaned up on unmount.                                │
 * └────────────────────────────────────────────────────────────────────────┘
 *
 * Props
 *   user               – { email: string } | null
 *   onNavigateSignUp   – () => void
 *   onNavigateSignIn   – () => void
 *
 * Supabase table required:
 *   mining_sessions (
 *     id            uuid primary key default gen_random_uuid(),
 *     user_email    text not null,
 *     pair_id       text not null,
 *     pair_label    text not null,
 *     pair_color    text not null,
 *     amount        numeric not null,
 *     duration_ms   bigint not null,
 *     start_time    bigint not null,   -- Date.now() ms
 *     end_time      bigint not null,   -- Date.now() ms
 *     status        text not null,     -- 'active' | 'complete' | 'claimed'
 *     output        numeric,
 *     created_at    timestamptz default now()
 *   )
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useAnimation } from "framer-motion";
import { supabase } from "./supabaseClient";
import {
  Zap, Lock, X, UserPlus, LogIn, ChevronDown,
  CheckCircle, Clock, Activity, TrendingUp, Cpu,
  ArrowRight, Minus, Plus,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────
   Design tokens — preserved from original, extended
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
  greenDim: "#15803d",
  red: "#ef4444",
  text: "#ffffff",
  text2: "#c4b5d8",
  text3: "#6b5a8a",
  text4: "#3d2f5c",
};

/* ─────────────────────────────────────────────────────────────────────────
   Mining pair definitions — preserved from original
───────────────────────────────────────────────────────────────────────── */
const MINING_PAIRS = [
  {
    id: "btc",
    label: "BTC",
    name: "Bitcoin",
    color: "#f7931a",
    outputPerHour: 0.00004,
    decimals: 8,
    symbol: "₿",
    glowColor: "#f7931a",
  },
  {
    id: "eth",
    label: "ETH",
    name: "Ethereum",
    color: "#627eea",
    outputPerHour: 0.00062,
    decimals: 6,
    symbol: "Ξ",
    glowColor: "#627eea",
  },
  {
    id: "sol",
    label: "SOL",
    name: "Solana",
    color: "#9945ff",
    outputPerHour: 0.014,
    decimals: 5,
    symbol: "◎",
    glowColor: "#9945ff",
  },
  {
    id: "xau",
    label: "XAU",
    name: "Gold Spot",
    color: "#d97706",
    outputPerHour: 0.00008,
    decimals: 6,
    symbol: "Au",
    glowColor: "#f59e0b",
  },
];

/* ─────────────────────────────────────────────────────────────────────────
   Duration helpers
───────────────────────────────────────────────────────────────────────── */
const MIN_DURATION_MS = 30 * 60 * 1000;   // 30 min
const MAX_DURATION_MS = 4 * 60 * 60 * 1000; // 4 hours

function formatDuration(ms) {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
  return `${String(m).padStart(2, "0")}m ${String(s).padStart(2, "0")}s`;
}

function formatDurationShort(ms) {
  if (ms <= 0) return "00:00:00";
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function calcEstimatedOutput(pair, amount, durationMs) {
  const hours = durationMs / (1000 * 60 * 60);
  return (pair.outputPerHour * hours * (amount / 100)).toFixed(pair.decimals);
}

/* ─────────────────────────────────────────────────────────────────────────
   AuthGateModal — preserved + polished from original
───────────────────────────────────────────────────────────────────────── */
function AuthGateModal({ pair, onClose, onNavigate }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
      }}
      onPointerDown={onClose}
    >
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", stiffness: 360, damping: 32 }}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 480,
          background: "linear-gradient(160deg, #141420, #0c0c18)",
          border: `1px solid ${C.border2}`,
          borderBottom: "none",
          borderRadius: "24px 24px 0 0",
          padding: "28px 24px 52px",
          boxShadow: `0 -8px 60px #000c, 0 -1px 0 ${pair.color}44 inset`,
          position: "relative",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border2, margin: "0 auto 28px" }} />
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: `radial-gradient(circle, ${pair.color}22, ${pair.color}08)`,
          border: `1px solid ${pair.color}44`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
          boxShadow: `0 0 32px ${pair.color}33`,
        }}>
          <Lock size={26} color={pair.color} strokeWidth={2.5} />
        </div>
        <h3 style={{ margin: "0 0 8px", textAlign: "center", fontSize: 20, fontWeight: 900, color: C.text, letterSpacing: "-0.02em" }}>
          Start Mining {pair.name}
        </h3>
        <p style={{ margin: "0 0 32px", textAlign: "center", fontSize: 13, color: C.text3, lineHeight: 1.6 }}>
          Create a free account to launch mining sessions and track your earnings.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => onNavigate("register")}
            style={{
              width: "100%", padding: "16px", borderRadius: 14, border: "none",
              background: `linear-gradient(135deg, ${pair.color}, ${C.gold2})`,
              color: "#000", fontSize: 15, fontWeight: 900, letterSpacing: "0.04em",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              boxShadow: `0 4px 24px ${pair.color}55`,
            }}>
            <UserPlus size={17} strokeWidth={2.5} /> Create Free Account
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => onNavigate("login")}
            style={{
              width: "100%", padding: "15px", borderRadius: 14,
              border: `1px solid ${C.border2}`, background: C.card2,
              color: C.text2, fontSize: 14, fontWeight: 700, letterSpacing: "0.03em",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
            }}>
            <LogIn size={16} strokeWidth={2} /> Sign In
          </motion.button>
        </div>
        <button onClick={onClose} style={{
          position: "absolute", top: 20, right: 20,
          background: C.card3, border: `1px solid ${C.border}`, borderRadius: "50%",
          width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center",
          cursor: "pointer", color: C.text3,
        }}>
          <X size={15} />
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Mining Configuration Flyer / Modal
───────────────────────────────────────────────────────────────────────── */
function MiningConfigFlyer({ pairs, onStart, onClose }) {
  const [pair, setPair] = useState(pairs[0]);
  const [amount, setAmount] = useState(100);
  const [durationMs, setDurationMs] = useState(60 * 60 * 1000); // default 1h

  const estimatedOutput = calcEstimatedOutput(pair, amount, durationMs);
  const pct = (durationMs - MIN_DURATION_MS) / (MAX_DURATION_MS - MIN_DURATION_MS);

  // Duration label
  const durationLabel = (() => {
    const h = Math.floor(durationMs / 3600000);
    const m = Math.floor((durationMs % 3600000) / 60000);
    const s = Math.floor((durationMs % 60000) / 1000);
    if (h > 0) return `${h}h ${String(m).padStart(2,"0")}m ${String(s).padStart(2,"0")}s`;
    return `${String(m).padStart(2,"0")}m ${String(s).padStart(2,"0")}s`;
  })();

  const handleSlider = (e) => {
    const raw = Number(e.target.value); // 0–100
    const rangeMs = MAX_DURATION_MS - MIN_DURATION_MS;
    const ms = MIN_DURATION_MS + Math.round((raw / 100) * rangeMs);
    setDurationMs(ms);
  };

  const sliderVal = Math.round(pct * 100);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      style={{
        position: "fixed", inset: 0, zIndex: 900,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        background: "rgba(3,2,10,0.92)",
        backdropFilter: "blur(14px)",
      }}
      onPointerDown={onClose}
    >
      <motion.div
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 120, opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 34 }}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: 520,
          background: "linear-gradient(170deg, #111020, #0a0816, #080612)",
          border: `1px solid ${C.border2}`,
          borderTop: `1px solid ${pair.color}33`,
          borderBottom: "none",
          borderRadius: "28px 28px 0 0",
          padding: "0 0 48px",
          boxShadow: `0 -12px 80px #000e, 0 -1px 0 ${pair.color}22 inset`,
          position: "relative",
          maxHeight: "90vh",
          overflowY: "auto",
        }}
      >
        {/* Drag handle */}
        <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border2, margin: "20px auto 0" }} />

        {/* Header */}
        <div style={{ padding: "20px 24px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: "0.18em", marginBottom: 4 }}>
              MINING TERMINAL
            </div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 900, color: C.text, letterSpacing: "-0.03em" }}>
              Configure Session
            </h2>
          </div>
          <button onClick={onClose} style={{
            background: C.card3, border: `1px solid ${C.border}`, borderRadius: "50%",
            width: 36, height: 36, display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: C.text3, flexShrink: 0,
          }}>
            <X size={16} />
          </button>
        </div>

        {/* Pair selector */}
        <div style={{ padding: "24px 24px 0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.text4, letterSpacing: "0.16em", marginBottom: 10 }}>
            MINING PAIR
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
            {pairs.map((p) => {
              const active = p.id === pair.id;
              return (
                <motion.button
                  key={p.id}
                  whileTap={{ scale: 0.94 }}
                  onClick={() => setPair(p)}
                  style={{
                    padding: "12px 8px",
                    borderRadius: 14,
                    border: `1px solid ${active ? p.color + "77" : C.border}`,
                    background: active ? `${p.color}18` : C.card,
                    cursor: "pointer",
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 4,
                    transition: "all 0.18s",
                    boxShadow: active ? `0 0 20px ${p.color}33` : "none",
                  }}
                >
                  <span style={{ fontSize: 18, fontWeight: 900, color: active ? p.color : C.text3, lineHeight: 1 }}>
                    {p.symbol}
                  </span>
                  <span style={{ fontSize: 10, fontWeight: 800, color: active ? p.color : C.text4, letterSpacing: "0.1em" }}>
                    {p.label}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </div>

        {/* Amount input */}
        <div style={{ padding: "20px 24px 0" }}>
          <div style={{ fontSize: 10, fontWeight: 700, color: C.text4, letterSpacing: "0.16em", marginBottom: 10 }}>
            MINING POWER (%)
          </div>
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            background: C.card, border: `1px solid ${C.border}`,
            borderRadius: 14, padding: "8px 12px",
          }}>
            <motion.button whileTap={{ scale: 0.9 }}
              onClick={() => setAmount(Math.max(10, amount - 10))}
              style={{ background: C.card2, border: `1px solid ${C.border2}`, borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, color: C.text2 }}>
              <Minus size={14} />
            </motion.button>
            <div style={{ flex: 1, textAlign: "center" }}>
              <span style={{ fontSize: 28, fontWeight: 900, color: pair.color, fontVariantNumeric: "tabular-nums" }}>
                {amount}
              </span>
              <span style={{ fontSize: 13, color: C.text3, marginLeft: 4 }}>%</span>
            </div>
            <motion.button whileTap={{ scale: 0.9 }}
              onClick={() => setAmount(Math.min(100, amount + 10))}
              style={{ background: C.card2, border: `1px solid ${C.border2}`, borderRadius: 8, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0, color: C.text2 }}>
              <Plus size={14} />
            </motion.button>
          </div>
        </div>

        {/* Duration slider */}
        <div style={{ padding: "20px 24px 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: C.text4, letterSpacing: "0.16em" }}>
              DURATION
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: pair.color, letterSpacing: "0.04em", fontVariantNumeric: "tabular-nums" }}>
              {durationLabel}
            </div>
          </div>
          <div style={{ position: "relative", padding: "4px 0" }}>
            {/* Track bg */}
            <div style={{ height: 6, borderRadius: 3, background: C.border, overflow: "hidden" }}>
              <div style={{
                height: "100%", borderRadius: 3,
                width: `${sliderVal}%`,
                background: `linear-gradient(90deg, ${pair.color}99, ${pair.color})`,
                transition: "width 0.08s",
              }} />
            </div>
            <input
              type="range" min={0} max={100} value={sliderVal}
              onChange={handleSlider}
              style={{
                position: "absolute", inset: 0, opacity: 0,
                width: "100%", cursor: "pointer", margin: 0,
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 10, color: C.text4 }}>30m</span>
            <span style={{ fontSize: 10, color: C.text4 }}>4h max</span>
          </div>
        </div>

        {/* Estimated output */}
        <div style={{ padding: "20px 24px 0" }}>
          <div style={{
            background: `linear-gradient(135deg, ${pair.color}0e, ${C.card})`,
            border: `1px solid ${pair.color}33`,
            borderRadius: 16, padding: "16px 18px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, color: C.text4, letterSpacing: "0.14em", marginBottom: 4 }}>
                ESTIMATED OUTPUT
              </div>
              <div style={{ fontSize: 22, fontWeight: 900, color: pair.color, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
                {estimatedOutput} <span style={{ fontSize: 13, opacity: 0.7 }}>{pair.label}</span>
              </div>
            </div>
            <div style={{
              width: 44, height: 44, borderRadius: "50%",
              background: `${pair.color}18`, border: `1px solid ${pair.color}44`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <TrendingUp size={20} color={pair.color} />
            </div>
          </div>
        </div>

        {/* Start button */}
        <div style={{ padding: "24px 24px 0" }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onStart({ pair, amount, durationMs, estimatedOutput: parseFloat(estimatedOutput) })}
            style={{
              width: "100%", padding: "18px",
              borderRadius: 16, border: "none",
              background: `linear-gradient(135deg, ${pair.color}, ${pair.color}bb)`,
              color: "#000", fontSize: 15, fontWeight: 900,
              letterSpacing: "0.08em", cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
              boxShadow: `0 8px 32px ${pair.color}55, 0 2px 0 #ffffff22 inset`,
            }}
          >
            <Cpu size={18} strokeWidth={2.5} />
            START MINING
            <ArrowRight size={18} strokeWidth={2.5} />
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Mining Engine Core — the central animated machine
───────────────────────────────────────────────────────────────────────── */
function MiningCore({ pair, active, completing }) {
  const color = pair?.color || C.gold2;

  // Orbital particles
  const particles = Array.from({ length: 6 }, (_, i) => ({
    angle: (i / 6) * 360,
    radius: 86,
    delay: i * 0.38,
    size: i % 2 === 0 ? 5 : 3.5,
  }));
  const innerParticles = Array.from({ length: 4 }, (_, i) => ({
    angle: (i / 4) * 360,
    radius: 55,
    delay: i * 0.5,
    size: 3,
  }));

  const coreScale = active ? [1, 1.06, 1] : [1, 1.01, 1];
  const coreDuration = active ? 1.8 : 3.2;
  const ringOpacity = active ? 1 : 0.32;
  const glowIntensity = active ? 1 : 0.18;

  return (
    <div style={{ position: "relative", width: 240, height: 240, flexShrink: 0 }}>
      {/* Ambient ground glow */}
      <motion.div
        animate={{ opacity: active ? [0.45, 0.75, 0.45] : [0.1, 0.14, 0.1], scale: [1, 1.12, 1] }}
        transition={{ repeat: Infinity, duration: active ? 2.2 : 4, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: "50%", left: "50%",
          width: 300, height: 300,
          transform: "translate(-50%,-50%)",
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${color}55 0%, ${color}18 40%, transparent 70%)`,
          filter: "blur(28px)",
          pointerEvents: "none",
        }}
      />

      {/* Ring 1 — outermost, slow CW */}
      <motion.div
        animate={{ rotate: completing ? [0, 360] : active ? [0, 360] : 0 }}
        transition={completing
          ? { duration: 8, ease: "easeOut", repeat: 0 }
          : { repeat: Infinity, duration: active ? 14 : 0, ease: "linear" }}
        style={{
          position: "absolute", inset: 0,
          borderRadius: "50%",
          border: `1px solid ${color}${active ? "55" : "1a"}`,
          boxShadow: active ? `0 0 18px ${color}33` : "none",
          transition: "border-color 0.8s, box-shadow 0.8s",
        }}
      >
        {/* Ring 1 tick marks */}
        {[0, 90, 180, 270].map((deg) => (
          <div key={deg} style={{
            position: "absolute", top: "50%", left: "50%",
            width: 8, height: 2,
            background: active ? color : C.border,
            borderRadius: 1,
            opacity: active ? 0.9 : 0.3,
            transform: `rotate(${deg}deg) translateX(112px) translateY(-50%)`,
            transformOrigin: "0 50%",
            transition: "background 0.8s, opacity 0.8s",
          }} />
        ))}
      </motion.div>

      {/* Ring 2 — mid outer, faster CCW */}
      <motion.div
        animate={{ rotate: active ? [360, 0] : 0 }}
        transition={{ repeat: Infinity, duration: active ? 8, : 0, ease: "linear" }}
        style={{
          position: "absolute", inset: 20,
          borderRadius: "50%",
          border: `1.5px solid ${color}${active ? "77" : "22"}`,
          borderTopColor: active ? color : "transparent",
          borderRightColor: active ? `${color}44` : "transparent",
          boxShadow: active ? `0 0 24px ${color}44, inset 0 0 14px ${color}1a` : "none",
          transition: "border-color 0.8s, box-shadow 0.8s",
        }}
      />

      {/* Ring 3 — mid CW, segmented */}
      <motion.div
        animate={{ rotate: active ? [0, 360] : 0 }}
        transition={{ repeat: Infinity, duration: active ? 5.5 : 0, ease: "linear" }}
        style={{
          position: "absolute", inset: 38,
          borderRadius: "50%",
          border: `2px solid transparent`,
          borderTopColor: active ? color : C.border,
          borderRightColor: active ? `${color}88` : "transparent",
          boxShadow: active ? `0 0 16px ${color}55` : "none",
          transition: "border-color 0.8s, box-shadow 0.8s",
        }}
      />

      {/* Ring 4 — inner CCW, thick glow ring */}
      <motion.div
        animate={{ rotate: active ? [360, 0] : 0 }}
        transition={{ repeat: Infinity, duration: active ? 3.8 : 0, ease: "linear" }}
        style={{
          position: "absolute", inset: 56,
          borderRadius: "50%",
          border: `2px solid ${color}${active ? "99" : "22"}`,
          borderBottomColor: active ? `${color}44` : "transparent",
          boxShadow: active ? `0 0 20px ${color}66, inset 0 0 20px ${color}22` : "none",
          transition: "border-color 0.8s, box-shadow 0.8s",
        }}
      />

      {/* Orbital particles — outer */}
      {active && particles.map((p, i) => (
        <motion.div
          key={i}
          animate={{ rotate: [p.angle, p.angle + 360] }}
          transition={{ repeat: Infinity, duration: 7 + i * 0.4, ease: "linear", delay: p.delay }}
          style={{ position: "absolute", inset: 0, borderRadius: "50%" }}
        >
          <div style={{
            position: "absolute",
            top: "50%", left: "50%",
            width: p.size, height: p.size,
            borderRadius: "50%",
            background: color,
            boxShadow: `0 0 8px ${color}, 0 0 16px ${color}88`,
            transform: `translate(-50%, -${p.radius}px)`,
          }} />
        </motion.div>
      ))}

      {/* Orbital particles — inner */}
      {active && innerParticles.map((p, i) => (
        <motion.div
          key={`in-${i}`}
          animate={{ rotate: [p.angle + 180, p.angle - 180] }}
          transition={{ repeat: Infinity, duration: 4.5 + i * 0.3, ease: "linear", delay: p.delay }}
          style={{ position: "absolute", inset: 0, borderRadius: "50%" }}
        >
          <div style={{
            position: "absolute",
            top: "50%", left: "50%",
            width: p.size, height: p.size,
            borderRadius: "50%",
            background: `${color}cc`,
            boxShadow: `0 0 6px ${color}`,
            transform: `translate(-50%, -${p.radius}px)`,
          }} />
        </motion.div>
      ))}

      {/* Central core */}
      <div style={{
        position: "absolute", inset: 72,
        borderRadius: "50%",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <motion.div
          animate={{ scale: coreScale, opacity: active ? [0.85, 1, 0.85] : [0.3, 0.35, 0.3] }}
          transition={{ repeat: Infinity, duration: coreDuration, ease: "easeInOut" }}
          style={{
            width: "100%", height: "100%",
            borderRadius: "50%",
            background: active
              ? `radial-gradient(circle at 38% 32%, ${color}ee, ${color}99 50%, ${color}44)`
              : `radial-gradient(circle, #1e1535, #0e0a1c)`,
            boxShadow: active
              ? `0 0 32px ${color}88, 0 0 64px ${color}44, inset 0 2px 0 #ffffff33`
              : `0 0 12px ${color}22`,
            border: `2px solid ${active ? color + "cc" : C.border}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "background 0.8s, box-shadow 0.8s, border-color 0.8s",
          }}
        >
          {/* Core symbol */}
          <motion.span
            animate={{ opacity: active ? [0.7, 1, 0.7] : 0.2 }}
            transition={{ repeat: Infinity, duration: 2.1, ease: "easeInOut" }}
            style={{
              fontSize: 22, fontWeight: 900, color: active ? "#fff" : C.text4,
              textShadow: active ? `0 0 12px #fff8, 0 0 24px ${color}` : "none",
              userSelect: "none",
            }}
          >
            {pair?.symbol || "⬡"}
          </motion.span>
        </motion.div>
      </div>

      {/* Completion flash */}
      {completing && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0, 0.8, 0], scale: [0.8, 1.4, 1.8] }}
          transition={{ duration: 1.4, ease: "easeOut" }}
          style={{
            position: "absolute", inset: 0,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${color}66 0%, transparent 70%)`,
            pointerEvents: "none",
          }}
        />
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Active Mining Panel — shows session details while mining runs
───────────────────────────────────────────────────────────────────────── */
function ActiveMiningPanel({ session, remaining, elapsed, onClaim }) {
  const pair = MINING_PAIRS.find((p) => p.id === session.pair_id) || MINING_PAIRS[0];
  const progress = Math.min(1, elapsed / session.duration_ms);
  const isComplete = session.status === "complete" || remaining <= 0;

  // Live output (interpolated)
  const liveOutput = isComplete
    ? session.output
    : (session.output * progress).toFixed(pair.decimals);

  // Subtle hashrate display
  const [hashFlicker, setHashFlicker] = useState("312.47");
  useEffect(() => {
    if (!isComplete) {
      const id = setInterval(() => {
        const base = 280 + Math.random() * 80;
        setHashFlicker(base.toFixed(2));
      }, 2800);
      return () => clearInterval(id);
    }
  }, [isComplete]);

  return (
    <div style={{ width: "100%", maxWidth: 400, margin: "0 auto" }}>
      {/* Status chip */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
        <motion.div
          animate={isComplete ? {} : { opacity: [0.7, 1, 0.7] }}
          transition={{ repeat: Infinity, duration: 2 }}
          style={{
            display: "inline-flex", alignItems: "center", gap: 7,
            padding: "6px 16px", borderRadius: 20,
            background: isComplete ? `${C.green}18` : `${pair.color}18`,
            border: `1px solid ${isComplete ? C.green + "55" : pair.color + "55"}`,
          }}
        >
          <div style={{
            width: 7, height: 7, borderRadius: "50%",
            background: isComplete ? C.green : pair.color,
            boxShadow: `0 0 8px ${isComplete ? C.green : pair.color}`,
          }} />
          <span style={{
            fontSize: 11, fontWeight: 800, letterSpacing: "0.14em",
            color: isComplete ? C.green : pair.color,
          }}>
            {isComplete ? "MINING COMPLETE" : "MINING ACTIVE"}
          </span>
        </motion.div>
      </div>

      {/* Live output */}
      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.text4, letterSpacing: "0.16em", marginBottom: 6 }}>
          {isComplete ? "TOTAL MINED" : "MINED SO FAR"}
        </div>
        <div style={{ fontSize: 34, fontWeight: 900, color: pair.color, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums" }}>
          {liveOutput}
          <span style={{ fontSize: 16, fontWeight: 700, opacity: 0.65, marginLeft: 6 }}>{pair.label}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ height: 4, borderRadius: 2, background: C.border, overflow: "hidden" }}>
          <motion.div
            animate={{ width: `${Math.round(progress * 100)}%` }}
            transition={{ duration: 1, ease: "linear" }}
            style={{
              height: "100%", borderRadius: 2,
              background: isComplete
                ? `linear-gradient(90deg, ${C.green}99, ${C.green})`
                : `linear-gradient(90deg, ${pair.color}88, ${pair.color})`,
              boxShadow: `0 0 10px ${isComplete ? C.green : pair.color}88`,
            }}
          />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
          <span style={{ fontSize: 10, color: C.text4 }}>0%</span>
          <span style={{ fontSize: 10, color: C.text3 }}>{Math.round(progress * 100)}%</span>
          <span style={{ fontSize: 10, color: C.text4 }}>100%</span>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
        {[
          {
            label: isComplete ? "DURATION" : "REMAINING",
            value: isComplete ? formatDuration(session.duration_ms) : formatDurationShort(Math.max(0, remaining)),
            icon: <Clock size={13} color={pair.color} />,
            mono: true,
          },
          {
            label: "ELAPSED",
            value: formatDurationShort(Math.min(elapsed, session.duration_ms)),
            icon: <Activity size={13} color={C.purple2} />,
            mono: true,
          },
          {
            label: "MINING PAIR",
            value: pair.name,
            icon: <span style={{ fontSize: 12, color: pair.color }}>{pair.symbol}</span>,
            mono: false,
          },
          {
            label: "HASH RATE",
            value: isComplete ? "—" : `${hashFlicker} MH/s`,
            icon: <Cpu size={13} color={C.text3} />,
            mono: true,
          },
        ].map((s) => (
          <div key={s.label} style={{
            background: C.card,
            border: `1px solid ${C.border}`,
            borderRadius: 12, padding: "12px 14px",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 5 }}>
              {s.icon}
              <span style={{ fontSize: 9, fontWeight: 700, color: C.text4, letterSpacing: "0.14em" }}>{s.label}</span>
            </div>
            <div style={{
              fontSize: 13, fontWeight: 800,
              color: C.text2,
              fontVariantNumeric: s.mono ? "tabular-nums" : "normal",
              letterSpacing: s.mono ? "0.02em" : "normal",
            }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Claim button — only when complete */}
      {isComplete && (
        <motion.button
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          whileTap={{ scale: 0.97 }}
          onClick={onClaim}
          style={{
            width: "100%", padding: "18px", borderRadius: 16,
            border: "none",
            background: `linear-gradient(135deg, ${C.green}, ${C.greenDim}dd)`,
            color: "#fff", fontSize: 15, fontWeight: 900,
            letterSpacing: "0.08em", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
            boxShadow: `0 8px 32px ${C.green}44, 0 2px 0 #ffffff22 inset`,
          }}
        >
          <CheckCircle size={18} strokeWidth={2.5} />
          CLAIM {session.output} {pair.label}
        </motion.button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Idle / MINE button screen
───────────────────────────────────────────────────────────────────────── */
function IdleScreen({ pair, onMine, isGuest }) {
  const color = pair?.color || C.gold2;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 16, paddingBottom: 8 }}>
      <MiningCore pair={pair} active={false} completing={false} />
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        style={{ marginTop: 32, width: "100%", maxWidth: 320, padding: "0 24px" }}
      >
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={onMine}
          style={{
            width: "100%", padding: "20px",
            borderRadius: 18, border: `1px solid ${color}44`,
            background: `linear-gradient(135deg, ${color}22, ${color}0a)`,
            color: color, fontSize: 16, fontWeight: 900,
            letterSpacing: "0.14em", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
            boxShadow: `0 4px 40px ${color}22, 0 1px 0 ${color}33 inset`,
            position: "relative", overflow: "hidden",
          }}
        >
          {/* Shimmer sweep */}
          <motion.div
            animate={{ x: ["-100%", "200%"] }}
            transition={{ repeat: Infinity, duration: 2.8, ease: "linear", repeatDelay: 1.2 }}
            style={{
              position: "absolute", top: 0, left: 0, width: "40%", height: "100%",
              background: `linear-gradient(90deg, transparent, ${color}22, transparent)`,
              pointerEvents: "none",
            }}
          />
          <Cpu size={20} strokeWidth={2.5} />
          MINE
        </motion.button>
        <p style={{ textAlign: "center", fontSize: 11, color: C.text4, marginTop: 12, letterSpacing: "0.06em" }}>
          {isGuest ? "Sign in to start a mining session" : "Configure and start a mining session"}
        </p>
      </motion.div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Balance Header Strip
───────────────────────────────────────────────────────────────────────── */
function BalanceStrip({ balance }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 20px 0",
    }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 700, color: C.text4, letterSpacing: "0.16em", marginBottom: 2 }}>
          TOTAL BALANCE
        </div>
        <div style={{ fontSize: 22, fontWeight: 900, color: C.text, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.02em" }}>
          {balance.toFixed(4)}
          <span style={{ fontSize: 12, color: C.text3, marginLeft: 6, fontWeight: 600 }}>GVXM</span>
        </div>
      </div>
      <div style={{
        padding: "8px 14px", borderRadius: 20,
        background: `${C.gold}14`, border: `1px solid ${C.gold}33`,
        display: "flex", alignItems: "center", gap: 6,
      }}>
        <TrendingUp size={13} color={C.gold2} />
        <span style={{ fontSize: 11, fontWeight: 800, color: C.gold2, letterSpacing: "0.08em" }}>VAULT</span>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Main Mining Component
───────────────────────────────────────────────────────────────────────── */
export default function Mining({ user, onNavigateSignUp, onNavigateSignIn }) {
  const [balance, setBalance] = useState(0);
  const [session, setSession] = useState(null);       // active DB session object
  const [remaining, setRemaining] = useState(0);      // ms
  const [elapsed, setElapsed] = useState(0);          // ms
  const [completing, setCompleting] = useState(false);
  const [showConfig, setShowConfig] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [loading, setLoading] = useState(true);

  const timerRef = useRef(null);
  const isGuest = !user?.email;
  const activePair = session
    ? (MINING_PAIRS.find((p) => p.id === session.pair_id) || MINING_PAIRS[0])
    : MINING_PAIRS[0];

  /* ── Load balance from existing "mining" table ── */
  useEffect(() => {
    if (!user?.email) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("mining")
        .select("balance")
        .eq("user_email", user.email)
        .single();
      if (data?.balance != null) setBalance(Number(data.balance));
    })();
  }, [user?.email]);

  /* ── Load active session from "mining_sessions" table ── */
  useEffect(() => {
    if (!user?.email) { setLoading(false); return; }
    (async () => {
      const { data } = await supabase
        .from("mining_sessions")
        .select("*")
        .eq("user_email", user.email)
        .in("status", ["active", "complete"])
        .order("created_at", { ascending: false })
        .limit(1)
        .single();
      if (data) {
        // Check if it finished while user was away
        if (data.status === "active" && Date.now() >= data.end_time) {
          const { data: updated } = await supabase
            .from("mining_sessions")
            .update({ status: "complete" })
            .eq("id", data.id)
            .select()
            .single();
          setSession(updated || { ...data, status: "complete" });
        } else {
          setSession(data);
        }
      }
      setLoading(false);
    })();
  }, [user?.email]);

  /* ── Timestamp-based countdown ticker ── */
  useEffect(() => {
    if (!session || session.status === "claimed") return;
    clearInterval(timerRef.current);

    const tick = () => {
      const now = Date.now();
      const rem = Math.max(0, session.end_time - now);
      const elp = Math.min(session.duration_ms, now - session.start_time);
      setRemaining(rem);
      setElapsed(elp);

      if (rem <= 0 && session.status === "active") {
        // Mark complete in DB
        setSession((prev) => prev ? { ...prev, status: "complete" } : prev);
        setCompleting(true);
        supabase
          .from("mining_sessions")
          .update({ status: "complete" })
          .eq("id", session.id)
          .then(() => setTimeout(() => setCompleting(false), 2000));
        clearInterval(timerRef.current);
      }
    };

    tick();
    timerRef.current = setInterval(tick, 1000);
    return () => clearInterval(timerRef.current);
  }, [session?.id, session?.status]);

  /* ── Start a new mining session ── */
  const handleStart = useCallback(async ({ pair, amount, durationMs, estimatedOutput }) => {
    if (!user?.email) return;
    setShowConfig(false);

    const now = Date.now();
    const newSession = {
      user_email: user.email,
      pair_id: pair.id,
      pair_label: pair.label,
      pair_color: pair.color,
      amount,
      duration_ms: durationMs,
      start_time: now,
      end_time: now + durationMs,
      status: "active",
      output: estimatedOutput,
    };

    const { data, error } = await supabase
      .from("mining_sessions")
      .insert(newSession)
      .select()
      .single();

    if (!error && data) setSession(data);
    else setSession({ ...newSession, id: `local-${now}` }); // graceful fallback
  }, [user?.email]);

  /* ── Claim completed session ── */
  const handleClaim = useCallback(async () => {
    if (!session) return;

    const claimed = session.output || 0;
    const newBalance = balance + claimed;

    // Update session status
    await supabase
      .from("mining_sessions")
      .update({ status: "claimed" })
      .eq("id", session.id);

    // Update balance in existing "mining" table
    await supabase
      .from("mining")
      .upsert(
        { user_email: user.email, balance: newBalance, updated_at: new Date().toISOString() },
        { onConflict: "user_email" }
      );

    setBalance(newBalance);
    setSession(null);
    setRemaining(0);
    setElapsed(0);
  }, [session, balance, user?.email]);

  /* ── Guest mine tap ── */
  const handleMinePress = useCallback(() => {
    if (isGuest) { setShowAuthModal(true); return; }
    if (session && session.status !== "claimed") return; // already running
    setShowConfig(true);
  }, [isGuest, session]);

  const handleNavigate = useCallback((route) => {
    setShowAuthModal(false);
    if (route === "register") onNavigateSignUp?.();
    else onNavigateSignIn?.();
  }, [onNavigateSignUp, onNavigateSignIn]);

  const hasActiveSession = session && session.status !== "claimed";
  const isMiningActive = hasActiveSession && session.status === "active" && remaining > 0;
  const isMiningComplete = hasActiveSession && (session.status === "complete" || remaining <= 0);

  /* ──────────────── RENDER ──────────────── */
  return (
    <div
      style={{
        background: `linear-gradient(160deg, #0d0818 0%, #07050f 40%, #0a0618 70%, #06040e 100%)`,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
        paddingBottom: 100,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── Background orbs ── */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-10%", left: "-15%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, #7c3aed22 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div style={{ position: "absolute", top: "5%", right: "-10%", width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, #a855f718 0%, transparent 70%)", filter: "blur(50px)" }} />
        <div style={{ position: "absolute", top: "25%", left: "50%", transform: "translateX(-50%)", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, #6d28d912 0%, transparent 65%)", filter: "blur(60px)" }} />
        <div style={{ position: "absolute", bottom: "8%", right: "10%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, #ec489914 0%, transparent 70%)", filter: "blur(40px)" }} />
        {/* Active session pair glow */}
        {isMiningActive && (
          <motion.div
            animate={{ opacity: [0.08, 0.16, 0.08] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            style={{
              position: "absolute", top: "10%", left: "50%", transform: "translateX(-50%)",
              width: 500, height: 500, borderRadius: "50%",
              background: `radial-gradient(circle, ${activePair.color}33 0%, transparent 65%)`,
              filter: "blur(50px)",
            }}
          />
        )}
      </div>

      {/* ── Header ── */}
      <div
        style={{
          padding: "18px 20px 14px",
          borderBottom: `1px solid ${C.border}`,
          background: `linear-gradient(180deg, #0d0818ee, ${C.bg}ee)`,
          position: "relative", zIndex: 1,
        }}
      >
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: C.text, letterSpacing: "-0.02em" }}>
          GoldenVault{" "}
          <span style={{ color: C.gold2, textShadow: `0 0 20px ${C.gold}66` }}>Mining</span>
        </h1>
        <div style={{ fontSize: 11, color: C.text4, marginTop: 2, letterSpacing: "0.06em" }}>
          Session-based · Timestamp-anchored · Persistent
        </div>
      </div>

      {/* ── Content ── */}
      <div style={{ position: "relative", zIndex: 1, display: "flex", flexDirection: "column", gap: 0 }}>

        {/* Balance */}
        {!isGuest && (
          <div style={{ padding: "20px 0 8px" }}>
            <BalanceStrip balance={balance} />
          </div>
        )}

        {loading ? (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 280 }}>
            <motion.div
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              style={{ fontSize: 13, color: C.text3, letterSpacing: "0.12em" }}
            >
              INITIALIZING...
            </motion.div>
          </div>
        ) : hasActiveSession ? (
          /* ── Active / Complete session ── */
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px 20px 0" }}>
            {/* Mining Engine */}
            <MiningCore
              pair={activePair}
              active={isMiningActive}
              completing={completing}
            />
            <div style={{ marginTop: 28, width: "100%" }}>
              <ActiveMiningPanel
                session={session}
                remaining={remaining}
                elapsed={elapsed}
                onClaim={handleClaim}
              />
            </div>
          </div>
        ) : (
          /* ── Idle — MINE button ── */
          <div style={{ paddingTop: isGuest ? 32 : 16 }}>
            <IdleScreen
              pair={MINING_PAIRS[0]}
              onMine={handleMinePress}
              isGuest={isGuest}
            />
          </div>
        )}

        {/* Guest sign-in prompt strip */}
        {isGuest && (
          <div style={{ margin: "24px 20px 0", padding: "16px 18px", borderRadius: 16, background: `${C.gold}0a`, border: `1px solid ${C.gold}22`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <Lock size={15} color={C.gold2} />
              <span style={{ fontSize: 12, color: C.text2, fontWeight: 600 }}>Sign in to start mining</span>
            </div>
            <motion.button
              whileTap={{ scale: 0.96 }}
              onClick={() => onNavigateSignIn?.()}
              style={{ padding: "8px 14px", borderRadius: 10, border: `1px solid ${C.gold}44`, background: `${C.gold}18`, color: C.gold2, fontSize: 12, fontWeight: 800, cursor: "pointer", letterSpacing: "0.06em" }}
            >
              SIGN IN
            </motion.button>
          </div>
        )}
      </div>

      {/* ── Config flyer ── */}
      <AnimatePresence>
        {showConfig && (
          <MiningConfigFlyer
            pairs={MINING_PAIRS}
            onStart={handleStart}
            onClose={() => setShowConfig(false)}
          />
        )}
      </AnimatePresence>

      {/* ── Auth modal ── */}
      <AnimatePresence>
        {showAuthModal && (
          <AuthGateModal
            pair={MINING_PAIRS[0]}
            onClose={() => setShowAuthModal(false)}
            onNavigate={handleNavigate}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
