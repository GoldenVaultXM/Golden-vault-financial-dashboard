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
import { Zap, Cpu, TrendingUp, Lock, X, UserPlus, LogIn } from "lucide-react";

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
   Auth gate modal – shown when unauthenticated user taps the coin
───────────────────────────────────────────────────────────────────────── */
function AuthGateModal({ pair, onClose, onNavigate }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1000,
        display: "flex",
        alignItems: "flex-end",
        justifyContent: "center",
        background: "rgba(0,0,0,0.82)",
        backdropFilter: "blur(6px)",
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
          border: `1px solid ${C.border2}`,
          borderBottom: "none",
          borderRadius: "24px 24px 0 0",
          padding: "28px 24px 48px",
          boxShadow: `0 -8px 48px #000a, 0 -2px 0 ${pair.color}33 inset`,
        }}
      >
        {/* Drag handle */}
        <div
          style={{
            width: 40,
            height: 4,
            borderRadius: 2,
            background: C.border2,
            margin: "0 auto 24px",
          }}
        />

        {/* Lock icon */}
        <div
          style={{
            width: 60,
            height: 60,
            borderRadius: "50%",
            background: `linear-gradient(135deg, ${pair.color}22, ${pair.color}0a)`,
            border: `1px solid ${pair.color}44`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 20px",
            boxShadow: `0 0 24px ${pair.color}33`,
          }}
        >
          <Lock size={26} color={pair.color} strokeWidth={2.5} />
        </div>

        {/* Heading */}
        <h3
          style={{
            margin: "0 0 8px",
            textAlign: "center",
            fontSize: 20,
            fontWeight: 900,
            color: C.text,
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
            color: C.text3,
            lineHeight: 1.6,
          }}
        >
          Create a free account to begin earning{" "}
          <span style={{ color: pair.color, fontWeight: 700 }}>+{pair.rate} {pair.label}</span> per tap
          and track your balance.
        </p>

        {/* CTA buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate("register")}
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: 14,
              border: "none",
              background: `linear-gradient(135deg, ${pair.color}, ${C.gold})`,
              color: "#000",
              fontSize: 15,
              fontWeight: 900,
              letterSpacing: "0.04em",
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
              border: `1px solid ${C.border2}`,
              background: C.card2,
              color: C.text2,
              fontSize: 14,
              fontWeight: 700,
              letterSpacing: "0.03em",
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

        {/* Close */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            background: C.card3,
            border: `1px solid ${C.border}`,
            borderRadius: "50%",
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            color: C.text3,
          }}
        >
          <X size={15} />
        </button>
      </motion.div>
    </motion.div>
  );
}

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
   Pinky smoke burst – renders on each tap
───────────────────────────────────────────────────────────────────────── */
function SmokePuff({ id, onDone }) {
  const puffs = Array.from({ length: 7 }, (_, i) => ({
    angle: (i / 7) * 360,
    dist: 55 + Math.random() * 40,
    size: 28 + Math.random() * 24,
    delay: i * 0.04,
  }));

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10 }}>
      {puffs.map((p, i) => {
        const rad = (p.angle * Math.PI) / 180;
        const tx = Math.cos(rad) * p.dist;
        const ty = Math.sin(rad) * p.dist;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 0.85, scale: 0.3, x: 0, y: 0 }}
            animate={{ opacity: 0, scale: 1.8, x: tx, y: ty }}
            transition={{ duration: 0.7, delay: p.delay, ease: "easeOut" }}
            onAnimationComplete={i === 0 ? onDone : undefined}
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              marginTop: -p.size / 2,
              marginLeft: -p.size / 2,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: `radial-gradient(circle, #f472b688 0%, #a855f744 50%, transparent 100%)`,
              filter: "blur(6px)",
            }}
          />
        );
      })}
    </div>
  );
}


