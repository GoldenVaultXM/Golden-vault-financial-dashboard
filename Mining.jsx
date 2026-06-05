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
 * Design: Notcoin-style tap-to-earn interface
 * Symbol: ⚡ lightning bolt (replaces ⚠️ in all instances)
 *
 * Props
 *   user  – { email: string } from AuthContext (may be null)
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "./supabaseClient";
import { ChevronRight, X, UserPlus, LogIn, Zap, Rocket, Coins, Trophy } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────
   Design tokens – Notcoin palette
───────────────────────────────────────────────────────────────────────── */
const C = {
  // Backgrounds
  void: "#0A0A0A",
  charcoal: "#141414",
  warmBlack: "#1A1A1A",
  card: "#1A1A1A",
  card2: "#141414",
  // Accents
  gold: "#FFD700",
  amber: "#FF8C00",
  blue: "#0088FF",
  magenta: "#FF1493",
  pink: "#FFB6C1",
  // Metals
  silverTrophy: "#C0C0C0",
  goldTrophy: "#D4A017",
  darkGold: "#B8860B",
  // Text
  white: "#FFFFFF",
  gray: "#8A8A8A",
  // Utils
  border: "rgba(255,215,0,0.08)",
  border2: "rgba(255,255,255,0.1)",
};

/* ─────────────────────────────────────────────────────────────────────────
   Mining pair definitions
───────────────────────────────────────────────────────────────────────── */
const MINING_PAIRS = [
  { id: "btc", label: "BTC", name: "Bitcoin",    rate: 1, color: "#f7931a" },
  { id: "eth", label: "ETH", name: "Ethereum",   rate: 2, color: "#627eea" },
  { id: "sol", label: "SOL", name: "Solana",     rate: 3, color: "#9945ff" },
  { id: "xau", label: "XAU", name: "Gold Spot",  rate: 5, color: C.gold    },
];

/* ─────────────────────────────────────────────────────────────────────────
   Energy constants
───────────────────────────────────────────────────────────────────────── */
const MAX_ENERGY = 500;
const ENERGY_COST = 10;
const REGEN_RATE = 1;
const SUPABASE_DEBOUNCE_MS = 1500;

