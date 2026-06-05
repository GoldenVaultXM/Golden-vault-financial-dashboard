/**
 * Mining.jsx — GoldenVaultXM Tap-to-Earn Module
 *
 * REDESIGN HIGHLIGHTS
 * ───────────────────
 * • Premium CSS-only gold coin — rich metallic radial gradients, thick rim,
 *   specular highlight arc, inner groove ring — no external image dependency.
 * • Permanent ⚡ identity on the coin face, pair switching only updates metadata.
 * • Buttery-smooth tap: spring animation lives entirely on the coin wrapper;
 *   NO outline / focus ring / blue-box artifacts (WebkitTapHighlightColor,
 *   outline:none, userSelect:none, touchAction:none set everywhere required).
 * • Float, light-sweep, and glow all run on CSS @keyframes where possible to
 *   keep the React render tree small and avoid animation-induced re-renders.
 * • SmokePuff replaced by lightweight CSS keyframe burst — no per-tap state.
 * • All hooks follow Rules of Hooks; zero hook violations.
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { supabase } from "./supabaseClient";
import { Zap, Cpu, TrendingUp, Lock, X, UserPlus, LogIn, Shield, ChevronRight } from "lucide-react";

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
  gold4: "#fde68a",
  goldDim: "#92400e",
  goldDeep: "#3d1c00",
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
   Global CSS injected once — float, light-sweep, coin glow keyframes
   Using CSS animations for background-elements that never need JS control.
───────────────────────────────────────────────────────────────────────── */
const GLOBAL_CSS = `
  *, *::before, *::after { -webkit-tap-highlight-color: transparent !important; }

  @keyframes vaultFloat {
    0%, 100% { transform: translateY(0px); }
    50%       { transform: translateY(-14px); }
  }
  @keyframes vaultShadow {
    0%, 100% { transform: scaleX(1);   opacity: 0.55; }
    50%       { transform: scaleX(0.8); opacity: 0.28; }
  }
  @keyframes vaultGlowPulse {
    0%, 100% { opacity: 0.45; transform: translateX(-50%) scale(1);    }
    50%       { opacity: 0.72; transform: translateX(-50%) scale(1.08); }
  }
  @keyframes vaultSweep {
    0%   { transform: translateX(-120%) skewX(-20deg); opacity: 0; }
    15%  { opacity: 0.6; }
    50%  { opacity: 0.25; }
    100% { transform: translateX(320%)  skewX(-20deg); opacity: 0; }
  }
  @keyframes vaultHaloSpin {
    from { transform: rotate(0deg);   }
    to   { transform: rotate(360deg); }
  }
  @keyframes tapHint {
    0%, 100% { opacity: 0.3; }
    50%       { opacity: 0.75; }
  }
  @keyframes ringBurst {
    0%   { transform: scale(0.72); opacity: 0.9; }
    100% { transform: scale(1.8);  opacity: 0;   }
  }
  @keyframes puffOut {
    0%   { transform: translate(var(--tx), var(--ty)) scale(0.2); opacity: 0.9; }
    100% { transform: translate(calc(var(--tx) * 3.2), calc(var(--ty) * 3.2)) scale(1.6); opacity: 0; }
  }
`;

function injectCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("vault-mining-css")) return;
  const s = document.createElement("style");
  s.id = "vault-mining-css";
  s.textContent = GLOBAL_CSS;
  document.head.appendChild(s);
}

/* ─────────────────────────────────────────────────────────────────────────
   Mining pairs
───────────────────────────────────────────────────────────────────────── */
const MINING_PAIRS = [
  { id: "btc",  label: "BTC",  name: "Bitcoin",   rate: 1, color: "#f7931a" },
  { id: "eth",  label: "ETH",  name: "Ethereum",  rate: 2, color: "#627eea" },
  { id: "sol",  label: "SOL",  name: "Solana",    rate: 3, color: "#9945ff" },
  { id: "xrp",  label: "XRP",  name: "Ripple",    rate: 2, color: "#00aae4" },
  { id: "bnb",  label: "BNB",  name: "BNB",       rate: 4, color: "#f3ba2f" },
  { id: "avax", label: "AVAX", name: "Avalanche", rate: 5, color: "#e84142" },
];