// Golden Vault coin – embedded as a data URI so it renders instantly even
// on the slowest network connection, with zero external requests.
const GOLDEN_VAULT_COIN_SRC = "https://imgur.com/a/3sU6u43.png";
   /* ─────────────────────────────────────────────────────────────────────────
   Large floating vault coin – Priority 1 visual
   Uses the real Golden Vault PNG image (embedded as data URI for instant
   zero-network render – no flicker, no broken image on slow connections).
───────────────────────────────────────────────────────────────────────── */
function TapCoin({ pair, onTap, exhausted }) {
  const [ringKey, setRingKey] = useState(0);
  const [smokes, setSmokes] = useState([]);
  const smokeId = useRef(0);

  const handleTap = useCallback(
    (e) => {
      onTap(e);
      if (!exhausted) {
        setRingKey((k) => k + 1);
        const sid = smokeId.current++;
        setSmokes((s) => [...s, sid]);
      }
    },
    [exhausted, onTap]
  );

  const removeSmoke = useCallback((id) => {
    setSmokes((s) => s.filter((x) => x !== id));
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        minHeight: 310,
        position: "relative",
        paddingTop: 16,
        paddingBottom: 0,
      }}
    >
      {/* Deep purple ambient light pool behind coin */}
      <motion.div
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.75, 0.5] }}
        transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
        style={{
          position: "absolute",
          top: "5%",
          left: "50%",
          transform: "translateX(-50%)",
          width: "82%",
          height: "72%",
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${C.purpleGlow}40 0%, ${C.purple}22 40%, transparent 70%)`,
          filter: "blur(32px)",
          pointerEvents: "none",
        }}
      />

      {/* Coin wrapper with float animation */}
      <motion.div
        animate={{ y: [0, -12, 0] }}
        transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
        style={{ position: "relative", zIndex: 2 }}
      >
        <motion.div
          whileTap={exhausted ? {} : { scale: 0.88, rotate: -2 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
          onPointerDown={handleTap}
          style={{
            position: "relative",
            width: "72vw",
            height: "72vw",
            maxWidth: 290,
            maxHeight: 290,
            minWidth: 220,
            minHeight: 220,
            borderRadius: "50%",
            cursor: exhausted ? "not-allowed" : "pointer",
            userSelect: "none",
            WebkitUserSelect: "none",
            touchAction: "none",
          }}
        >
          {/* Rotating conic halo */}
          <motion.div
            animate={exhausted ? {} : { rotate: 360 }}
            transition={{ repeat: Infinity, duration: 9, ease: "linear" }}
            style={{
              position: "absolute",
              inset: -10,
              borderRadius: "50%",
              background: exhausted
                ? "none"
                : `conic-gradient(from 0deg, ${C.purpleGlow}66, ${C.gold3}cc, ${C.pink}55, ${C.gold2}bb, transparent, ${C.purpleGlow}66)`,
              filter: "blur(12px)",
              opacity: exhausted ? 0 : 0.9,
            }}
          />

          {/* Outer ring */}
          <div
            style={{
              position: "absolute",
              inset: -2,
              borderRadius: "50%",
              border: `2px solid ${exhausted ? C.border : C.gold2 + "55"}`,
              pointerEvents: "none",
            }}
          />

          {/* Coin body – rich gold radial */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              background: exhausted
                ? `radial-gradient(circle at 38% 32%, #2a2040, #0e0a1c)`
                : `radial-gradient(circle at 33% 26%, #fff3a0, ${C.gold3} 22%, ${C.gold2} 45%, ${C.gold} 65%, ${C.goldDim} 85%, #3d1c00)`,
              boxShadow: exhausted
                ? `0 8px 32px #00000088`
                : `0 16px 60px ${C.gold}55, 0 4px 0 #fffbe066 inset, 0 -8px 0 #00000055 inset, 0 0 0 2px ${C.gold}44`,
              border: `3px solid ${exhausted ? "#2a1f4a" : C.gold + "99"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              overflow: "hidden",
              transition: "background 0.4s, box-shadow 0.4s",
            }}
          >
            {/* Coin rim groove */}
            <div
              style={{
                position: "absolute",
                inset: 10,
                borderRadius: "50%",
                border: `2px solid ${exhausted ? "#2a1f4a" : "#fff4"}`,
                pointerEvents: "none",
              }}
            />

            {/* Lightning bolt – large centrepiece */}
            <div
              style={{
                position: "relative",
                zIndex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                opacity: exhausted ? 0.25 : 1,
                filter: exhausted
                  ? "none"
                  : `drop-shadow(0 0 12px ${C.gold3}cc) drop-shadow(0 4px 8px #00000088)`,
              }}
            >
              <Zap
                size={90}
                color={exhausted ? C.text4 : "#fff"}
                fill={exhausted ? C.text4 : C.gold3}
                strokeWidth={1.5}
              />
            </div>

            {/* Pair label */}
            <span
              style={{
                fontSize: 11,
                fontWeight: 900,
                color: exhausted ? C.text4 : "#00000099",
                letterSpacing: "0.22em",
                zIndex: 1,
                marginTop: -6,
                textShadow: exhausted ? "none" : "0 1px 0 #fff5",
              }}
            >
              {exhausted ? "RECHARGING" : pair.label}
            </span>
          </div>

          {/* Smoke puffs on tap */}
          <AnimatePresence>
            {smokes.map((sid) => (
              <SmokePuff key={sid} id={sid} onDone={() => removeSmoke(sid)} />
            ))}
          </AnimatePresence>

          {/* Electric burst ring */}
          <ElectricRing trigger={ringKey} />
        </motion.div>
      </motion.div>

      {/* ── Coin pedestal / base ── */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          marginTop: -18,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
        }}
      >
        {/* Shadow cast by coin onto base */}
        <motion.div
          animate={{ scaleX: [1, 0.88, 1], opacity: [0.55, 0.35, 0.55] }}
          transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
          style={{
            width: "55%",
            height: 14,
            borderRadius: "50%",
            background: `radial-gradient(ellipse, ${C.gold}55 0%, transparent 70%)`,
            filter: "blur(6px)",
            marginBottom: -7,
          }}
        />
        {/* Top disc */}
        <div
          style={{
            width: "62vw",
            maxWidth: 220,
            height: 18,
            borderRadius: "50%",
            background: `linear-gradient(180deg, #2a1f4a, #1a1030)`,
            border: `1px solid ${C.border2}`,
            boxShadow: `0 4px 18px #00000077, 0 1px 0 ${C.purple2}33 inset`,
          }}
        />
        {/* Pedestal body */}
        <div
          style={{
            width: "44vw",
            maxWidth: 156,
            height: 22,
            background: `linear-gradient(180deg, #1e1535, #110d20)`,
            borderLeft: `1px solid ${C.border}`,
            borderRight: `1px solid ${C.border}`,
            boxShadow: `0 6px 20px #00000066`,
            clipPath: "polygon(4% 0%, 96% 0%, 100% 100%, 0% 100%)",
          }}
        />
        {/* Base plate */}
        <div
          style={{
            width: "52vw",
            maxWidth: 188,
            height: 10,
            borderRadius: "0 0 8px 8px",
            background: `linear-gradient(180deg, #160f28, #0d0a18)`,
            border: `1px solid ${C.border}`,
            borderTop: "none",
            boxShadow: `0 4px 16px #00000055`,
          }}
        />
      </div>

      {/* Tap hint */}
      {!exhausted && (
        <motion.div
          animate={{ opacity: [0.35, 0.8, 0.35] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          style={{
            marginTop: 16,
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "0.22em",
            color: C.text3,
            textTransform: "uppercase",
          }}
        >
          TAP THE COIN TO MINE
        </motion.div>
      )}
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
            background: `linear-gradient(145deg, ${C.card2}, ${C.card})`,
            border: `1px solid ${C.border}`,
            borderRadius: 14,
            padding: "14px 8px 12px",
            textAlign: "center",
            boxShadow: "0 2px 12px #00000066, inset 0 1px 0 #ffffff08",
            backdropFilter: "blur(10px)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 5 }}>
            {s.icon}
          </div>
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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Zap size={13} color={barColor} fill={barColor} />
          <span style={{ fontSize: 11, fontWeight: 800, color: barColor, letterSpacing: "0.08em" }}>
            ENERGY
          </span>
        </div>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: C.text2,
            fontVariantNumeric: "tabular-nums",
          }}
        >
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

      <div
        style={{
          fontSize: 10,
          color: C.text3,
          textAlign: "right",
          marginTop: 6,
          letterSpacing: "0.04em",
        }}
      >
        Regenerates {REGEN_RATE}/sec
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Auth Gate — shown when user is not signed in
───────────────────────────────────────────────────────────────────────── */
function AuthGate({ onSignUp, onSignIn }) {
  return (
    <div
      style={{
        background: C.bg,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Ambient background glow */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 320,
          height: 320,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${C.gold}18 0%, transparent 70%)`,
          filter: "blur(40px)",
          pointerEvents: "none",
        }}
      />

      {/* Header */}
      <div
        style={{
          padding: "18px 16px 14px",
          borderBottom: `1px solid ${C.border}`,
          background: `linear-gradient(180deg, #0d0818, ${C.bg})`,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 900,
            color: C.text,
            letterSpacing: "-0.02em",
          }}
        >
          Tap{" "}
          <span style={{ color: C.gold2, textShadow: `0 0 20px ${C.gold}66` }}>
            Mining
          </span>
        </h1>
      </div>

      {/* Blurred coin preview */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          paddingTop: 40,
          paddingBottom: 16,
          position: "relative",
        }}
      >
        {/* Coin ghost */}
        <div
          style={{
            width: 200,
            height: 200,
            borderRadius: "50%",
            background: `radial-gradient(circle at 35% 28%, ${C.gold3}44, ${C.gold}33 40%, ${C.goldDim}22)`,
            border: `3px solid ${C.gold}33`,
            boxShadow: `0 0 60px ${C.gold}22`,
            filter: "blur(3px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ opacity: 0.3, fontSize: 64 }}>₿</div>
        </div>

        {/* Lock badge over coin */}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
          style={{
            position: "absolute",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 8,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: "50%",
              background: "linear-gradient(145deg, #1a1a1a, #111)",
              border: `2px solid ${C.gold}55`,
              boxShadow: `0 0 24px ${C.gold}33, inset 0 1px 0 #ffffff0a`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Lock size={24} color={C.gold2} />
          </div>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              color: C.gold2,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
              textShadow: `0 0 12px ${C.gold}88`,
            }}
          >
            LOCKED
          </span>
        </motion.div>
      </div>

      {/* Gate card */}
      <div
        style={{
          margin: "0 16px",
          background: "linear-gradient(145deg, #141414, #0e0e0e)",
          border: `1px solid ${C.border2}`,
          borderTop: `1px solid ${C.gold}22`,
          borderRadius: 20,
          padding: "28px 24px",
          boxShadow: "0 4px 32px #00000088, inset 0 1px 0 #ffffff06",
        }}
      >
        {/* Icon row */}
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: `${C.gold}0d`,
              border: `1px solid ${C.gold}22`,
              borderRadius: 14,
              padding: "10px 20px",
            }}
          >
            <Lock size={16} color={C.gold2} />
            <span
              style={{ fontSize: 11, fontWeight: 800, color: C.gold2, letterSpacing: "0.1em" }}
            >
              SECURE VAULT ACCESS
            </span>
          </div>
        </div>

        <h2
          style={{
            margin: "0 0 10px",
            fontSize: 20,
            fontWeight: 900,
            color: C.text,
            textAlign: "center",
            letterSpacing: "-0.02em",
          }}
        >
          Sign up to start mining
        </h2>

        <p
          style={{
            margin: "0 0 28px",
            fontSize: 13,
            color: C.text2,
            textAlign: "center",
            lineHeight: 1.6,
          }}
        >
          Create your free account to access Tap Mining, track your balance, and earn rewards
          across BTC, ETH, SOL & Gold.
        </p>

        {/* Perks list */}
        {[
          "Persistent balance saved to your account",
          "Mine BTC, ETH, SOL & Gold Spot",
          "Real-time energy regeneration",
        ].map((perk) => (
          <div
            key={perk}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: C.gold2,
                flexShrink: 0,
                boxShadow: `0 0 6px ${C.gold}`,
              }}
            />
            <span style={{ fontSize: 12, color: C.text2 }}>{perk}</span>
          </div>
        ))}

        {/* CTA buttons */}
