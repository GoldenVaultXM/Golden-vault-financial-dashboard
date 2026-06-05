/**
 * Mining.jsx  –  GoldenVaultXM Tap-to-Earn Module
 *
 * v3 – Performance & correctness overhaul
 *  ✦ Moon SVG uses a pure CSS keyframe spin (no Framer Motion on the SVG
 *    element itself) so rotation is silky 60 fps with zero glitch/snap.
 *  ✦ GoldDust particles are stable-ref'd (useMemo) – never regenerate.
 *  ✦ ConfettiBurst dots are stable-ref'd (useMemo) – no random on render.
 *  ✦ Tap handler uses refs for energy/balance so no stale-closure re-creates.
 *  ✦ Score counter uses a separate ref-driven display so balance key-change
 *    no longer blows up the coin animation.
 *  ✦ whileTap is kept only on the coin div (not the float wrapper).
 *  ✦ All SVG gradient IDs are globally unique (no duplicate-ID conflicts).
 *  ✦ Moon is fully clipped to its circle with overflow:hidden on the wrapper.
 *  ✦ The halo ring uses a CSS @keyframes spin too – no Framer rotate loop.
 */

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "./supabaseClient";
import { ChevronRight, X, UserPlus, LogIn, Rocket, Trophy } from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────
   Inject global CSS keyframes once
───────────────────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  @keyframes moonSpin {
    from { transform: translateX(0%); }
    to   { transform: translateX(-50%); }
  }
  @keyframes haloSpin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes floatY {
    0%,100% { transform: translateY(0px); }
    50%      { transform: translateY(-10px); }
  }
  @keyframes glowPulse {
    0%,100% { opacity: 0.55; transform: scale(1); }
    50%      { opacity: 0.85; transform: scale(1.08); }
  }
