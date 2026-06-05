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
const GOLDEN_VAULT_COIN_SRC = "data:image/png;base64,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
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
    </div>
  );
}