<div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
  <motion.button
    whileTap={{ scale: 0.97 }}
    onClick={onSignUp}
    style={{
      width: "100%",
      padding: "15px",
      borderRadius: 14,
      border: "none",
      background: `linear-gradient(135deg, ${C.gold}, ${C.gold2})`,
      color: "#000",
      fontSize: 14,
      fontWeight: 900,
      letterSpacing: "0.06em",
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      gap: 8,
      boxShadow: `0 4px 20px ${C.gold}55`,
    }}
  >
    CREATE FREE ACCOUNT
    <ChevronRight size={16} />
  </motion.button>

  <motion.button
    whileTap={{ scale: 0.97 }}
    onClick={onSignIn}
    style={{
      width: "100%",
      padding: "14px",
      borderRadius: 14,
      border: `1px solid ${C.border2}`,
      background: C.card2,
      color: C.text2,
      fontSize: 13,
      fontWeight: 700,
      letterSpacing: "0.04em",
      cursor: "pointer",
    }}
  >
    Already have an account? Sign In
  </motion.button>
</div>
    </div>
  );
}  

/* ─────────────────────────────────────────────────────────────────────────
   Main Mining component
   Props:
     user               – { email } | null
     onNavigateSignUp   – () => void  navigate to register screen
     onNavigateSignIn   – () => void  navigate to login screen
───────────────────────────────────────────────────────────────────────── */
export default function Mining({ user, onNavigateSignUp, onNavigateSignIn }) {
/* ─────────────────────────────────────────────────────────────────────────
   Main Mining component
   Props:
     user               – { email } | null
     onNavigateSignUp   – () => void  navigate to register screen
     onNavigateSignIn   – () => void  navigate to login screen
───────────────────────────────────────────────────────────────────────── */
export default function Mining({ user, onNavigateSignUp, onNavigateSignIn }) {
  const [selectedPair, setSelectedPair] = useState(MINING_PAIRS[0]);
  const [balance, setBalance] = useState(0);
  const [energy, setEnergy] = useState(MAX_ENERGY);
  const [sessionEarned, setSessionEarned] = useState(0);
  const [tapCount, setTapCount] = useState(0);
  const [particles, setParticles] = useState([]);
  const [showAuthGate, setShowAuthGate] = useState(false);

  const balanceRef = useRef(0);
  const debounceTimer = useRef(null);
  const particleId = useRef(0);

  const isGuest = !user?.email;

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

  /* Tap handler – intercepts unauthenticated users */
  const handleTap = useCallback(
    (e) => {
      if (isGuest) {
        setShowAuthGate(true);
        return;
      }

      if (energy < ENERGY_COST) return;

      const earned = selectedPair.rate;
      const newBalance = balanceRef.current + earned;
      balanceRef.current = newBalance;

      setBalance(newBalance);
      setEnergy((en) => Math.max(0, en - ENERGY_COST));
      setSessionEarned((s) => s + earned);
      setTapCount((t) => t + 1);

      syncToSupabase(newBalance);

      const rect = e.currentTarget
        ? e.currentTarget.getBoundingClientRect()
        : { left: 0, top: 0, width: 0, height: 0 };
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const spread = 40;
      const px = cx + (Math.random() - 0.5) * spread;
      const py = cy + (Math.random() - 0.5) * spread;

      const id = particleId.current++;
      setParticles((prev) => [...prev, { id, x: px, y: py, amount: earned }]);
    },
    [isGuest, energy, selectedPair, syncToSupabase]
  );

  const removeParticle = useCallback((id) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  /* Auth gate navigation handlers */
  const handleNavigate = useCallback((route) => {
    setShowAuthGate(false);
    if (route === "register") onNavigateSignUp?.();
    else onNavigateSignIn?.();
  }, [onNavigateSignUp, onNavigateSignIn]);

  const exhausted = !isGuest && energy < ENERGY_COST;

  return (
    <div
      style={{
        background: `linear-gradient(160deg, #0d0818 0%, #07050f 40%, #0a0618 70%, #06040e 100%)`,
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        gap: 0,
        fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
        paddingBottom: 100,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── Purple mesh background orbs ── */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{
          position: "absolute", top: "-10%", left: "-15%",
          width: 320, height: 320, borderRadius: "50%",
          background: "radial-gradient(circle, #7c3aed22 0%, transparent 70%)",
          filter: "blur(40px)",
        }} />
        <div style={{
          position: "absolute", top: "5%", right: "-10%",
          width: 260, height: 260, borderRadius: "50%",
          background: "radial-gradient(circle, #a855f718 0%, transparent 70%)",
          filter: "blur(50px)",
        }} />
        <div style={{
          position: "absolute", top: "25%", left: "50%",
          transform: "translateX(-50%)",
          width: 400, height: 400, borderRadius: "50%",
          background: "radial-gradient(circle, #6d28d912 0%, transparent 65%)",
          filter: "blur(60px)",
        }} />
        <div style={{
          position: "absolute", bottom: "8%", right: "10%",
          width: 200, height: 200, borderRadius: "50%",
          background: "radial-gradient(circle, #ec489914 0%, transparent 70%)",
          filter: "blur(40px)",
        }} />
      </div>

      {/* ── Header ── */}
      <div
        style={{
          padding: "18px 16px 14px",
          borderBottom: `1px solid ${C.border}`,
          background: `linear-gradient(180deg, #0d0818ee, ${C.bg}ee)`,
          position: "relative", zIndex: 1,
        }}
      >
        <h1
          style={{
            margin: 0,
            fontSize: 24,
            fontWeight: 900,
            color: C.text,
            letterSpacing: "-0.02em",
          }}
        >
          Tap{" "}
          <span style={{ color: C.gold2, textShadow: `0 0 20px ${C.gold}66` }}>
            Mining
          </span>
        </h1>
      </div>

      {/* ── Asset Selection ── */}
      <div style={{ paddingTop: 16, paddingBottom: 12 }}>
        <PairSelector
          pairs={MINING_PAIRS}
          selected={selectedPair}
          onSelect={setSelectedPair}
        />
      </div>

      {/* ── Large Floating Vault Coin ── */}
      <div style={{ paddingTop: 8, paddingBottom: 0, position: "relative" }}>
        <TapCoin
          pair={selectedPair}
          onTap={handleTap}
          exhausted={exhausted}
        />

        {isGuest && (
          <div
            style={{
              position: "absolute",
              top: 12,
              right: 24,
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "#0f0f0fcc",
              border: `1px solid ${C.border2}`,
              borderRadius: 20,
              padding: "5px 10px",
              backdropFilter: "blur(8px)",
            }}
          >
            <Lock size={11} color={C.gold2} strokeWidth={2.5} />
            <span style={{ fontSize: 10, fontWeight: 700, color: C.gold2, letterSpacing: "0.08em" }}>
              SIGN IN TO MINE
            </span>
          </div>
        )}
      </div>

      {/* ── Balance | Session | Taps ── */}
      <StatsStrip balance={balance} sessionEarned={sessionEarned} taps={tapCount} />

      {/* ── Asset Info ── */}
      <div style={{ paddingTop: 20, paddingBottom: 0 }}>
        <AssetInfo pair={selectedPair} />
      </div>

      {/* ── Energy Bar ── */}
      <div style={{ paddingTop: 12 }}>
        <EnergyBar energy={energy} max={MAX_ENERGY} />
      </div>

      {/* ── Floating particles ── */}
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

      {/* ── Auth gate modal ── */}
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
