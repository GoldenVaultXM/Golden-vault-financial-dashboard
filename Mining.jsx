/**
 * Mining.jsx  –  GoldenVaultXM Tap-to-Earn Module
 *
 * ┌─ Architecture Notes ───────────────────────────────────────────────────┐
 * │  • All mining state (balance, energy) is LOCAL to this component.      │
 * │  • Parent app receives zero re-renders from tap events.                │
 * │  • Supabase sync is debounced (1 500 ms).                              │
 * │  • CinematicPlanet replaces TapCoin — prop API identical.              │
 * │  • Energy regenerates at 1 unit/second via a lightweight setInterval.  │
 * └────────────────────────────────────────────────────────────────────────┘
 */

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "./supabaseClient";
import {
  ChevronRight,
  X,
  UserPlus,
  LogIn,
  Zap,
  Rocket,
  Coins,
  Trophy,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────────────
   Design tokens – Notcoin palette
───────────────────────────────────────────────────────────────────────── */
const C = {
  void:        "#0A0A0A",
  charcoal:    "#141414",
  warmBlack:   "#1A1A1A",
  card:        "#1A1A1A",
  card2:       "#141414",
  gold:        "#FFD700",
  amber:       "#FF8C00",
  blue:        "#0088FF",
  magenta:     "#FF1493",
  pink:        "#FFB6C1",
  silverTrophy:"#C0C0C0",
  goldTrophy:  "#D4A017",
  darkGold:    "#B8860B",
  white:       "#FFFFFF",
  gray:        "#8A8A8A",
  border:      "rgba(255,215,0,0.08)",
  border2:     "rgba(255,255,255,0.1)",
};

/* ─────────────────────────────────────────────────────────────────────────
   Mining pair definitions
───────────────────────────────────────────────────────────────────────── */
const MINING_PAIRS = [
  { id: "btc", label: "BTC", name: "Bitcoin",   rate: 1, color: "#f7931a" },
  { id: "eth", label: "ETH", name: "Ethereum",  rate: 2, color: "#627eea" },
  { id: "sol", label: "SOL", name: "Solana",    rate: 3, color: "#9945ff" },
  { id: "xau", label: "XAU", name: "Gold Spot", rate: 5, color: C.gold    },
];

/* ─────────────────────────────────────────────────────────────────────────
   Energy constants
───────────────────────────────────────────────────────────────────────── */
const MAX_ENERGY          = 500;
const ENERGY_COST         = 10;
const REGEN_RATE          = 1;
const SUPABASE_DEBOUNCE_MS = 1500;

/* ═══════════════════════════════════════════════════════════════════════════
   PROCEDURAL NOISE  (classic Perlin – no external imports)
═══════════════════════════════════════════════════════════════════════════ */

function _fade(t) { return t * t * t * (t * (t * 6 - 15) + 10); }
function _lerp(a, b, t) { return a + t * (b - a); }

const _PERM = new Uint8Array(512);
(function () {
  const s = Array.from({ length: 256 }, (_, i) => i);
  let seed = 0xdeadbeef;
  for (let i = 255; i > 0; i--) {
    seed = (seed ^ (seed << 13)) >>> 0;
    seed = (seed ^ (seed >> 17)) >>> 0;
    seed = (seed ^ (seed << 5))  >>> 0;
    const j = seed % (i + 1);
    [s[i], s[j]] = [s[j], s[i]];
  }
  for (let i = 0; i < 512; i++) _PERM[i] = s[i & 255];
})();

function _grad3(h, x, y, z) {
  h &= 15;
  const u = h < 8 ? x : y;
  const v = h < 4 ? y : (h === 12 || h === 14 ? x : z);
  return ((h & 1) ? -u : u) + ((h & 2) ? -v : v);
}

function _noise3(x, y, z) {
  const xi = Math.floor(x) & 255, yi = Math.floor(y) & 255, zi = Math.floor(z) & 255;
  x -= Math.floor(x); y -= Math.floor(y); z -= Math.floor(z);
  const u = _fade(x), v = _fade(y), w = _fade(z);
  const A  = _PERM[xi]   + yi, AA = _PERM[A]   + zi, AB = _PERM[A+1] + zi;
  const B  = _PERM[xi+1] + yi, BA = _PERM[B]   + zi, BB = _PERM[B+1] + zi;
  return _lerp(
    _lerp(_lerp(_grad3(_PERM[AA],   x,   y,   z), _grad3(_PERM[BA],   x-1, y,   z), u),
          _lerp(_grad3(_PERM[AB],   x,   y-1, z), _grad3(_PERM[BB],   x-1, y-1, z), u), v),
    _lerp(_lerp(_grad3(_PERM[AA+1], x,   y,   z-1), _grad3(_PERM[BA+1], x-1, y,   z-1), u),
          _lerp(_grad3(_PERM[AB+1], x,   y-1, z-1), _grad3(_PERM[BB+1], x-1, y-1, z-1), u), v),
    w
  );
}

function _fbm(x, y, z, oct = 7) {
  let v = 0, a = 0.5, f = 1, mx = 0;
  for (let o = 0; o < oct; o++) {
    v += _noise3(x * f, y * f, z * f) * a;
    mx += a; a *= 0.5; f *= 2.07;
  }
  return v / mx;
}

/* ═══════════════════════════════════════════════════════════════════════════
   SURFACE TEXTURE STRIP  (baked once at startup, 512×256 lon×lat)
═══════════════════════════════════════════════════════════════════════════ */

const _SW = 512, _SH = 256;
let _surfaceBaked = null;

function _bake() {
  if (_surfaceBaked) return;
  _surfaceBaked = new Uint8Array(_SW * _SH * 3);
  for (let iy = 0; iy < _SH; iy++) {
    const sinLat = (iy / (_SH - 1)) * 2 - 1;
    const phi    = Math.asin(Math.max(-1, Math.min(1, sinLat)));
    for (let ix = 0; ix < _SW; ix++) {
      const lon = (ix / (_SW - 1)) * Math.PI * 2;
      const sx  = Math.cos(phi) * Math.cos(lon);
      const sy  = Math.sin(phi);
      const sz  = Math.cos(phi) * Math.sin(lon);
      const n      = _fbm(sx * 2.3, sy * 2.3, sz * 2.3, 7);
      const detail = _fbm(sx * 8 + 5, sy * 8 + 5, sz * 8 + 5, 4) * 0.18;
      const c      = _fbm(sx * 6 + 20, sy * 6 + 20, sz * 6 + 20, 3);
      const crater = c > 0.3 ? (c - 0.3) * 0.45 : 0;
      const t      = (n + detail - crater + 1) * 0.5;
      const band   = 0.5 + 0.5 * Math.sin(sinLat * Math.PI * 6 + n * 4);
      const r = Math.round(_lerp(_lerp(55, 215, t), _lerp(90, 195, t), band));
      const g = Math.round(_lerp(_lerp(28, 128, t), _lerp(55, 115, t), band));
      const b = Math.round(_lerp(_lerp(8,  38,  t), _lerp(16, 44,  t), band));
      const idx = (iy * _SW + ix) * 3;
      _surfaceBaked[idx]   = r;
      _surfaceBaked[idx+1] = g;
      _surfaceBaked[idx+2] = b;
    }
  }
}

/* ═══════════════════════════════════════════════════════════════════════════
   CANVAS PLANET HOOK
═══════════════════════════════════════════════════════════════════════════ */

function usePlanetCanvas({ canvasRef, radius, exhausted, tapPulseRef }) {
  const rotRef  = useRef(0);
  const rafRef  = useRef(null);
  const lastRef = useRef(null);

  useEffect(() => {
    _bake();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx  = canvas.getContext("2d");
    const dpr  = Math.min(window.devicePixelRatio || 1, 2);
    const size = radius * 2;
    canvas.width        = size * dpr;
    canvas.height       = size * dpr;
    canvas.style.width  = size + "px";
    canvas.style.height = size + "px";
    ctx.scale(dpr, dpr);

    // Star direction (top-left, normalised)
    const Lx = -0.52, Ly = 0.62, Lz = 0.58;
    const ll = Math.sqrt(Lx*Lx + Ly*Ly + Lz*Lz);
    const lx = Lx/ll, ly = Ly/ll, lz = Lz/ll;

    function frame(ts) {
      if (!lastRef.current) lastRef.current = ts;
      const dt = Math.min((ts - lastRef.current) / 1000, 0.05);
      lastRef.current = ts;

      if (!exhausted) rotRef.current += dt * 0.20;

      const lon0 = rotRef.current;
      const cx = size / 2, cy = size / 2;
      const r  = radius - 2;
      const img  = ctx.createImageData(size, size);
      const data = img.data;

      if (tapPulseRef.current > 0)
        tapPulseRef.current = Math.max(0, tapPulseRef.current - dt * 3.5);

      for (let py = 0; py < size; py++) {
        const dy = (py - cy) / r;
        if (Math.abs(dy) > 1) continue;
        const cosPhi = Math.sqrt(1 - dy * dy);
        for (let px = 0; px < size; px++) {
          const dx = (px - cx) / r;
          const d2 = dx*dx + dy*dy;
          if (d2 > 1) continue;
          const dz = Math.sqrt(1 - d2);
          const nx = dx, ny = -dy, nz = dz;
          const lon  = Math.atan2(dx / Math.max(cosPhi, 0.001), dz / Math.max(cosPhi, 0.001)) + lon0;
          const lonN = ((lon % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
          const sinLat = dy;
          const iy = Math.min(_SH-1, Math.round(((sinLat+1)*0.5) * (_SH-1)));
          const ix = Math.min(_SW-1, Math.round((lonN / (Math.PI*2)) * (_SW-1)));
          const si = (iy * _SW + ix) * 3;
          const sr = _surfaceBaked[si], sg = _surfaceBaked[si+1], sb = _surfaceBaked[si+2];
          const diff = Math.max(0, lx*nx + ly*ny + lz*nz);
          const hx2 = lx*0.707, hy2 = ly*0.707, hz2 = (lz+1)*0.707;
          const hl   = Math.sqrt(hx2*hx2 + hy2*hy2 + hz2*hz2);
          const spec = Math.pow(Math.max(0, (hx2/hl)*nx + (hy2/hl)*ny + (hz2/hl)*nz), 22) * 0.40;
          const term = Math.max(0.05, Math.min(1, diff * 2.8));
          const limb = 1 - (1 - dz) * 0.55;
          const pb   = tapPulseRef.current;
          const R = Math.min(255, Math.round(sr * term * limb + spec * 255 + pb * 55));
          const G = Math.min(255, Math.round(sg * term * limb + spec * 195 + pb * 36));
          const B = Math.min(255, Math.round(sb * term * limb + spec * 130 + pb * 18));
          const pi = (py * size + px) * 4;
          data[pi] = R; data[pi+1] = G; data[pi+2] = B; data[pi+3] = 255;
        }
      }

      ctx.putImageData(img, 0, 0);

      // specular hot-spot
      const sg2 = ctx.createRadialGradient(cx - r*0.28, cy - r*0.32, 0, cx - r*0.28, cy - r*0.32, r*0.48);
      sg2.addColorStop(0, "rgba(255,248,190,0.26)");
      sg2.addColorStop(1, "rgba(255,248,190,0)");
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
      ctx.fillStyle = sg2; ctx.fill();

      // night-side earthshine
      const ng = ctx.createRadialGradient(cx + r*0.5, cy + r*0.18, 0, cx + r*0.5, cy + r*0.18, r*0.75);
      ng.addColorStop(0, "rgba(15,35,75,0.24)");
      ng.addColorStop(1, "rgba(15,35,75,0)");
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
      ctx.fillStyle = ng; ctx.fill();

      // tap pulse
      if (tapPulseRef.current > 0.01) {
        const pp = tapPulseRef.current;
        const pg = ctx.createRadialGradient(cx, cy, r*0.1, cx, cy, r);
        pg.addColorStop(0, `rgba(255,200,80,${pp*0.85})`);
        pg.addColorStop(0.45, `rgba(255,140,20,${pp*0.35})`);
        pg.addColorStop(1, "rgba(255,140,20,0)");
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
        ctx.fillStyle = pg; ctx.fill();
        ctx.restore();
      }

      // clip to circle
      ctx.save();
      ctx.globalCompositeOperation = "destination-in";
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
      ctx.fillStyle = "#fff"; ctx.fill();
      ctx.restore();

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => { cancelAnimationFrame(rafRef.current); lastRef.current = null; };
  }, [canvasRef, radius, exhausted]);
}

/* ═══════════════════════════════════════════════════════════════════════════
   RING SYSTEM  –  SVG ellipses, rear + front layers for true depth
═══════════════════════════════════════════════════════════════════════════ */

const _BAND_DEFS = [
  { rx: 0.540, ry: 0.540, w: 0.040, color: "rgba(175,128,58,0.55)",  glow: false },
  { rx: 0.600, ry: 0.600, w: 0.035, color: "rgba(208,158,78,0.65)",  glow: false },
  { rx: 0.658, ry: 0.658, w: 0.060, color: "rgba(238,188,98,0.75)",  glow: true  },
  { rx: 0.730, ry: 0.730, w: 0.050, color: "rgba(198,148,68,0.55)",  glow: false },
  { rx: 0.800, ry: 0.800, w: 0.040, color: "rgba(158,108,48,0.38)",  glow: false },
  { rx: 0.870, ry: 0.870, w: 0.025, color: "rgba(128,88,38,0.26)",   glow: false },
];
const _RING_TILT = 0.22;

function Rings({ radius, front, exhausted }) {
  const rw = radius * 2.32, rh = radius * 0.56;
  const hh = rh / 2;
  const clipY = front
    ? `M0 -9999 L${rw} -9999 L${rw} ${hh} L0 ${hh} Z`
    : `M0 ${hh} L${rw} ${hh} L${rw} ${rh + 9999} L0 ${rh + 9999} Z`;
  const filterId = (i) => `rf${front ? "f" : "r"}${i}`;

  return (
    <motion.div
      animate={{ rotate: [0, 360] }}
      transition={{ duration: exhausted ? 140 : 52, repeat: Infinity, ease: "linear" }}
      style={{
        position: "absolute",
        top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: rw, height: rh,
        pointerEvents: "none",
        zIndex: front ? 2 : 0,
        willChange: "transform",
      }}
    >
      <svg width={rw} height={rh} viewBox={`0 0 ${rw} ${rh}`} style={{ overflow: "visible" }}>
        <defs>
          {_BAND_DEFS.map((b, i) => b.glow && (
            <filter key={i} id={filterId(i)} x="-80%" y="-400%" width="260%" height="900%">
              <feGaussianBlur stdDeviation="3.5" />
            </filter>
          ))}
        </defs>
        {_BAND_DEFS.map((b, i) => (
          <ellipse
            key={i}
            cx={rw / 2} cy={rh / 2}
            rx={rw * b.rx} ry={rh * b.ry * _RING_TILT}
            fill="none"
            stroke={b.color}
            strokeWidth={rw * b.w}
            filter={b.glow ? `url(#${filterId(i)})` : undefined}
            clipPath={`path('${clipY}')`}
          />
        ))}
      </svg>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   ATMOSPHERE HALO
═══════════════════════════════════════════════════════════════════════════ */

function Atmosphere({ radius, exhausted }) {
  const sz = radius * 2 + radius * 0.52;
  return (
    <div
      style={{
        position: "absolute",
        width: sz, height: sz,
        top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        borderRadius: "50%",
        pointerEvents: "none",
        zIndex: 1,
        background: exhausted
          ? "radial-gradient(circle, transparent 44%, rgba(30,15,65,0.16) 60%, transparent 75%)"
          : `radial-gradient(circle,
              transparent 43%,
              rgba(255,155,55,0.07) 49%,
              rgba(255,115,28,0.17) 55%,
              rgba(255,75,8,0.09)  62%,
              rgba(170,55,0,0.04)  68%,
              transparent 78%)`,
        filter: "blur(7px)",
      }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   AMBIENT DEEP GLOW
═══════════════════════════════════════════════════════════════════════════ */

function AmbientGlow({ radius, exhausted }) {
  return (
    <motion.div
      animate={{
        scale:   [1, 1.09, 1],
        opacity: exhausted ? [0.18, 0.28, 0.18] : [0.45, 0.78, 0.45],
      }}
      transition={{ repeat: Infinity, duration: 4.2, ease: "easeInOut" }}
      style={{
        position: "absolute",
        width: radius * 3.6, height: radius * 2.3,
        top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        borderRadius: "50%",
        background: exhausted
          ? "radial-gradient(ellipse, rgba(35,18,72,0.28) 0%, transparent 70%)"
          : `radial-gradient(ellipse, ${C.amber}26 0%, ${C.gold}10 42%, transparent 72%)`,
        filter: "blur(30px)",
        pointerEvents: "none",
        zIndex: 0,
        willChange: "transform, opacity",
      }}
    />
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TAP PARTICLE  –  +N floater at tap coordinates
═══════════════════════════════════════════════════════════════════════════ */

function TapParticle({ x, y, amount, onDone }) {
  const dx = useMemo(() => (Math.random() - 0.5) * 36, []);
  const dy = useMemo(() => 68 + Math.random() * 32, []);
  return (
    <motion.div
      initial={{ opacity: 1, y: 0, x: dx, scale: 0.85 + Math.random() * 0.35 }}
      animate={{ opacity: 0, y: -dy, x: dx + (Math.random() - 0.5) * 18 }}
      transition={{ duration: 0.65 + Math.random() * 0.25, ease: "easeOut" }}
      onAnimationComplete={onDone}
      style={{
        position: "fixed",
        left: x - 18,
        top:  y - 18,
        pointerEvents: "none",
        zIndex: 999,
        fontWeight: 800,
        fontSize: 22,
        color: C.gold,
        textShadow: `0 0 12px ${C.amber}cc, 0 0 24px ${C.amber}66`,
        userSelect: "none",
        fontVariantNumeric: "tabular-nums",
        letterSpacing: "-0.02em",
      }}
    >
      +{amount}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   BURST RING  –  expanding gold ring on tap
═══════════════════════════════════════════════════════════════════════════ */

function BurstRing({ trigger }) {
  return (
    <AnimatePresence>
      {trigger && (
        <motion.div
          key={trigger}
          initial={{ scale: 0.85, opacity: 0.9 }}
          animate={{ scale: 1.95, opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            border: `2px solid ${C.gold}`,
            boxShadow: `0 0 24px ${C.amber}88, inset 0 0 12px ${C.amber}44`,
            pointerEvents: "none",
          }}
        />
      )}
    </AnimatePresence>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CONFETTI BURST  –  gold dots radiate outward on tap
═══════════════════════════════════════════════════════════════════════════ */

function ConfettiBurst({ id, onDone }) {
  const dots = useMemo(
    () =>
      Array.from({ length: 16 }, (_, i) => {
        const angle = (i / 16) * 360;
        const rad   = (angle * Math.PI) / 180;
        const dist  = 55 + Math.random() * 52;
        return {
          tx:    Math.cos(rad) * dist,
          ty:    Math.sin(rad) * dist,
          size:  3 + Math.random() * 5,
          color: Math.random() > 0.4 ? C.gold : C.amber,
          delay: i * 0.018,
        };
      }),
    []
  );
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 10 }}>
      {dots.map((d, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 1, scale: 0.3, x: 0, y: 0 }}
          animate={{ opacity: 0, scale: 1.8, x: d.tx, y: d.ty }}
          transition={{ duration: 0.65, delay: d.delay, ease: "easeOut" }}
          onAnimationComplete={i === 0 ? onDone : undefined}
          style={{
            position: "absolute",
            top: "50%", left: "50%",
            marginTop:  -d.size / 2,
            marginLeft: -d.size / 2,
            width:  d.size,
            height: d.size,
            borderRadius: "50%",
            background: d.color,
            boxShadow: `0 0 8px ${d.color}`,
          }}
        />
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   CINEMATIC PLANET  –  replaces TapCoin
   Props: pair, onTap, exhausted, balance  (identical to original TapCoin)
═══════════════════════════════════════════════════════════════════════════ */

function CinematicPlanet({ pair, onTap, exhausted, balance }) {
  const radius = Math.round(Math.min(window.innerWidth * 0.38, 148));

  const canvasRef   = useRef(null);
  const tapPulseRef = useRef(0);

  const [ringKey, setRingKey] = useState(0);
  const [bursts,  setBursts]  = useState([]);
  const burstId = useRef(0);

  usePlanetCanvas({ canvasRef, radius, exhausted, tapPulseRef });

  const handleTap = useCallback(
    (e) => {
      onTap(e);
      if (!exhausted) {
        tapPulseRef.current = 1.0;
        setRingKey((k) => k + 1);
        const bid = burstId.current++;
        setBursts((b) => [...b, bid]);
      }
    },
    [exhausted, onTap]
  );

  const removeBurst = useCallback(
    (id) => setBursts((b) => b.filter((x) => x !== id)),
    []
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 360,
        position: "relative",
      }}
    >
      <AmbientGlow radius={radius} exhausted={exhausted} />

      {/* balance */}
      <motion.div
        key={balance}
        initial={{ scale: 1.06 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.12 }}
        style={{
          fontVariantNumeric: "tabular-nums",
          fontSize: "clamp(40px,11vw,62px)",
          fontWeight: 700,
          color: C.white,
          letterSpacing: "-0.02em",
          textShadow: `0 0 40px ${C.gold}33, 0 2px 4px rgba(0,0,0,0.6)`,
          marginBottom: 4,
          zIndex: 3,
          position: "relative",
        }}
      >
        {balance.toLocaleString()}
      </motion.div>

      {/* rank */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          marginBottom: 28,
          zIndex: 3,
          position: "relative",
        }}
      >
        <Trophy size={13} color={C.silverTrophy} />
        <span style={{ fontSize: 13, color: C.gray }}>7,352nd</span>
        <span style={{ fontSize: 13, color: C.silverTrophy, marginLeft: 4 }}>Silver</span>
      </div>

      {/* planet scene */}
      <motion.div
        animate={{
          y:      [0, -14, -5, -19, -2, 0],
          rotate: [-0.5, 0.35, -0.15, 0.55, -0.3, -0.5],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut",
          times: [0, 0.2, 0.4, 0.6, 0.8, 1],
        }}
        style={{
          position: "relative",
          width:  radius * 2,
          height: radius * 2,
          zIndex: 2,
          willChange: "transform",
          transform: "translateZ(0)",
        }}
      >
        {/* rear rings (z:0) */}
        <Rings radius={radius} front={false} exhausted={exhausted} />

        {/* atmosphere (z:1, shared with sphere) */}
        <Atmosphere radius={radius} exhausted={exhausted} />

        {/* sphere (z:1) */}
        <motion.div
          whileTap={exhausted ? {} : { scale: 0.91 }}
          transition={{ type: "spring", stiffness: 370, damping: 16 }}
          onPointerDown={handleTap}
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "50%",
            cursor: exhausted ? "not-allowed" : "pointer",
            userSelect: "none",
            WebkitUserSelect: "none",
            touchAction: "none",
            zIndex: 1,
            boxShadow: exhausted
              ? "0 0 60px rgba(35,18,72,0.55)"
              : `0 0 55px ${C.amber}44, 0 0 110px ${C.amber}1a`,
            willChange: "transform",
            transform: "translateZ(0)",
          }}
        >
          <canvas
            ref={canvasRef}
            style={{
              display: "block",
              borderRadius: "50%",
              willChange: "transform",
              transform: "translateZ(0)",
            }}
          />

          {exhausted && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "rgba(10,8,22,0.52)",
              }}
            >
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.18em", color: C.gray }}>
                RECHARGING
              </span>
            </div>
          )}

          <AnimatePresence>
            {bursts.map((bid) => (
              <ConfettiBurst key={bid} id={bid} onDone={() => removeBurst(bid)} />
            ))}
          </AnimatePresence>

          <BurstRing trigger={ringKey} />
        </motion.div>

        {/* front rings (z:2) */}
        <Rings radius={radius} front={true} exhausted={exhausted} />
      </motion.div>

      {/* pair label */}
      <div
        style={{
          marginTop: 22,
          fontSize: 12,
          fontWeight: 600,
          color: C.gray,
          letterSpacing: "0.15em",
          zIndex: 3,
          position: "relative",
        }}
      >
        {exhausted ? "ENERGY DEPLETED" : `MINING ${pair.label}`}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────────────────
   Gold dust particle system
───────────────────────────────────────────────────────────────────────── */

function GoldDust() {
  const particles = Array.from({ length: 50 }, (_, i) => ({
    id:       i,
    x:        Math.random() * 100,
    y:        Math.random() * 100,
    size:     2 + Math.random() * 2,
    opacity:  0.3 + Math.random() * 0.3,
    blur:     Math.random() > 0.7,
    duration: 6 + Math.random() * 6,
    delay:    Math.random() * -8,
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
            top:  `${p.y}%`,
            width:  p.size,
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
   Lightning bolt SVG
───────────────────────────────────────────────────────────────────────── */

function LightningBolt({ size = 24, color = C.darkGold, style = {} }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={{ display: "block", ...style }}>
      <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" fill={color} stroke="none" />
    </svg>
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
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div
          style={{
            width: 36, height: 36,
            borderRadius: "50%",
            background: `conic-gradient(from 0deg, ${C.gold}, ${C.amber}, ${C.gold})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, padding: 2,
          }}
        >
          <div
            style={{
              width: "100%", height: "100%",
              borderRadius: "50%",
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
              display: "flex", alignItems: "center", gap: 7,
              padding: "8px 14px",
              borderRadius: 20,
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
      <div
        style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
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
      <div
        style={{
          height: 8, borderRadius: 4,
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
            background: `linear-gradient(90deg, ${color}80, ${color})`,
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
    { id: "mine",   label: "Mine",   Icon: () => <LightningBolt size={22} color={active === "mine"   ? C.gold : C.gray} /> },
    { id: "earn",   label: "Earn",   Icon: () => <span style={{ fontSize: 20 }}>🪙</span> },
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
              display: "flex", flexDirection: "column", alignItems: "center",
              gap: 3,
              background: "none", border: "none",
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
                  width: 24, height: 2,
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
        position: "fixed", inset: 0, zIndex: 1000,
        display: "flex", alignItems: "flex-end", justifyContent: "center",
        background: "rgba(0,0,0,0.85)",
        backdropFilter: "blur(8px)",
      }}
      onPointerDown={onClose}
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0,  opacity: 1 }}
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
        <div
          style={{
            width: 40, height: 4, borderRadius: 2,
            background: "rgba(255,255,255,0.15)",
            margin: "0 auto 24px",
          }}
        />

        <div
          style={{
            width: 60, height: 60, borderRadius: "50%",
            background: `${pair.color}18`,
            border: `1px solid ${pair.color}44`,
            display: "flex", alignItems: "center", justifyContent: "center",
            margin: "0 auto 20px",
            boxShadow: `0 0 24px ${pair.color}33`,
          }}
        >
          <LightningBolt size={28} color={pair.color} />
        </div>

        <h3 style={{ margin: "0 0 8px", textAlign: "center", fontSize: 20, fontWeight: 700, color: C.white, letterSpacing: "-0.02em" }}>
          Start Mining {pair.name}
        </h3>
        <p style={{ margin: "0 0 28px", textAlign: "center", fontSize: 13, color: C.gray, lineHeight: 1.6 }}>
          Create a free account to begin earning{" "}
          <span style={{ color: pair.color, fontWeight: 700 }}>+{pair.rate} {pair.label}</span> per tap
          and track your balance.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => onNavigate("register")}
            style={{
              width: "100%", padding: "16px", borderRadius: 14, border: "none",
              background: `linear-gradient(135deg, ${pair.color}, ${C.amber})`,
              color: "#000", fontSize: 15, fontWeight: 700, letterSpacing: "0.03em",
              cursor: "pointer",
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
              border: `1px solid rgba(255,255,255,0.1)`,
              background: C.warmBlack,
              color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: 600,
              cursor: "pointer",
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
            background: C.warmBlack,
            border: `1px solid rgba(255,255,255,0.1)`,
            borderRadius: "50%",
            width: 32, height: 32,
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
  const particleId = useRef(0);
  const syncTimer  = useRef(null);

  /* energy regen */
  useEffect(() => {
    const interval = setInterval(() => {
      setEnergy((e) => Math.min(e + REGEN_RATE, MAX_ENERGY));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  /* Supabase sync */
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

  /* tap handler */
  const handleTap = useCallback(
    (e) => {
      if (!user) { setShowAuthGate(true); return; }
      if (energy < ENERGY_COST) return;

      const rect    = e.currentTarget?.getBoundingClientRect?.();
      const clientX = e.clientX ?? rect?.left + rect?.width  / 2 ?? 0;
      const clientY = e.clientY ?? rect?.top  + rect?.height / 2 ?? 0;

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

  const removeParticle = useCallback(
    (id) => setParticles((p) => p.filter((x) => x.id !== id)),
    []
  );

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
      {/* radial center glow */}
      <div
        style={{
          position: "fixed", inset: 0,
          background: `radial-gradient(ellipse at 50% 50%, ${C.amber}18 0%, transparent 65%)`,
          pointerEvents: "none", zIndex: 0,
        }}
      />

      {/* bottom ambient */}
      <div
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0, height: 120,
          background: `linear-gradient(to top, transparent, ${C.gold}08, transparent)`,
          pointerEvents: "none", zIndex: 0,
        }}
      />

      <GoldDust />

      {/* top strip */}
      <div style={{ paddingTop: 16, paddingBottom: 12, zIndex: 2, position: "relative" }}>
        <ProfileStrip user={user} pair={pair} balance={balance} />
      </div>

      {/* pair selector */}
      <div style={{ zIndex: 2, position: "relative", marginBottom: 8 }}>
        <PairSelector pairs={MINING_PAIRS} selected={pair} onSelect={setPair} />
      </div>

      {/* cinematic planet */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2, position: "relative" }}>
        <CinematicPlanet pair={pair} onTap={handleTap} exhausted={exhausted} balance={balance} />
      </div>

      {/* energy bar */}
      <div style={{ zIndex: 2, position: "relative", marginBottom: 12 }}>
        <EnergyBar energy={energy} max={MAX_ENERGY} />
      </div>

      {/* bottom nav */}
      <BottomNav active={activeTab} onChange={setActiveTab} />

      {/* tap particles */}
      {particles.map((p) => (
        <TapParticle key={p.id} x={p.x} y={p.y} amount={p.amount} onDone={() => removeParticle(p.id)} />
      ))}

      {/* auth gate */}
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