const MAX_ENERGY         = 500;
const ENERGY_COST        = 10;
const REGEN_RATE         = 1;
const SUPABASE_DEBOUNCE  = 1500;

/* ─────────────────────────────────────────────────────────────────────────
   Auth gate modal (bottom-sheet)
───────────────────────────────────────────────────────────────────────── */
function AuthGateModal({ pair, onClose, onNavigate }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18 }}
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
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
          background: "linear-gradient(160deg, #151515, #0d0d0d)",
          border: `1px solid ${C.border2}`,
          borderBottom: "none",
          borderRadius: "24px 24px 0 0",
          padding: "28px 24px 52px",
          boxShadow: `0 -8px 48px #000c, 0 -2px 0 ${pair.color}33 inset`,
          position: "relative",
        }}
      >
        <div style={{
          width: 40, height: 4, borderRadius: 2,
          background: C.border2, margin: "0 auto 24px",
        }} />

        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: `linear-gradient(135deg, ${pair.color}25, ${pair.color}0a)`,
          border: `1.5px solid ${pair.color}55`,
          display: "flex", alignItems: "center", justifyContent: "center",
          margin: "0 auto 20px",
          boxShadow: `0 0 28px ${pair.color}33`,
        }}>
          <Lock size={26} color={pair.color} strokeWidth={2.5} />
        </div>

        <h3 style={{
          margin: "0 0 8px", textAlign: "center",
          fontSize: 20, fontWeight: 900, color: C.text, letterSpacing: "-0.02em",
        }}>
          Start Mining {pair.name}
        </h3>
        <p style={{
          margin: "0 0 28px", textAlign: "center",
          fontSize: 13, color: C.text3, lineHeight: 1.65,
        }}>
          Create a free account to earn{" "}
          <span style={{ color: pair.color, fontWeight: 800 }}>+{pair.rate} {pair.label}</span>{" "}
          per tap and track your balance.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => onNavigate("register")}
            style={{
              width: "100%", padding: "16px", borderRadius: 14, border: "none",
              background: `linear-gradient(135deg, ${C.gold2}, ${C.gold3})`,
              color: "#000", fontSize: 15, fontWeight: 900, letterSpacing: "0.04em",
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 8,
              boxShadow: `0 4px 22px ${C.gold}55`,
              outline: "none",
            }}
          >
            <UserPlus size={17} strokeWidth={2.5} />
            Create Free Account
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.96 }}
            onClick={() => onNavigate("login")}
            style={{
              width: "100%", padding: "15px", borderRadius: 14,
              border: `1px solid ${C.border2}`, background: C.card2,
              color: C.text2, fontSize: 14, fontWeight: 700, letterSpacing: "0.03em",
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 8, outline: "none",
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
            background: C.card3, border: `1px solid ${C.border}`,
            borderRadius: "50%", width: 32, height: 32,
            display: "flex", alignItems: "center", justifyContent: "center",
            cursor: "pointer", color: C.text3, outline: "none",
          }}
        >
          <X size={15} />
        </button>
      </motion.div>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Auth Gate (full page when not signed in)