`;

function InjectCSS() {
  useEffect(() => {
    const id = "gvxm-mining-styles";
    if (document.getElementById(id)) return;
    const tag = document.createElement("style");
    tag.id = id;
    tag.textContent = GLOBAL_CSS;
    document.head.appendChild(tag);
    return () => tag.remove();
  }, []);
  return null;
}

/* ─────────────────────────────────────────────────────────────────────────
   Design tokens
───────────────────────────────────────────────────────────────────────── */
const C = {
  void: "#0A0A0A",
  charcoal: "#141414",
  warmBlack: "#1A1A1A",
  card: "#1A1A1A",
  card2: "#141414",
  gold: "#FFD700",
  amber: "#FF8C00",
  blue: "#0088FF",
  magenta: "#FF1493",
  pink: "#FFB6C1",
  silverTrophy: "#C0C0C0",
  goldTrophy: "#D4A017",
  darkGold: "#B8860B",
  white: "#FFFFFF",
  gray: "#8A8A8A",
  border: "rgba(255,215,0,0.08)",
  border2: "rgba(255,255,255,0.1)",
};

/* ─────────────────────────────────────────────────────────────────────────
   Mining pair definitions
───────────────────────────────────────────────────────────────────────── */
const MINING_PAIRS = [
  { id: "btc", label: "BTC", name: "Bitcoin",   rate: 1, color: "#f7931a" },
  { id: "eth", label: "ETH", name: "Ethereum",  rate: 2, color: "#627eea" },
  { id: "sol", label: "SOL", name: "Solana",    rate: 3, color: "#9945ff" },
  { id: "xau", label: "XAU", name: "Gold Spot", rate: 5, color: C.gold   },
];

/* ─────────────────────────────────────────────────────────────────────────
   Constants
───────────────────────────────────────────────────────────────────────── */
const MAX_ENERGY        = 500;
const ENERGY_COST       = 10;
const REGEN_RATE        = 1;
const SUPABASE_DEBOUNCE = 1500;

/* ─────────────────────────────────────────────────────────────────────────
   Gold dust — stable particle data generated once at module load
───────────────────────────────────────────────────────────────────────── */
const DUST_PARTICLES = Array.from({ length: 40 }, (_, i) => ({
  id: i,
  x: (i * 2.5 + 7) % 100,
  y: (i * 3.7 + 5) % 100,
  size: 2 + (i % 3),
  opacity: 0.25 + (i % 4) * 0.07,
  blur: i % 3 === 0,
  duration: 6 + (i % 5),
  delay: -(i % 8),
}));

function GoldDust() {
  return (
    <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden" }}>
      {DUST_PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          animate={{ y: [0, -55, 0], x: [0, Math.sin(p.id) * 10, 0] }}
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
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Lightning bolt SVG
───────────────────────────────────────────────────────────────────────── */
function LightningBolt({ size = 24, color = C.darkGold, style = {} }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: "block", ...style }}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={color} />
    </svg>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Tap "+N" float particle
───────────────────────────────────────────────────────────────────────── */
function TapParticle({ x, y, amount, onDone }) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -80, scale: 1.3 }}
      transition={{ duration: 0.7, ease: "easeOut" }}
      onAnimationComplete={onDone}
      style={{
        position: "fixed",
        left: x - 18,
        top: y - 24,
        pointerEvents: "none",
        zIndex: 999,
        fontWeight: 700,
        fontSize: 20,
        color: C.gold,
        textShadow: `0 0 10px ${C.amber}cc`,
        userSelect: "none",
        fontVariantNumeric: "tabular-nums",
        willChange: "transform, opacity",
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
      {trigger > 0 && (
        <motion.div
          key={trigger}
          initial={{ scale: 0.85, opacity: 0.9 }}
          animate={{ scale: 1.75, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.38, ease: "easeOut" }}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `2px solid ${C.gold}`,
            boxShadow: `0 0 16px ${C.amber}66`,
            pointerEvents: "none",
            willChange: "transform, opacity",
          }}
        />
      )}
    </AnimatePresence>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Confetti burst — stable dots pre-computed, no random on render
───────────────────────────────────────────────────────────────────────── */
const BURST_DOTS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  const dist = 58 + (i % 3) * 16;
  return {
    tx: Math.cos(angle) * dist,
    ty: Math.sin(angle) * dist,
    size: 4 + (i % 4),
    color: i % 3 === 0 ? C.amber : C.gold,
    delay: i * 0.022,
  };
});

function ConfettiBurst({ onDone }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10 }}>
      {BURST_DOTS.map((d, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 1, scale: 0.3, x: 0, y: 0 }}
          animate={{ opacity: 0, scale: 1.5, x: d.tx, y: d.ty }}
          transition={{ duration: 0.55, delay: d.delay, ease: "easeOut" }}
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
            boxShadow: `0 0 5px ${d.color}`,
            willChange: "transform, opacity",
          }}
        />
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Moon SVG — static, rendered once, rotated purely via CSS animation
   The moon face itself spins slowly; the crescent shadow stays fixed
   relative to the viewer, creating a realistic slow rotation effect.
───────────────────────────────────────────────────────────────────────── */
function MoonFace({ exhausted }) {
  if (exhausted) {
    return (
      <svg
        viewBox="0 0 200 200"
        width="100%"
        height="100%"
        style={{ display: "block", borderRadius: "50%" }}
      >
        <defs>
          <radialGradient id="mExh" cx="42%" cy="38%" r="60%">
            <stop offset="0%" stopColor="#232336" />
            <stop offset="100%" stopColor="#0c0c18" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="100" fill="url(#mExh)" />
        {/* dim crater hints */}
        <ellipse cx="72" cy="68" rx="24" ry="20" fill="rgba(255,255,255,0.03)" />
        <ellipse cx="115" cy="95" rx="18" ry="13" fill="rgba(255,255,255,0.025)" />
        <circle cx="96" cy="150" r="4" fill="rgba(255,255,255,0.04)" />
      </svg>
    );
  }

  return (
    /*
     * The outer <div> clips to a circle and applies the CSS spin.
     * The SVG inside is static — no JS animation on this element at all.
     * This means no Framer Motion layout thrash during rapid taps.
     */
    /* Outer clip holds the circular mask; inner strip is 200% wide and scrolls */
    <div
      style={{
        width: "100%",
        height: "100%",
        borderRadius: "50%",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Double-wide surface strip — scrolls left continuously, simulating globe rotation */}
      <div
        style={{
          width: "200%",
          height: "100%",
          display: "flex",
          animation: "moonSpin 32s linear infinite",
          willChange: "transform",
        }}
      >
      {/* Left tile */}
      <svg
        viewBox="0 0 200 200"
        width="50%"
        height="100%"
        style={{ display: "block", flexShrink: 0 }}
      >
        <defs>
          {/* Lit surface — warm grey-white highlight */}
          <radialGradient id="mSurf" cx="36%" cy="30%" r="72%">
            <stop offset="0%"  stopColor="#f2ede4" />
            <stop offset="25%" stopColor="#d8d0bc" />
            <stop offset="60%" stopColor="#b0a48a" />
            <stop offset="100%" stopColor="#736050" />
          </radialGradient>
          {/* Overall darkening vignette toward edges */}
          <radialGradient id="mVig" cx="50%" cy="50%" r="50%">
            <stop offset="65%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
          </radialGradient>
          {/* Crescent shadow — offset circle covers right ~55% */}
          <radialGradient id="mShad" cx="68%" cy="50%" r="52%">
            <stop offset="0%"  stopColor="rgba(0,0,0,0)" />
            <stop offset="55%" stopColor="rgba(0,0,0,0.5)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.92)" />
          </radialGradient>
          {/* Blue earthshine on dark limb */}
          <radialGradient id="mEarth" cx="72%" cy="50%" r="38%">
            <stop offset="0%"  stopColor="rgba(60,90,170,0.20)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          {/* Outer limb glow */}
          <radialGradient id="mRim" cx="50%" cy="50%" r="50%">
            <stop offset="84%" stopColor="rgba(0,0,0,0)" />
            <stop offset="96%" stopColor="rgba(210,225,255,0.10)" />
            <stop offset="100%" stopColor="rgba(210,225,255,0.20)" />
          </radialGradient>
          <clipPath id="mClip">
            <circle cx="100" cy="100" r="100" />
          </clipPath>
        </defs>

        {/* Space bg */}
        <circle cx="100" cy="100" r="100" fill="#04050e" />

        <g clipPath="url(#mClip)">
          {/* Base surface */}
          <circle cx="100" cy="100" r="100" fill="url(#mSurf)" />

          {/* ── Maria (dark plains) ── */}
          <ellipse cx="70"  cy="66"  rx="27" ry="22" fill="rgba(70,60,48,0.58)" />  {/* Imbrium   */}
          <ellipse cx="110" cy="70"  rx="19" ry="16" fill="rgba(70,60,48,0.48)" />  {/* Serenitat */}
          <ellipse cx="120" cy="96"  rx="21" ry="14" fill="rgba(68,58,46,0.52)" />  {/* Tranquil  */}
          <ellipse cx="140" cy="74"  rx="13" ry="11" fill="rgba(65,56,44,0.54)" />  {/* Crisium   */}
          <ellipse cx="127" cy="120" rx="12" ry="9"  fill="rgba(66,57,45,0.46)" />  {/* Nectaris  */}
          <ellipse cx="76"  cy="130" rx="14" ry="10" fill="rgba(72,62,50,0.44)" />  {/* Humorum   */}
          <ellipse cx="95"  cy="134" rx="17" ry="11" fill="rgba(70,61,48,0.42)" />  {/* Nubium    */}
          <ellipse cx="58"  cy="102" rx="23" ry="40" fill="rgba(68,59,46,0.36)" />  {/* Procellarum */}

          {/* ── Impact craters ── */}
          {/* Tycho — bright rayed crater */}
          <circle cx="96"  cy="152" r="5.5" fill="rgba(185,175,158,0.65)" />
          <circle cx="96"  cy="152" r="3"   fill="rgba(228,222,208,0.88)" />
          {/* Copernicus */}
          <circle cx="76"  cy="108" r="6.5" fill="rgba(175,165,148,0.60)" />
          <circle cx="76"  cy="108" r="3.5" fill="rgba(215,208,192,0.82)" />
          {/* Plato */}
          <circle cx="86"  cy="50"  r="5"   fill="rgba(58,50,40,0.55)" />
          <circle cx="87"  cy="49"  r="2.5" fill="rgba(190,178,160,0.30)" />
          {/* Kepler */}
          <circle cx="148" cy="99"  r="5.5" fill="rgba(56,48,38,0.50)" />
          <circle cx="149" cy="98"  r="2.8" fill="rgba(185,175,155,0.28)" />
          {/* misc small */}
          <circle cx="54"  cy="142" r="3.5" fill="rgba(58,50,40,0.46)" />
          <circle cx="114" cy="150" r="4"   fill="rgba(56,48,38,0.42)" />
          <circle cx="60"  cy="56"  r="3"   fill="rgba(58,50,40,0.42)" />
          <circle cx="142" cy="132" r="3.5" fill="rgba(58,50,40,0.40)" />
          <circle cx="78"  cy="162" r="3"   fill="rgba(56,48,38,0.36)" />
          <circle cx="132" cy="157" r="4"   fill="rgba(58,50,40,0.38)" />

          {/* Highlight sheen on lit quadrant */}
          <ellipse cx="52" cy="62" rx="20" ry="14" fill="rgba(255,250,238,0.06)" />
          <ellipse cx="40" cy="108" rx="13" ry="22" fill="rgba(255,250,238,0.04)" />

          {/* ── Shadow layers ── */}
          {/* Primary dark shadow covering ~left 55% */}
          <circle cx="158" cy="100" r="115" fill="rgba(0,0,0,0.88)" />
          {/* Earthshine tint */}
          <circle cx="100" cy="100" r="100" fill="url(#mEarth)" />
          {/* Radial darkening */}
          <circle cx="100" cy="100" r="100" fill="url(#mShad)" />
          {/* Edge vignette */}
          <circle cx="100" cy="100" r="100" fill="url(#mVig)" />
        </g>

        {/* Rim glow outside clip */}
        <circle cx="100" cy="100" r="100" fill="url(#mRim)" />

        {/* Lit-limb edge arc */}
        <circle
          cx="100" cy="100" r="97"
          fill="none"
          stroke="rgba(238,232,218,0.22)"
          strokeWidth="2.5"
          strokeDasharray="190 240"
          strokeDashoffset="-55"
        />
      </svg>
      {/* Right tile — identical, seamless loop */}
      <svg
        viewBox="0 0 200 200"
        width="50%"
        height="100%"
        style={{ display: "block", flexShrink: 0 }}
      >
        <defs>
          <radialGradient id="mSurf2" cx="36%" cy="30%" r="72%">
            <stop offset="0%"  stopColor="#f2ede4" />
            <stop offset="25%" stopColor="#d8d0bc" />
            <stop offset="60%" stopColor="#b0a48a" />
            <stop offset="100%" stopColor="#736050" />
          </radialGradient>
          <radialGradient id="mVig2" cx="50%" cy="50%" r="50%">
            <stop offset="65%" stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
          </radialGradient>
          <radialGradient id="mShad2" cx="68%" cy="50%" r="52%">
            <stop offset="0%"  stopColor="rgba(0,0,0,0)" />
            <stop offset="55%" stopColor="rgba(0,0,0,0.5)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.92)" />
          </radialGradient>
          <radialGradient id="mEarth2" cx="72%" cy="50%" r="38%">
            <stop offset="0%"  stopColor="rgba(60,90,170,0.20)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
          <radialGradient id="mRim2" cx="50%" cy="50%" r="50%">
            <stop offset="84%" stopColor="rgba(0,0,0,0)" />
            <stop offset="96%" stopColor="rgba(210,225,255,0.10)" />
            <stop offset="100%" stopColor="rgba(210,225,255,0.20)" />
          </radialGradient>
          <clipPath id="mClip2">
            <circle cx="100" cy="100" r="100" />
          </clipPath>
        </defs>
        <circle cx="100" cy="100" r="100" fill="#04050e" />
        <g clipPath="url(#mClip2)">
          <circle cx="100" cy="100" r="100" fill="url(#mSurf2)" />
          <ellipse cx="70"  cy="66"  rx="27" ry="22" fill="rgba(70,60,48,0.58)" />
          <ellipse cx="110" cy="70"  rx="19" ry="16" fill="rgba(70,60,48,0.48)" />
          <ellipse cx="120" cy="96"  rx="21" ry="14" fill="rgba(68,58,46,0.52)" />
          <ellipse cx="140" cy="74"  rx="13" ry="11" fill="rgba(65,56,44,0.54)" />
          <ellipse cx="127" cy="120" rx="12" ry="9"  fill="rgba(66,57,45,0.46)" />
          <ellipse cx="76"  cy="130" rx="14" ry="10" fill="rgba(72,62,50,0.44)" />
          <ellipse cx="95"  cy="134" rx="17" ry="11" fill="rgba(70,61,48,0.42)" />
          <ellipse cx="58"  cy="102" rx="23" ry="40" fill="rgba(68,59,46,0.36)" />
          <circle cx="96"  cy="152" r="5.5" fill="rgba(185,175,158,0.65)" />
          <circle cx="96"  cy="152" r="3"   fill="rgba(228,222,208,0.88)" />
          <circle cx="76"  cy="108" r="6.5" fill="rgba(175,165,148,0.60)" />
          <circle cx="76"  cy="108" r="3.5" fill="rgba(215,208,192,0.82)" />
          <circle cx="86"  cy="50"  r="5"   fill="rgba(58,50,40,0.55)" />
          <circle cx="148" cy="99"  r="5.5" fill="rgba(56,48,38,0.50)" />
          <circle cx="54"  cy="142" r="3.5" fill="rgba(58,50,40,0.46)" />
          <circle cx="114" cy="150" r="4"   fill="rgba(56,48,38,0.42)" />
          <circle cx="60"  cy="56"  r="3"   fill="rgba(58,50,40,0.42)" />
          <circle cx="142" cy="132" r="3.5" fill="rgba(58,50,40,0.40)" />
          <ellipse cx="52" cy="62" rx="20" ry="14" fill="rgba(255,250,238,0.06)" />
          <circle cx="158" cy="100" r="115" fill="rgba(0,0,0,0.88)" />
          <circle cx="100" cy="100" r="100" fill="url(#mEarth2)" />
          <circle cx="100" cy="100" r="100" fill="url(#mShad2)" />
          <circle cx="100" cy="100" r="100" fill="url(#mVig2)" />
        </g>
        <circle cx="100" cy="100" r="100" fill="url(#mRim2)" />
        <circle cx="100" cy="100" r="97" fill="none" stroke="rgba(238,232,218,0.22)" strokeWidth="2.5" strokeDasharray="190 240" strokeDashoffset="-55" />
      </svg>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   The central tap target
───────────────────────────────────────────────────────────────────────── */
function TapCoin({ pair, onTap, exhausted, displayBalance }) {
  const [ringKey, setRingKey]   = useState(0);
  const [bursts,  setBursts]    = useState([]);
  const burstId                 = useRef(0);

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
      {/* Ambient glow behind coin — pure CSS, no Framer loop */}
      <div
        style={{
          position: "absolute",
          width: "88%",
          height: "68%",
          borderRadius: "50%",
          background: `radial-gradient(ellipse, ${C.amber}28 0%, ${C.gold}12 40%, transparent 70%)`,
          filter: "blur(32px)",
          pointerEvents: "none",
          animation: "glowPulse 3.8s ease-in-out infinite",
          willChange: "transform, opacity",
        }}
      />

      {/* Score */}
      <div
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
        {displayBalance.toLocaleString()}
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 28, zIndex: 2 }}>
        <Trophy size={13} color={C.silverTrophy} />
        <span style={{ fontSize: 13, color: C.gray }}>7,352nd</span>
        <span style={{ fontSize: 13, color: C.silverTrophy, marginLeft: 4 }}>Silver</span>
      </div>

      {/* Float wrapper — pure CSS animation, no Framer loop */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          animation: "floatY 3.4s ease-in-out infinite",
          willChange: "transform",
        }}
      >
        {/*
         * Tap target — whileTap ONLY here, no nested motion wrappers
         * that could conflict during rapid taps
         */}
        <motion.div
          whileTap={exhausted ? {} : { scale: 0.87 }}
          transition={{ type: "spring", stiffness: 480, damping: 22 }}
          onPointerDown={handleTap}
          style={{
            position: "relative",
            width:  "min(72vw, 280px)",
            height: "min(72vw, 280px)",
            borderRadius: "50%",
            cursor: exhausted ? "not-allowed" : "pointer",
            userSelect: "none",
            WebkitUserSelect: "none",
            touchAction: "none",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {/* ── Halo ring — CSS spin, no Framer loop ── */}
          <div
            style={{
              position: "absolute",
              inset: -8,
              borderRadius: "50%",
              background: exhausted
                ? "none"
                : "conic-gradient(from 0deg, #8aaad8 0%, #c8dcf8 20%, #ffffff 32%, #d0e4ff 52%, #8aaad8 70%, #e0eeff 88%, #8aaad8 100%)",
              filter: "blur(9px)",
              opacity: exhausted ? 0 : 0.50,
              animation: exhausted ? "none" : "haloSpin 18s linear infinite",
              willChange: "transform",
              pointerEvents: "none",
            }}
          />

          {/* ── Outer border ring ── */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              boxShadow: exhausted
                ? "none"
                : "0 0 0 3px rgba(180,200,255,0.18), 0 18px 55px rgba(90,110,220,0.28), 0 0 70px rgba(160,185,255,0.10)",
              pointerEvents: "none",
            }}
          />

          {/* ── Moon face — fills the full circle ── */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              borderRadius: "50%",
              overflow: "hidden",
              boxShadow: exhausted
                ? "inset 0 0 30px rgba(0,0,0,0.7)"
                : "inset 0 0 18px rgba(0,0,0,0.45), 0 0 32px rgba(180,210,255,0.22)",
            }}
          >
            <MoonFace exhausted={exhausted} />
          </div>

          {/* ── Exhausted overlay ── */}
          {exhausted && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(0,0,0,0.35)",
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: C.gray }}>
                RECHARGING
              </span>
            </div>
          )}

          {/* ── Confetti bursts ── */}
          <AnimatePresence>
            {bursts.map((bid) => (
              <ConfettiBurst key={bid} onDone={() => removeBurst(bid)} />
            ))}
          </AnimatePresence>

          {/* ── Ring burst ── */}
          <BurstRing trigger={ringKey} />
        </motion.div>
      </div>

      {/* Label below */}
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
   Top profile strip
───────────────────────────────────────────────────────────────────────── */
function ProfileStrip({ user, pair, balance }) {
  return (
    <div
      style={{
        position: "relative",
        zIndex: 10,
        margin: "0 16px",
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
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 36, height: 36, borderRadius: "50%",
            background: `conic-gradient(from 0deg, ${C.gold}, ${C.amber}, ${C.gold})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, padding: 2,
          }}
        >
          <div
            style={{
              width: "100%", height: "100%", borderRadius: "50%",
              background: C.void,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >
            <LightningBolt size={16} color={C.gold} />
          </div>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.white }}>
            {user?.email?.split("@")[0] ?? "guest miner"}
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: C.gold, display: "flex", alignItems: "center", gap: 3 }}>
            🪙 {balance.toLocaleString()}
          </div>
        </div>
      </div>
      <div
        style={{
          display: "flex", alignItems: "center", gap: 4,
          padding: "4px 10px", borderRadius: 20,
          background: `${C.gold}18`, border: `1px solid ${C.gold}30`,
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 600, color: C.gold }}>31st</span>
        <ChevronRight size={10} color={C.gray} />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Pair selector pills