/* ─────────────────────────────────────────────────────────────────────────
   Gold dust particle system
───────────────────────────────────────────────────────────────────────── */
function GoldDust() {
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 2 + Math.random() * 2,
    opacity: 0.3 + Math.random() * 0.3,
    blur: Math.random() > 0.7,
    duration: 6 + Math.random() * 6,
    delay: Math.random() * -8,
  }));

  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          animate={{ y: [0, -60, 0], x: [0, Math.sin(p.id) * 12, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
          style={{
            position: "absolute",
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: C.gold,
            opacity: p.opacity,
            filter: p.blur ? "blur(0.5px)" : "none",
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Lightning bolt SVG – the single brand symbol
───────────────────────────────────────────────────────────────────────── */
function LightningBolt({ size = 24, color = C.darkGold, style = {} }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      style={{ display: "block", ...style }}
    >
      <path
        d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"
        fill={color}
        stroke="none"
      />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Tap burst particles
───────────────────────────────────────────────────────────────────────── */
function TapParticle({ x, y, amount, onDone }) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -80, scale: 1.3 }}
      transition={{ duration: 0.75, ease: "easeOut" }}
      onAnimationComplete={onDone}
      style={{
        position: "fixed",
        left: x - 18,
        top: y - 18,
        pointerEvents: "none",
        zIndex: 999,
        fontWeight: 700,
        fontSize: 20,
        color: C.gold,
        textShadow: `0 0 10px ${C.amber}cc`,
        userSelect: "none",
        fontVariantNumeric: "tabular-nums",
      }}
    >
      +{amount}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Tap burst ring
───────────────────────────────────────────────────────────────────────── */
function BurstRing({ trigger }) {
  return (
    <AnimatePresence>
      {trigger && (
        <motion.div
          key={trigger}
          initial={{ scale: 0.8, opacity: 0.8 }}
          animate={{ scale: 1.8, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `3px solid ${C.gold}`,
            boxShadow: `0 0 20px ${C.amber}88`,
            pointerEvents: "none",
          }}
        />
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Gold confetti burst on tap
───────────────────────────────────────────────────────────────────────── */
function ConfettiBurst({ id, onDone }) {
  const dots = Array.from({ length: 14 }, (_, i) => {
    const angle = (i / 14) * 360;
    const rad = (angle * Math.PI) / 180;
    const dist = 60 + Math.random() * 40;
    return {
      tx: Math.cos(rad) * dist,
      ty: Math.sin(rad) * dist,
      size: 4 + Math.random() * 5,
      color: Math.random() > 0.4 ? C.gold : C.amber,
      delay: i * 0.025,
    };
  });

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10 }}>
      {dots.map((d, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 1, scale: 0.4, x: 0, y: 0 }}
          animate={{ opacity: 0, scale: 1.6, x: d.tx, y: d.ty }}
          transition={{ duration: 0.6, delay: d.delay, ease: "easeOut" }}
          onAnimationComplete={i === 0 ? onDone : undefined}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            marginTop: -d.size / 2,
            marginLeft: -d.size / 2,
            width: d.size,
            height: d.size,
            borderRadius: "50%",
            background: d.color,
            boxShadow: `0 0 6px ${d.color}`,
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   The central coin
───────────────────────────────────────────────────────────────────────── */
function TapCoin({ pair, onTap, exhausted, balance }) {
  const [ringKey, setRingKey] = useState(0);
  const [bursts, setBursts] = useState([]);
  const burstId = useRef(0);

  const handleTap = useCallback(
    (e) => {
      onTap(e);
      if (!exhausted) {
        setRingKey((k) => k + 1);
        const bid = burstId.current++;
        setBursts((b) => [...b, bid]);
      }
    },
    [exhausted, onTap]
  );

  const removeBurst = useCallback((id) => {
    setBursts((b) => b.filter((x) => x !== id));
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 340,
        position: "relative",
      }}
    >
      {/* Ambient radial glow */}
      <motion.div
        animate={{ scale: [1, 1.1, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
        style={{
          position: "absolute",
          width: "90%",
          height: "70%",
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${C.amber}30 0%, ${C.gold}15 40%, transparent 70%)`,
          filter: "blur(28px)",
          pointerEvents: "none",
        }}
      />

      {/* Score above coin */}
      <motion.div
        key={balance}
        initial={{ scale: 1.05 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.15 }}
        style={{
          fontVariantNumeric: "tabular-nums",
          fontSize: "clamp(42px, 12vw, 64px)",
          fontWeight: 700,
          color: C.white,
          letterSpacing: "-0.02em",
          textShadow: `0 0 40px ${C.gold}33, 0 2px 4px rgba(0,0,0,0.5)`,
          marginBottom: 4,
          zIndex: 2,
        }}
      >
        {balance.toLocaleString()}
      </motion.div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 28,
          zIndex: 2,
        }}
      >
        <Trophy size={13} color={C.silverTrophy} />
        <span style={{ fontSize: 13, color: C.gray }}>7,352nd</span>
        <span style={{ fontSize: 13, color: C.silverTrophy, marginLeft: 4 }}>Silver</span>
      </div>

      {/* Coin floating wrapper */}
      <motion.div
        animate={{ y: [0, -10, 0] }}
        transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
        style={{ position: "relative", zIndex: 2 }}
      >
        <motion.div
          whileTap={exhausted ? {} : { scale: 0.88 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
          onPointerDown={handleTap}
          style={{
            position: "relative",
            width: "min(72vw, 280px)",
            height: "min(72vw, 280px)",
            borderRadius: "50%",
            cursor: exhausted ? "not-allowed" : "pointer",
            userSelect: "none",
            WebkitUserSelect: "none",
            touchAction: "none",
          }}
        >
          {/* Rotating conic halo — moon silver-blue glow */}
          <motion.div
            animate={exhausted ? {} : { rotate: 360 }}
            transition={{ repeat: Infinity, duration: 14, ease: "linear" }}
            style={{
              position: "absolute",
              inset: -8,
              borderRadius: "50%",
              background: exhausted
                ? "none"
                : `conic-gradient(from 0deg, #b0c4e8 0%, #e8f0ff 18%, #ffffff 30%, #c8d8f5 50%, #8aaad8 70%, #d0e0ff 85%, #b0c4e8 100%)`,
              filter: "blur(10px)",
              opacity: exhausted ? 0 : 0.55,
            }}
          />

          {/* Outer coin ring — deep space glow */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: exhausted
                ? "#1a1a1a"
                : "radial-gradient(circle at 50% 50%, #1a1a2e 0%, #0d0d1a 100%)",
              boxShadow: exhausted
                ? "none"
                : `0 0 0 4px rgba(200,210,255,0.12), 0 20px 60px rgba(100,120,255,0.25), 0 0 80px rgba(180,200,255,0.1)`,
            }}
          />

          {/* Inner coin face — Full Moon */}
          <div
            style={{
              position: "absolute",
              inset: "6%",
              borderRadius: "50%",
              overflow: "hidden",
              boxShadow: exhausted
                ? "none"
                : "0 0 40px rgba(220,230,255,0.35), inset 0 0 20px rgba(0,0,0,0.4)",
            }}
          >
            {exhausted ? (
              /* Exhausted: dim moon */
              <svg viewBox="0 0 200 200" width="100%" height="100%" style={{ display: "block" }}>
                <defs>
                  <radialGradient id="moonExhausted" cx="42%" cy="38%" r="58%">
                    <stop offset="0%" stopColor="#2a2a3a" />
                    <stop offset="100%" stopColor="#0e0e1c" />
                  </radialGradient>
                </defs>
                <circle cx="100" cy="100" r="100" fill="url(#moonExhausted)" />
              </svg>
            ) : (
              /* Active: Crescent Moon — accurate waxing crescent 🌒 */
              <svg viewBox="0 0 200 200" width="100%" height="100%" style={{ display: "block" }}>
                <defs>
                  {/* Moon surface base gradient — lit from upper-left */}
                  <radialGradient id="moonSurface" cx="38%" cy="32%" r="70%">
                    <stop offset="0%"  stopColor="#f5f0e8" />
                    <stop offset="30%" stopColor="#ddd5c0" />
                    <stop offset="65%" stopColor="#b8a888" />
                    <stop offset="100%" stopColor="#7a6a50" />
                  </radialGradient>
                  {/* Shadow side gradient */}
                  <radialGradient id="moonShadow" cx="70%" cy="50%" r="55%">
                    <stop offset="0%"  stopColor="rgba(0,0,0,0.0)" />
                    <stop offset="60%" stopColor="rgba(0,0,0,0.55)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0.88)" />
                  </radialGradient>
                  {/* Earthshine glow on dark limb */}
                  <radialGradient id="earthshine" cx="75%" cy="50%" r="40%">
                    <stop offset="0%"  stopColor="rgba(80,110,180,0.18)" />
                    <stop offset="100%" stopColor="rgba(0,0,0,0)" />
                  </radialGradient>
                  {/* Subtle terminator rim glow */}
                  <radialGradient id="rimGlow" cx="50%" cy="50%" r="50%">
                    <stop offset="85%" stopColor="rgba(0,0,0,0)" />
                    <stop offset="95%" stopColor="rgba(220,235,255,0.12)" />
                    <stop offset="100%" stopColor="rgba(220,235,255,0.22)" />
                  </radialGradient>
                  <clipPath id="moonClip">
                    <circle cx="100" cy="100" r="100" />
                  </clipPath>
                </defs>

                {/* Deep space background inside circle */}
                <circle cx="100" cy="100" r="100" fill="#05060f" />

                {/* Moon disc clipped to circle */}
                <g clipPath="url(#moonClip)">
                  {/* Base moon surface */}
                  <circle cx="100" cy="100" r="100" fill="url(#moonSurface)" />

                  {/* ── Craters — Mare & impact features ── */}
                  {/* Mare Imbrium — large dark plain, upper-left */}
                  <ellipse cx="72" cy="68" rx="26" ry="22" fill="rgba(80,70,55,0.55)" />
                  {/* Mare Serenitatis */}
                  <ellipse cx="108" cy="72" rx="18" ry="16" fill="rgba(80,70,55,0.45)" />
                  {/* Mare Tranquillitatis */}
                  <ellipse cx="118" cy="96" rx="20" ry="14" fill="rgba(75,65,52,0.5)" />
                  {/* Mare Crisium — eastern oval */}
                  <ellipse cx="138" cy="76" rx="12" ry="10" fill="rgba(70,62,50,0.52)" />
                  {/* Mare Nectaris */}
                  <ellipse cx="126" cy="118" rx="11" ry="9" fill="rgba(72,63,50,0.45)" />
                  {/* Mare Humorum */}
                  <ellipse cx="78" cy="128" rx="13" ry="10" fill="rgba(78,68,54,0.42)" />
                  {/* Mare Nubium */}
                  <ellipse cx="95" cy="132" rx="16" ry="11" fill="rgba(76,67,53,0.40)" />
                  {/* Oceanus Procellarum — huge western dark region */}
                  <ellipse cx="60" cy="100" rx="22" ry="38" fill="rgba(72,63,50,0.38)" />

                  {/* Small impact craters */}
                  <circle cx="88" cy="52" r="5" fill="rgba(60,52,42,0.5)" />
                  <circle cx="90" cy="52" r="3" fill="rgba(200,185,160,0.3)" />
                  <circle cx="148" cy="98" r="6" fill="rgba(58,50,40,0.48)" />
                  <circle cx="149" cy="97" r="3.5" fill="rgba(195,180,155,0.25)" />
                  <circle cx="55" cy="140" r="4" fill="rgba(60,52,42,0.45)" />
                  <circle cx="113" cy="148" r="5" fill="rgba(58,50,40,0.40)" />
                  <circle cx="62" cy="58" r="3.5" fill="rgba(60,52,42,0.40)" />
                  <circle cx="140" cy="130" r="4" fill="rgba(60,52,42,0.38)" />
                  <circle cx="80" cy="160" r="3" fill="rgba(58,50,40,0.35)" />
                  <circle cx="130" cy="155" r="4.5" fill="rgba(60,52,42,0.38)" />
                  {/* Tycho — bright ray crater, lower center */}
                  <circle cx="96" cy="150" r="5" fill="rgba(200,192,175,0.7)" />
                  <circle cx="96" cy="150" r="3" fill="rgba(230,225,210,0.85)" />
                  {/* Copernicus — mid bright crater */}
                  <circle cx="78" cy="108" r="6" fill="rgba(190,180,162,0.6)" />
                  <circle cx="78" cy="108" r="3.5" fill="rgba(220,215,198,0.8)" />

                  {/* Surface texture highlights (lit face) */}
                  <ellipse cx="55" cy="65" rx="18" ry="12" fill="rgba(255,248,235,0.07)" />
                  <ellipse cx="42" cy="105" rx="14" ry="20" fill="rgba(255,248,235,0.05)" />

                  {/* Shadow overlay — waxing crescent: right ~70% lit, left dark */}
                  {/* The shadow is a large circle offset to cover the left side */}
                  <circle cx="160" cy="100" r="112" fill="rgba(0,0,0,0.86)" />

                  {/* Earthshine on dark limb */}
                  <circle cx="100" cy="100" r="100" fill="url(#earthshine)" />

                  {/* Shadow depth gradient */}
                  <circle cx="100" cy="100" r="100" fill="url(#moonShadow)" />
                </g>

                {/* Outer rim glow */}
                <circle cx="100" cy="100" r="100" fill="url(#rimGlow)" />

                {/* Crisp limb edge highlight on lit side */}
                <circle
                  cx="100" cy="100" r="98"
                  fill="none"
                  stroke="rgba(240,235,220,0.25)"
                  strokeWidth="2"
                  strokeDasharray="185 250"
                  strokeDashoffset="-62"
                />
              </svg>
            )}
          </div>

          {/* Exhausted label */}
          {exhausted && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  color: C.gray,
                }}
              >
                RECHARGING
              </span>
            </div>
          )}

          {/* Confetti bursts */}
          <AnimatePresence>
            {bursts.map((bid) => (
              <ConfettiBurst key={bid} id={bid} onDone={() => removeBurst(bid)} />
            ))}
          </AnimatePresence>

          {/* Ring burst */}
          <BurstRing trigger={ringKey} />
        </motion.div>
      </motion.div>

      {/* Pair label below coin */}
      <div
        style={{
          marginTop: 20,
          fontSize: 12,
          fontWeight: 600,
          color: C.gray,
          letterSpacing: "0.15em",
          zIndex: 2,
        }}
      >
        {exhausted ? "ENERGY DEPLETED" : `MINING ${pair.label}`}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Top profile strip – glassmorphism header
───────────────────────────────────────────────────────────────────────── */
function ProfileStrip({ user, pair, balance }) {
  return (
    <div
      style={{
        position: "relative",
        zIndex: 10,
        margin: "0 16px 0",
        padding: "0 14px",
        height: 56,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "rgba(26,26,26,0.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderRadius: 16,
        border: `1px solid ${C.border}`,
        boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
      }}
    >
      {/* Left: Avatar + user info */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Avatar with lightning bolt */}
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: `conic-gradient(from 0deg, ${C.gold}, ${C.amber}, ${C.gold})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            padding: 2,
          }}
        >
          <div
            style={{
              width: "100%",
              height: "100%",
              borderRadius: "50%",
              background: C.void,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <LightningBolt size={16} color={C.gold} />
          </div>
        </div>

        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.white }}>
            {user?.email?.split("@")[0] ?? "guest miner"}
          </div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: C.gold,
              display: "flex",
              alignItems: "center",
              gap: 3,
            }}
          >
            🪙 {balance.toLocaleString()}
          </div>
        </div>
      </div>

      {/* Right: Rank badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          padding: "4px 10px",
          borderRadius: 20,
          background: `${C.gold}18`,
          border: `1px solid ${C.gold}30`,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: C.gold }}>31st</span>
        <ChevronRight size={10} color={C.gray} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Asset selector pills
───────────────────────────────────────────────────────────────────────── */
function PairSelector({ pairs, selected, onSelect }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        overflowX: "auto",
        paddingLeft: 16,
        paddingRight: 16,
        paddingBottom: 4,
        scrollbarWidth: "none",
      }}
    >
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
              border: `1px solid ${active ? p.color + "88" : "rgba(255,255,255,0.08)"}`,
              background: active ? `${p.color}1a` : C.warmBlack,
              cursor: "pointer",
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: active ? p.color : C.gray,
                letterSpacing: "0.06em",
              }}
            >
              {p.label}
            </span>
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: active ? p.color : "#444",
                background: active ? `${p.color}22` : "#1a1a1a",
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
   Energy bar
───────────────────────────────────────────────────────────────────────── */
function EnergyBar({ energy, max }) {
  const pct = (energy / max) * 100;
  const color = pct < 20 ? "#ef4444" : pct < 50 ? C.amber : C.blue;

  return (
    <div style={{ padding: "0 20px", zIndex: 2, position: "relative" }}>
      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <LightningBolt size={14} color={color} />
          <span style={{ fontSize: 12, fontWeight: 600, color: C.white }}>Energy</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.gray, fontVariantNumeric: "tabular-nums" }}>
          {energy} / {max}
        </span>
      </div>

      {/* Track */}
      <div
        style={{
          height: 8,
          borderRadius: 4,
          background: "rgba(255,255,255,0.06)",
          overflow: "hidden",
        }}
      >
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.3 }}
          style={{
            height: "100%",
            borderRadius: 4,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            boxShadow: `0 0 8px ${color}66`,
          }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Bottom navigation bar
───────────────────────────────────────────────────────────────────────── */
function BottomNav({ active, onChange }) {
  const tabs = [
    { id: "mine", label: "Mine", Icon: () => <LightningBolt size={22} color={active === "mine" ? C.gold : C.gray} /> },
    { id: "earn", label: "Earn", Icon: () => <span style={{ fontSize: 20 }}>🪙</span> },
    { id: "boosts", label: "Boosts", Icon: () => <Rocket size={22} color={active === "boosts" ? C.gold : C.gray} /> },
  ];

  return (
    <div
      style={{
        position: "relative",
        zIndex: 10,
        display: "flex",
        justifyContent: "space-around",
        alignItems: "flex-end",
        height: 68,
        padding: "0 8px 12px",
        background: `linear-gradient(to top, ${C.void} 60%, transparent)`,
      }}
    >
      {tabs.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <motion.button
            key={id}
            whileTap={{ scale: 0.9 }}
            onClick={() => onChange(id)}
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 3,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "6px 0 0",
              position: "relative",
            }}
          >
            <Icon />
            <span
              style={{
                fontSize: 10,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? C.gold : C.gray,
                letterSpacing: "0.04em",
              }}
            >
              {label}
            </span>
            {isActive && (
              <motion.div
                layoutId="nav-indicator"
                style={{
                  position: "absolute",
                  bottom: -6,
                  width: 24,
                  height: 2,
                  borderRadius: 1,
                  background: C.gold,
                  boxShadow: `0 0 8px ${C.gold}88`,
                }}
              />
            )}
          </motion.button>
        );
      })}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Auth gate modal
───────────────────────────────────────────────────────────────────────── */
function AuthGateModal({ pair, onClose, onNavigate }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
      }}
      onPointerDown={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 80, opacity: 0 }}
        transition={{ type: "spring", stiffness: 340, damping: 30 }}
        onPointerDown={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 480,
          background: "linear-gradient(160deg, #141414, #0c0c0c)",
          border: `1px solid rgba(255,255,255,0.1)`,
          borderBottom: "none",
          borderRadius: "24px 24px 0 0",
          padding: "28px 24px 48px",
          boxShadow: `0 -8px 48px #000a, 0 -2px 0 ${pair.color}33 inset`,
          position: "relative",
        }}
      >
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: "rgba(255,255,255,0.15)",
            margin: "0 auto 24px",
          }}
        />

        {/* ⚡ icon */}
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: `${pair.color}18`,
            border: `1px solid ${pair.color}44`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            boxShadow: `0 0 24px ${pair.color}33`,
          }}
        >
          <LightningBolt size={28} color={pair.color} />
        </div>

        <h3
          style={{
            margin: "0 0 8px",
            textAlign: "center",
            fontSize: 20,
            fontWeight: 700,
            color: C.white,
            letterSpacing: "-0.02em",
          }}
        >
          Start Mining {pair.name}
        </h3>
        <p
          style={{
            margin: "0 0 28px",
            textAlign: "center",
            fontSize: 13,
            color: C.gray,
            lineHeight: 1.6,
          }}
        >
          Create a free account to begin earning{" "}
          <span style={{ color: pair.color, fontWeight: 700 }}>+{pair.rate} {pair.label}</span> per tap
          and track your balance.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate("register")}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: 14,
              border: "none",
              background: `linear-gradient(135deg, ${pair.color}, ${C.amber})`,
              color: "#000",
              fontSize: 15,
              fontWeight: 700,
              letterSpacing: "0.03em",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
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
              width: "100%",
              padding: "15px",
              borderRadius: 14,
              border: `1px solid rgba(255,255,255,0.1)`,
              background: C.warmBlack,
              color: "rgba(255,255,255,0.7)",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
          >
            <LogIn size={16} strokeWidth={2} />
            Sign In
          </motion.button>
        </div>

        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            background: C.warmBlack,
            border: `1px solid rgba(255,255,255,0.1)`,
            borderRadius: "50%",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: C.gray,
          }}
        >
          <X size={15} />
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Main Mining component
───────────────────────────────────────────────────────────────────────── */
export default function Mining({ user }) {
  const [pair, setPair] = useState(MINING_PAIRS[0]);
  const [balance, setBalance] = useState(169788);
  const [energy, setEnergy] = useState(MAX_ENERGY);
  const [particles, setParticles] = useState([]);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [activeTab, setActiveTab] = useState("mine");
  const particleId = useRef(0);
  const syncTimer = useRef(null);

  /* ── Energy regen ── */
  useEffect(() => {
    const interval = setInterval(() => {
      setEnergy((e) => Math.min(e + REGEN_RATE, MAX_ENERGY));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  /* ── Supabase sync ── */
  const syncBalance = useCallback(
    (newBalance) => {
      if (!user?.email) return;
      clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(async () => {
        await supabase
          .from("balances")
          .upsert({ email: user.email, balance: newBalance }, { onConflict: "email" });
      }, SUPABASE_DEBOUNCE_MS);
    },
    [user]
  );

  /* ── Tap handler ── */
  const handleTap = useCallback(
    (e) => {
      if (!user) {
        setShowAuthGate(true);
        return;
      }
      if (energy < ENERGY_COST) return;

      const rect = e.currentTarget?.getBoundingClientRect?.();
      const clientX = e.clientX ?? rect?.left + rect?.width / 2 ?? 0;
      const clientY = e.clientY ?? rect?.top + rect?.height / 2 ?? 0;

      setEnergy((en) => Math.max(en - ENERGY_COST, 0));
      setBalance((b) => {
        const next = b + pair.rate;
        syncBalance(next);
        return next;
      });

      const pid = particleId.current++;
      setParticles((p) => [...p, { id: pid, x: clientX, y: clientY, amount: pair.rate }]);
    },
    [user, energy, pair, syncBalance]
  );

  const removeParticle = useCallback((id) => {
    setParticles((p) => p.filter((x) => x.id !== id));
  }, []);

  const exhausted = energy < ENERGY_COST;

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: C.void,
        fontFamily: "'SF Pro Display', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Layer 0 – radial center glow */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: `radial-gradient(ellipse at 50% 50%, ${C.amber}18 0%, transparent 65%)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Layer 1 – bottom ambient */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          height: 120,
          background: `linear-gradient(to top, transparent, ${C.gold}08, transparent)`,
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Gold dust particles */}
      <GoldDust />

      {/* ── Top strip ── */}
      <div style={{ paddingTop: 16, paddingBottom: 12, zIndex: 2, position: "relative" }}>
        <ProfileStrip user={user} pair={pair} balance={balance} />
      </div>

      {/* ── Pair selector ── */}
      <div style={{ zIndex: 2, position: "relative", marginBottom: 8 }}>
        <PairSelector pairs={MINING_PAIRS} selected={pair} onSelect={setPair} />
      </div>

      {/* ── Central coin ── */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2, position: "relative" }}>
        <TapCoin pair={pair} onTap={handleTap} exhausted={exhausted} balance={balance} />
      </div>

      {/* ── Energy bar ── */}
      <div style={{ zIndex: 2, position: "relative", marginBottom: 12 }}>
        <EnergyBar energy={energy} max={MAX_ENERGY} />
      </div>

      {/* ── Bottom nav ── */}
      <BottomNav active={activeTab} onChange={setActiveTab} />

      {/* ── Floating tap particles ── */}
      {particles.map((p) => (
        <TapParticle
          key={p.id}
          x={p.x}
          y={p.y}
          amount={p.amount}
          onDone={() => removeParticle(p.id)}
        />
      ))}

      {/* ── Auth gate ── */}
      <AnimatePresence>
        {showAuthGate && (
          <AuthGateModal
            pair={pair}
            onClose={() => setShowAuthGate(false)}
            onNavigate={(route) => {
              setShowAuthGate(false);
              /* wire up to your router here */
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