───────────────────────────────────────────────────────────────────────── */
function AuthGate({ onSignUp, onSignIn }) {
  return (
    <div style={{
      background: C.bg, minHeight: "100vh", display: "flex", flexDirection: "column",
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
      position: "relative", overflow: "hidden",
    }}>
      <div style={{
        position: "absolute", top: "20%", left: "50%",
        transform: "translateX(-50%)", width: 320, height: 320, borderRadius: "50%",
        background: `radial-gradient(circle, ${C.gold}18 0%, transparent 70%)`,
        filter: "blur(40px)", pointerEvents: "none",
      }} />

      <div style={{
        padding: "18px 16px 14px", borderBottom: `1px solid ${C.border}`,
        background: `linear-gradient(180deg, #0d0818, ${C.bg})`,
      }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: C.text, letterSpacing: "-0.02em" }}>
          Tap{" "}
          <span style={{ color: C.gold2, textShadow: `0 0 20px ${C.gold}66` }}>Mining</span>
        </h1>
      </div>

      <div style={{
        display: "flex", justifyContent: "center", alignItems: "center",
        paddingTop: 40, paddingBottom: 16, position: "relative",
      }}>
        <div style={{
          width: 200, height: 200, borderRadius: "50%",
          background: `radial-gradient(circle at 35% 28%, ${C.gold3}44, ${C.gold}33 40%, ${C.goldDim}22)`,
          border: `3px solid ${C.gold}33`, boxShadow: `0 0 60px ${C.gold}22`,
          filter: "blur(3px)", display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ opacity: 0.3, fontSize: 64 }}>⚡</div>
        </div>
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
          style={{
            position: "absolute", display: "flex", flexDirection: "column",
            alignItems: "center", gap: 8,
          }}
        >
          <div style={{
            width: 60, height: 60, borderRadius: "50%",
            background: "linear-gradient(145deg, #1a1a1a, #111)",
            border: `2px solid ${C.gold}55`,
            boxShadow: `0 0 24px ${C.gold}33, inset 0 1px 0 #ffffff0a`,
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Lock size={24} color={C.gold2} />
          </div>
          <span style={{
            fontSize: 10, fontWeight: 800, color: C.gold2,
            letterSpacing: "0.2em", textTransform: "uppercase",
            textShadow: `0 0 12px ${C.gold}88`,
          }}>LOCKED</span>
        </motion.div>
      </div>

      <div style={{
        margin: "0 16px",
        background: "linear-gradient(145deg, #141414, #0e0e0e)",
        border: `1px solid ${C.border2}`, borderTop: `1px solid ${C.gold}22`,
        borderRadius: 20, padding: "28px 24px",
        boxShadow: "0 4px 32px #00000088, inset 0 1px 0 #ffffff06",
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 12,
            background: `${C.gold}0d`, border: `1px solid ${C.gold}22`,
            borderRadius: 14, padding: "10px 20px",
          }}>
            <Shield size={16} color={C.gold2} />
            <span style={{ fontSize: 11, fontWeight: 800, color: C.gold2, letterSpacing: "0.1em" }}>
              SECURE VAULT ACCESS
            </span>
          </div>
        </div>
        <h2 style={{
          margin: "0 0 10px", fontSize: 20, fontWeight: 900,
          color: C.text, textAlign: "center", letterSpacing: "-0.02em",
        }}>
          Sign up to start mining
        </h2>
        <p style={{
          margin: "0 0 28px", fontSize: 13, color: C.text2,
          textAlign: "center", lineHeight: 1.6,
        }}>
          Create your free account to access Tap Mining, track your balance,
          and earn rewards across BTC, ETH, SOL & more.
        </p>
        {[
          "Persistent balance saved to your account",
          "Mine BTC, ETH, SOL, XRP, BNB & AVAX",
          "Real-time energy regeneration",
        ].map((perk) => (
          <div key={perk} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%", background: C.gold2,
              flexShrink: 0, boxShadow: `0 0 6px ${C.gold}`,
            }} />
            <span style={{ fontSize: 12, color: C.text2 }}>{perk}</span>
          </div>
        ))}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 24 }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onSignUp}
            style={{
              width: "100%", padding: "15px", borderRadius: 14, border: "none",
              background: `linear-gradient(135deg, ${C.gold}, ${C.gold2})`,
              color: "#000", fontSize: 14, fontWeight: 900, letterSpacing: "0.06em",
              cursor: "pointer", display: "flex", alignItems: "center",
              justifyContent: "center", gap: 8, boxShadow: `0 4px 20px ${C.gold}55`,
              outline: "none",
            }}
          >
            CREATE FREE ACCOUNT <ChevronRight size={16} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onSignIn}
            style={{
              width: "100%", padding: "14px", borderRadius: 14,
              border: `1px solid ${C.border2}`, background: C.card2,
              color: C.text2, fontSize: 13, fontWeight: 700, letterSpacing: "0.04em",
              cursor: "pointer", outline: "none",
            }}
          >
            Already have an account? Sign In
          </motion.button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Floating "+N" tap particle