───────────────────────────────────────────────────────────────────────── */
function PairSelector({ pairs, selected, onSelect }) {
  return (
    <div
      style={{
        display: "flex", gap: 8, overflowX: "auto",
        paddingLeft: 16, paddingRight: 16, paddingBottom: 4,
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
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 14px", borderRadius: 20,
              border: `1px solid ${active ? p.color + "88" : "rgba(255,255,255,0.08)"}`,
              background: active ? `${p.color}1a` : C.warmBlack,
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 700, color: active ? p.color : C.gray, letterSpacing: "0.06em" }}>
              {p.label}
            </span>
            <span
              style={{
                fontSize: 9, fontWeight: 700,
                color: active ? p.color : "#444",
                background: active ? `${p.color}22` : "#1a1a1a",
                borderRadius: 10, padding: "1px 6px",
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
  const pct   = (energy / max) * 100;
  const color = pct < 20 ? "#ef4444" : pct < 50 ? C.amber : C.blue;
  return (
    <div style={{ padding: "0 20px", zIndex: 2, position: "relative" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <LightningBolt size={14} color={color} />
          <span style={{ fontSize: 12, fontWeight: 600, color: C.white }}>Energy</span>
        </div>
        <span style={{ fontSize: 11, fontWeight: 600, color: C.gray, fontVariantNumeric: "tabular-nums" }}>
          {energy} / {max}
        </span>
      </div>
      <div style={{ height: 8, borderRadius: 4, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
        <motion.div
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.25 }}
          style={{
            height: "100%", borderRadius: 4,
            background: `linear-gradient(90deg, ${color}88, ${color})`,
            boxShadow: `0 0 8px ${color}55`,
            willChange: "width",
          }}
        />
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Bottom nav
───────────────────────────────────────────────────────────────────────── */
function BottomNav({ active, onChange }) {
  const tabs = [
    { id: "mine",   label: "Mine",   Icon: () => <LightningBolt size={22} color={active === "mine"   ? C.gold : C.gray} /> },
    { id: "earn",   label: "Earn",   Icon: () => <span style={{ fontSize: 20 }}>🪙</span> },
    { id: "boosts", label: "Boosts", Icon: () => <Rocket size={22} color={active === "boosts" ? C.gold : C.gray} /> },
  ];
  return (
    <div
      style={{
        position: "relative", zIndex: 10,
        display: "flex", justifyContent: "space-around", alignItems: "flex-end",
        height: 68, padding: "0 8px 12px",
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
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", gap: 3,
              background: "none", border: "none",
              cursor: "pointer", padding: "6px 0 0",
              position: "relative",
            }}
          >
            <Icon />
            <span style={{ fontSize: 10, fontWeight: isActive ? 600 : 400, color: isActive ? C.gold : C.gray, letterSpacing: "0.04em" }}>
              {label}
            </span>
            {isActive && (
              <motion.div
                layoutId="nav-indicator"
                style={{
                  position: "absolute", bottom: -6,
                  width: 24, height: 2, borderRadius: 1,
                  background: C.gold, boxShadow: `0 0 8px ${C.gold}88`,
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
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
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
          width: "100%", maxWidth: 480,
          background: "linear-gradient(160deg, #141414, #0c0c0c)",
          border: `1px solid rgba(255,255,255,0.1)`,
          borderBottom: "none",
          borderRadius: "24px 24px 0 0",
          padding: "28px 24px 48px",
          boxShadow: `0 -8px 48px #000a, 0 -2px 0 ${pair.color}33 inset`,
          position: "relative",
        }}
      >
        <div style={{ width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.15)", margin: "0 auto 24px" }} />

        <div
          style={{
            width: 60, height: 60, borderRadius: "50%",
            background: `${pair.color}18`, border: `1px solid ${pair.color}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px", boxShadow: `0 0 24px ${pair.color}33`,
          }}
        >
          <LightningBolt size={28} color={pair.color} />
        </div>

        <h3 style={{ margin: "0 0 8px", textAlign: "center", fontSize: 20, fontWeight: 700, color: C.white, letterSpacing: "-0.02em" }}>
          Start Mining {pair.name}
        </h3>
        <p style={{ margin: "0 0 28px", textAlign: "center", fontSize: 13, color: C.gray, lineHeight: 1.6 }}>
          Create a free account to begin earning{" "}
          <span style={{ color: pair.color, fontWeight: 700 }}>+{pair.rate} {pair.label}</span> per tap.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate("register")}
            style={{
              width: "100%", padding: "16px", borderRadius: 14, border: "none",
              background: `linear-gradient(135deg, ${pair.color}, ${C.amber})`,
              color: "#000", fontSize: 15, fontWeight: 700, letterSpacing: "0.03em",
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
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
              border: `1px solid rgba(255,255,255,0.1)`,
              background: C.warmBlack, color: "rgba(255,255,255,0.7)",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
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
            position: "absolute", top: 20, right: 20,
            background: C.warmBlack, border: `1px solid rgba(255,255,255,0.1)`,
            borderRadius: "50%", width: 32, height: 32,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: C.gray,
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
  const [pair,         setPair]         = useState(MINING_PAIRS[0]);
  const [balance,      setBalance]      = useState(169788);
  const [energy,       setEnergy]       = useState(MAX_ENERGY);
  const [particles,    setParticles]    = useState([]);
  const [showAuthGate, setShowAuthGate] = useState(false);
  const [activeTab,    setActiveTab]    = useState("mine");

  // Refs for tap handler — avoids stale-closure re-creation on every render
  const energyRef    = useRef(energy);
  const balanceRef   = useRef(balance);
  const pairRef      = useRef(pair);
  const particleId   = useRef(0);
  const syncTimer    = useRef(null);

  useEffect(() => { energyRef.current  = energy;  }, [energy]);
  useEffect(() => { balanceRef.current = balance; }, [balance]);
  useEffect(() => { pairRef.current    = pair;    }, [pair]);

  /* ── Energy regen ── */
  useEffect(() => {
    const iv = setInterval(() => {
      setEnergy((e) => Math.min(e + REGEN_RATE, MAX_ENERGY));
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  /* ── Supabase sync ── */
  const syncBalance = useCallback(
    (newBal) => {
      if (!user?.email) return;
      clearTimeout(syncTimer.current);
      syncTimer.current = setTimeout(async () => {
        await supabase
          .from("balances")
          .upsert({ email: user.email, balance: newBal }, { onConflict: "email" });
      }, SUPABASE_DEBOUNCE);
    },
    [user]
  );

  /* ── Tap handler — stable, never re-created per render ── */
  const handleTap = useCallback(
    (e) => {
      if (!user) { setShowAuthGate(true); return; }
      if (energyRef.current < ENERGY_COST) return;

      const rect    = e.currentTarget?.getBoundingClientRect?.();
      const clientX = e.clientX ?? (rect ? rect.left + rect.width  / 2 : 0);
      const clientY = e.clientY ?? (rect ? rect.top  + rect.height / 2 : 0);

      setEnergy((en) => Math.max(en - ENERGY_COST, 0));
      setBalance((b) => {
        const next = b + pairRef.current.rate;
        syncBalance(next);
        return next;
      });

      const pid = particleId.current++;
      setParticles((p) => [...p, { id: pid, x: clientX, y: clientY, amount: pairRef.current.rate }]);
    },
    [user, syncBalance]
  );

  const removeParticle = useCallback((id) => {
    setParticles((p) => p.filter((x) => x.id !== id));
  }, []);

  const exhausted = energy < ENERGY_COST;

  return (
    <>
      <InjectCSS />
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
        {/* Radial center glow */}
        <div
          style={{
            position: "fixed", inset: 0,
            background: `radial-gradient(ellipse at 50% 50%, ${C.amber}14 0%, transparent 65%)`,
            pointerEvents: "none", zIndex: 0,
          }}
        />
        {/* Bottom ambient */}
        <div
          style={{
            position: "fixed", bottom: 0, left: 0, right: 0, height: 120,
            background: `linear-gradient(to top, transparent, ${C.gold}06, transparent)`,
            pointerEvents: "none", zIndex: 0,
          }}
        />

        <GoldDust />

        <div style={{ paddingTop: 16, paddingBottom: 12, zIndex: 2, position: "relative" }}>
          <ProfileStrip user={user} pair={pair} balance={balance} />
        </div>

        <div style={{ zIndex: 2, position: "relative", marginBottom: 8 }}>
          <PairSelector pairs={MINING_PAIRS} selected={pair} onSelect={setPair} />
        </div>

        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2, position: "relative" }}>
          <TapCoin
            pair={pair}
            onTap={handleTap}
            exhausted={exhausted}
            displayBalance={balance}
          />
        </div>

        <div style={{ zIndex: 2, position: "relative", marginBottom: 12 }}>
          <EnergyBar energy={energy} max={MAX_ENERGY} />
        </div>

        <BottomNav active={activeTab} onChange={setActiveTab} />

        {/* Floating tap particles */}
        {particles.map((p) => (
          <TapParticle
            key={p.id}
            x={p.x}
            y={p.y}
            amount={p.amount}
            onDone={() => removeParticle(p.id)}
          />
        ))}

        <AnimatePresence>
          {showAuthGate && (
            <AuthGateModal
              pair={pair}
              onClose={() => setShowAuthGate(false)}
              onNavigate={(route) => {
                setShowAuthGate(false);
                /* wire to your router here */
              }}
            />
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