───────────────────────────────────────────────────────────────────────── */
function TapParticle({ x, y, amount, onDone }) {
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, scale: 1 }}
      animate={{ opacity: 0, y: -88, scale: 1.35 }}
      transition={{ duration: 0.78, ease: "easeOut" }}
      onAnimationComplete={onDone}
      style={{
        position: "fixed", left: x - 22, top: y - 22,
        pointerEvents: "none", zIndex: 999,
        fontFamily: "'SF Pro Display', -apple-system, sans-serif",
        fontWeight: 900, fontSize: 22,
        color: C.gold3,
        textShadow: `0 0 12px ${C.gold}cc, 0 0 28px ${C.gold}66`,
        userSelect: "none", letterSpacing: "-0.02em",
      }}
    >
      +{amount}
    </motion.div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Pair selector
───────────────────────────────────────────────────────────────────────── */
function PairSelector({ pairs, selected, onSelect }) {
  return (
    <div style={{
      display: "flex", gap: 8, overflowX: "auto",
      paddingBottom: 4, paddingLeft: 16, paddingRight: 16,
      scrollbarWidth: "none", msOverflowStyle: "none",
    }}>
      {pairs.map((p) => {
        const active = p.id === selected.id;
        return (
          <motion.button
            key={p.id}
            whileTap={{ scale: 0.91 }}
            onClick={() => onSelect(p)}
            style={{
              flexShrink: 0, display: "flex", alignItems: "center", gap: 7,
              padding: "8px 14px", borderRadius: 20,
              border: `1px solid ${active ? p.color + "99" : C.border2}`,
              background: active ? `${p.color}1f` : C.card2,
              cursor: "pointer", outline: "none",
              transition: "border-color 0.18s, background 0.18s",
              WebkitTapHighlightColor: "transparent",
            }}
          >
            <span style={{
              fontSize: 11, fontWeight: 900,
              color: active ? p.color : C.text3, letterSpacing: "0.06em",
            }}>
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
   Premium Vault Coin
   ─ Pure CSS metallic construction, permanent ⚡ identity
   ─ Tap feedback via Framer spring with NO browser highlight / focus ring
───────────────────────────────────────────────────────────────────────── */
function VaultCoin({ exhausted, onTap }) {
  const [tapKey, setTapKey] = useState(0);
  const prefersReduced = useReducedMotion();

  const handlePointerDown = useCallback(
    (e) => {
      e.preventDefault();
      if (exhausted) return;
      setTapKey((k) => k + 1);
      onTap(e);
    },
    [exhausted, onTap]
  );

  const SIZE     = "min(72vw, 288px)";
  const HALF_NUM = 144; // for positioning children, in px equivalent

  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      minHeight: 320, position: "relative",
      paddingTop: 12, paddingBottom: 0,
    }}>

      {/* ── Ambient glow pool behind coin ── */}
      <div style={{
        position: "absolute", top: "8%", left: "50%",
        width: "90%", height: "75%", borderRadius: "50%",
        background: `radial-gradient(ellipse, ${C.purpleGlow}3a 0%, ${C.purple}1a 40%, transparent 70%)`,
        filter: "blur(36px)", pointerEvents: "none",
        animation: prefersReduced ? "none" : "vaultGlowPulse 3.6s ease-in-out infinite",
        transformOrigin: "center",
      }} />

      {/* ── Floating coin container ── */}
      <div style={{
        animation: prefersReduced ? "none" : "vaultFloat 3.2s ease-in-out infinite",
        position: "relative", zIndex: 2,
        willChange: "transform",
      }}>

        {/* Framer tap spring wrapper — ONLY this scales on tap */}
        <motion.div
          whileTap={exhausted ? {} : { scale: 0.87, rotateZ: -1.5 }}
          transition={{ type: "spring", stiffness: 480, damping: 22, mass: 0.9 }}
          onPointerDown={handlePointerDown}
          style={{
            position: "relative",
            width: SIZE, height: SIZE,
            borderRadius: "50%",
            cursor: exhausted ? "not-allowed" : "pointer",
            userSelect: "none",
            WebkitUserSelect: "none",
            touchAction: "none",
            WebkitTapHighlightColor: "transparent",
            outline: "none",
            willChange: "transform",
          }}
        >
          {/* ── Spinning halo (conic gradient ring) ── */}
          {!exhausted && (
            <div style={{
              position: "absolute", inset: -12, borderRadius: "50%",
              background: `conic-gradient(from 0deg,
                ${C.purpleGlow}55, ${C.gold3}cc, ${C.pink}44,
                ${C.gold2}aa, transparent 70%, ${C.purpleGlow}55)`,
              filter: "blur(14px)",
              animation: prefersReduced ? "none" : "vaultHaloSpin 10s linear infinite",
              opacity: 0.85,
              willChange: "transform",
            }} />
          )}

          {/* ── Outer separator ring ── */}
          <div style={{
            position: "absolute", inset: -3, borderRadius: "50%",
            border: `2px solid ${exhausted ? C.border + "55" : C.gold2 + "44"}`,
            pointerEvents: "none",
          }} />

          {/* ── Coin body: rich gold metallic ── */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: "50%",
            background: exhausted
              ? "radial-gradient(circle at 38% 32%, #2a2040, #0e0a1c)"
              : `radial-gradient(circle at 32% 24%,
                  #fffde0 0%,
                  ${C.gold4} 12%,
                  ${C.gold3} 28%,
                  ${C.gold2} 48%,
                  ${C.gold}  65%,
                  ${C.goldDim} 80%,
                  ${C.goldDeep} 100%)`,
            boxShadow: exhausted
              ? "0 8px 32px #00000088"
              : `0 18px 64px ${C.gold}50,
                 0 4px 0 #fffde077 inset,
                 0 -10px 0 #00000055 inset,
                 0 0 0 3px ${C.gold}55`,
            border: `4px solid ${exhausted ? "#2a1f4a" : C.goldDim + "cc"}`,
            display: "flex", alignItems: "center",
            justifyContent: "center", flexDirection: "column",
            overflow: "hidden",
            transition: "background 0.45s, box-shadow 0.45s, border-color 0.45s",
          }}>

            {/* Rim groove — inner circle engraving */}
            <div style={{
              position: "absolute", inset: 12, borderRadius: "50%",
              border: `2.5px solid ${exhausted ? "#2a1f4a" : "#ffffffaa"}`,
              boxShadow: exhausted ? "none" : `inset 0 0 0 1px ${C.goldDeep}66`,
              pointerEvents: "none",
            }} />

            {/* Specular highlight arc — top-left gleam */}
            {!exhausted && (
              <div style={{
                position: "absolute",
                top: "10%", left: "14%",
                width: "48%", height: "28%",
                borderRadius: "50% 50% 0 0 / 100% 100% 0 0",
                background: "linear-gradient(160deg, #ffffffcc 0%, transparent 80%)",
                filter: "blur(6px)",
                opacity: 0.55,
                pointerEvents: "none",
                transform: "rotate(-20deg)",
              }} />
            )}

            {/* Sweeping light ray */}
            {!exhausted && (
              <div style={{
                position: "absolute", inset: 0, borderRadius: "50%",
                overflow: "hidden", pointerEvents: "none",
              }}>
                <div style={{
                  position: "absolute", top: 0, left: 0,
                  width: "30%", height: "100%",
                  background: "linear-gradient(90deg, transparent, #ffffff33, transparent)",
                  animation: prefersReduced ? "none" : "vaultSweep 4.5s ease-in-out infinite",
                  willChange: "transform",
                }} />
              </div>
            )}

            {/* ── PERMANENT ⚡ emblem ── */}
            <div style={{
              position: "relative", zIndex: 2,
              display: "flex", alignItems: "center", justifyContent: "center",
              opacity: exhausted ? 0.22 : 1,
              filter: exhausted
                ? "none"
                : `drop-shadow(0 0 14px ${C.gold3}dd)
                   drop-shadow(0 4px 10px #00000099)
                   drop-shadow(0 -2px 6px #ffffff55)`,
            }}>
              <Zap
                size={96}
                color={exhausted ? C.text4 : "#ffffff"}
                fill={exhausted ? C.text4 : C.gold3}
                strokeWidth={1.2}
              />
            </div>

            {/* Active pair label — only metadata, never changes the emblem */}
          </div>

          {/* ── Ring burst on tap ── */}
          <AnimatePresence>
            {tapKey > 0 && (
              <motion.div
                key={tapKey}
                initial={{ scale: 0.7, opacity: 0.95 }}
                animate={{ scale: 1.82, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.42, ease: "easeOut" }}
                style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  border: `2.5px solid ${C.gold2}`,
                  boxShadow: `0 0 20px ${C.gold}aa, inset 0 0 16px ${C.gold}44`,
                  pointerEvents: "none",
                }}
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* ── Coin pedestal ── */}
      <div style={{
        position: "relative", zIndex: 1, marginTop: -16,
        display: "flex", flexDirection: "column", alignItems: "center",
      }}>
        {/* Drop shadow beneath coin */}
        <div style={{
          width: "52%", height: 14, borderRadius: "50%",
          background: `radial-gradient(ellipse, ${C.gold}44 0%, transparent 72%)`,
          filter: "blur(7px)", marginBottom: -7,
          animation: prefersReduced ? "none" : "vaultShadow 3.2s ease-in-out infinite",
          transformOrigin: "center",
        }} />
        {/* Top disc */}
        <div style={{
          width: "60vw", maxWidth: 214, height: 17, borderRadius: "50%",
          background: "linear-gradient(180deg, #28194a, #18102e)",
          border: `1px solid ${C.border2}`,
          boxShadow: `0 4px 18px #00000077, 0 1px 0 ${C.purple2}33 inset`,
        }} />
        {/* Column body */}
        <div style={{
          width: "42vw", maxWidth: 148, height: 20,
          background: "linear-gradient(180deg, #1d1438, #110d20)",
          borderLeft: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`,
          boxShadow: "0 6px 20px #00000066",
          clipPath: "polygon(4% 0%, 96% 0%, 100% 100%, 0% 100%)",
        }} />
        {/* Base plate */}
        <div style={{
          width: "50vw", maxWidth: 180, height: 10,
          borderRadius: "0 0 8px 8px",
          background: "linear-gradient(180deg, #160f28, #0d0a18)",
          border: `1px solid ${C.border}`, borderTop: "none",
          boxShadow: "0 4px 16px #00000055",
        }} />
      </div>

      {/* Tap hint */}
      {!exhausted && (
        <div style={{
          marginTop: 14, fontSize: 9, fontWeight: 700,
          letterSpacing: "0.24em", color: C.text3, textTransform: "uppercase",
          animation: prefersReduced ? "none" : "tapHint 2.4s ease-in-out infinite",
        }}>
          TAP THE VAULT TO MINE
        </div>
      )}

      {exhausted && (
        <div style={{
          marginTop: 14, fontSize: 9, fontWeight: 700,
          letterSpacing: "0.24em", color: C.red, textTransform: "uppercase",
        }}>
          ⚡ RECHARGING…
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Stats strip
───────────────────────────────────────────────────────────────────────── */
function StatsStrip({ balance, sessionEarned, taps }) {
  const stats = [
    { label: "Balance",  value: balance.toFixed(2),        icon: <TrendingUp size={14} color={C.gold2} />,  color: C.gold2 },
    { label: "Session",  value: `+${sessionEarned}`,       icon: <Zap size={14} color={C.green} />,         color: C.green },
    { label: "Taps",     value: taps.toLocaleString(),     icon: <Cpu size={14} color={C.purple} />,        color: C.purple },
  ];
  return (
    <div style={{
      display: "grid", gridTemplateColumns: "repeat(3, 1fr)",
      gap: 8, marginTop: 40, paddingLeft: 16, paddingRight: 16,
    }}>
      {stats.map((s) => (
        <div key={s.label} style={{
          background: `linear-gradient(145deg, ${C.card2}, ${C.card})`,
          border: `1px solid ${C.border}`, borderRadius: 14,
          padding: "14px 8px 12px", textAlign: "center",
          boxShadow: "0 2px 12px #00000066, inset 0 1px 0 #ffffff08",
        }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 5 }}>{s.icon}</div>
          <div style={{
            fontSize: 16, fontWeight: 900, color: s.color,
            fontVariantNumeric: "tabular-nums", lineHeight: 1.1, letterSpacing: "-0.02em",
          }}>{s.value}</div>
          <div style={{
            fontSize: 9, color: C.text3, textTransform: "uppercase",
            letterSpacing: "0.12em", marginTop: 4,
          }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Asset info card
───────────────────────────────────────────────────────────────────────── */
function AssetInfo({ pair }) {
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
        <div style={{ fontSize: 12, fontWeight: 800, color: C.text, letterSpacing: "0.04em" }}>
          {pair.name}
        </div>
        <div style={{ fontSize: 10, color: C.text3, marginTop: 2, letterSpacing: "0.06em" }}>
          Active Mining Pair
        </div>
      </div>
      <div style={{
        background: `${pair.color}18`, border: `1px solid ${pair.color}44`,
        borderRadius: 20, padding: "5px 12px",
        fontSize: 11, fontWeight: 900, color: pair.color, letterSpacing: "0.08em",
      }}>
        +{pair.rate} / TAP
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Energy bar
───────────────────────────────────────────────────────────────────────── */
function EnergyBar({ energy, max }) {
  const pct = Math.max(0, Math.min(1, energy / max));
  const barColor = pct > 0.6 ? C.gold2 : pct > 0.3 ? "#fb923c" : C.red;
  return (
    <div style={{
      marginLeft: 16, marginRight: 16,
      background: "linear-gradient(135deg, #111, #0c0c0c)",
      border: `1px solid ${C.border}`, borderRadius: 14,
      padding: "14px 16px", boxShadow: "0 2px 12px #00000044",
    }}>
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", marginBottom: 10,
      }}>
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
      <div style={{
        height: 7, borderRadius: 4, background: "#1a1a1a",
        overflow: "hidden", border: `1px solid ${C.border}`,
      }}>
        <motion.div
          animate={{ width: `${pct * 100}%` }}
          transition={{ type: "spring", stiffness: 160, damping: 26 }}
          style={{
            height: "100%", borderRadius: 4,
            background: `linear-gradient(90deg, ${barColor}88, ${barColor})`,
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
export default function Mining({ user, onNavigateSignUp, onNavigateSignIn }) {
  // Inject global CSS once on mount
  useEffect(() => { injectCSS(); }, []);

  const [selectedPair, setSelectedPair]   = useState(MINING_PAIRS[0]);
  const [balance,      setBalance]        = useState(0);
  const [energy,       setEnergy]         = useState(MAX_ENERGY);
  const [sessionEarned,setSessionEarned]  = useState(0);
  const [tapCount,     setTapCount]       = useState(0);
  const [particles,    setParticles]      = useState([]);
  const [showAuthGate, setShowAuthGate]   = useState(false);

  const balanceRef     = useRef(0);
  const debounceTimer  = useRef(null);
  const particleId     = useRef(0);

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

  /* Energy regeneration — 1/sec */
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
      }, SUPABASE_DEBOUNCE);
    },
    [user?.email]
  );

  /* Tap handler */
  const handleTap = useCallback(
    (e) => {
      if (isGuest) { setShowAuthGate(true); return; }
      if (energy < ENERGY_COST) return;

      const earned     = selectedPair.rate;
      const newBalance = balanceRef.current + earned;
      balanceRef.current = newBalance;

      setBalance(newBalance);
      setEnergy((en) => Math.max(0, en - ENERGY_COST));
      setSessionEarned((s) => s + earned);
      setTapCount((t) => t + 1);
      syncToSupabase(newBalance);

      /* Particle spawn — use fixed viewport coords */
      const rect = e.currentTarget?.getBoundingClientRect?.()
        ?? { left: 0, top: 0, width: 0, height: 0 };
      const cx = rect.left + rect.width / 2;
      const cy = rect.top  + rect.height / 2;
      const px = cx + (Math.random() - 0.5) * 50;
      const py = cy + (Math.random() - 0.5) * 50;
      const id = particleId.current++;
      setParticles((prev) => [...prev, { id, x: px, y: py, amount: earned }]);
    },
    [isGuest, energy, selectedPair, syncToSupabase]
  );

  const removeParticle = useCallback((id) => {
    setParticles((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const handleNavigate = useCallback((route) => {
    setShowAuthGate(false);
    if (route === "register") onNavigateSignUp?.();
    else onNavigateSignIn?.();
  }, [onNavigateSignUp, onNavigateSignIn]);

  const exhausted = !isGuest && energy < ENERGY_COST;

  /* If not signed in, show the full auth gate */
  if (isGuest && !user) {
    return (
      <AuthGate
        onSignUp={() => { setShowAuthGate(false); onNavigateSignUp?.(); }}
        onSignIn={() => { setShowAuthGate(false); onNavigateSignIn?.(); }}
      />
    );
  }

  return (
    <div style={{
      background: "linear-gradient(160deg, #0d0818 0%, #07050f 40%, #0a0618 70%, #06040e 100%)",
      minHeight: "100vh", display: "flex", flexDirection: "column",
      fontFamily: "'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif",
      paddingBottom: 100, position: "relative", overflow: "hidden",
    }}>

      {/* ── Background orbs ── */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-10%", left: "-15%", width: 320, height: 320, borderRadius: "50%", background: "radial-gradient(circle, #7c3aed22 0%, transparent 70%)", filter: "blur(40px)" }} />
        <div style={{ position: "absolute", top: "5%", right: "-10%",  width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, #a855f718 0%, transparent 70%)", filter: "blur(50px)" }} />
        <div style={{ position: "absolute", top: "25%", left: "50%", transform: "translateX(-50%)", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, #6d28d912 0%, transparent 65%)", filter: "blur(60px)" }} />
        <div style={{ position: "absolute", bottom: "8%", right: "10%", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle, #ec489914 0%, transparent 70%)", filter: "blur(40px)" }} />
      </div>

      {/* ── Header ── */}
      <div style={{
        padding: "18px 16px 14px",
        borderBottom: `1px solid ${C.border}`,
        background: "linear-gradient(180deg, #0d0818ee, #07050fee)",
        position: "relative", zIndex: 1,
      }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 900, color: C.text, letterSpacing: "-0.02em" }}>
          Tap{" "}
          <span style={{ color: C.gold2, textShadow: `0 0 20px ${C.gold}66` }}>Mining</span>
        </h1>
      </div>

      {/* ── Pair selector ── */}
      <div style={{ paddingTop: 16, paddingBottom: 12, position: "relative", zIndex: 1 }}>
        <PairSelector pairs={MINING_PAIRS} selected={selectedPair} onSelect={setSelectedPair} />
      </div>

      {/* ── PRIORITY 1: Vault Coin ── */}
      <div style={{ position: "relative", zIndex: 2 }}>
        <VaultCoin exhausted={exhausted} onTap={handleTap} />

        {/* Guest lock badge */}
        {isGuest && (
          <div style={{
            position: "absolute", top: 12, right: 24,
            display: "flex", alignItems: "center", gap: 5,
            background: "#0f0f0fcc", border: `1px solid ${C.border2}`,
            borderRadius: 20, padding: "5px 10px",
            backdropFilter: "blur(8px)", WebkitBackdropFilter: "blur(8px)",
          }}>
            <Lock size={11} color={C.gold2} strokeWidth={2.5} />
            <span style={{ fontSize: 10, fontWeight: 700, color: C.gold2, letterSpacing: "0.08em" }}>
              SIGN IN TO MINE
            </span>
          </div>
        )}
      </div>

      {/* ── PRIORITY 2: Stats ── */}
      <div style={{ position: "relative", zIndex: 1 }}>
        <StatsStrip balance={balance} sessionEarned={sessionEarned} taps={tapCount} />
      </div>

      {/* ── PRIORITY 3: Asset info ── */}
      <div style={{ paddingTop: 20, position: "relative", zIndex: 1 }}>
        <AssetInfo pair={selectedPair} />
      </div>

      {/* ── PRIORITY 4: Energy bar ── */}
      <div style={{ paddingTop: 12, position: "relative", zIndex: 1 }}>
        <EnergyBar energy={energy} max={MAX_ENERGY} />
      </div>

      {/* ── Tap particles ── */}
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
