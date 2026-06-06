/**
 * GOLDEN VAULT XM — AESTHETIC UPGRADE PATCH
 * ==========================================
 * Drop this component into App.jsx (or index.jsx) and render <AestheticPatch />
 * once, anywhere inside your component tree.
 *
 * ZERO functional changes. CSS-only visual upgrade.
 * Injects: void-black foundation, cinematic gold typography, shield animation,
 *          tech-green gear glow, Playfair Display / Inter fonts, email update.
 */

import { useEffect } from "react";

/* ── 1. FONT LOADER ─────────────────────────────────────────────────────── */
function injectFonts() {
  if (document.getElementById("gvxm-fonts")) return;
  const link = document.createElement("link");
  link.id = "gvxm-fonts";
  link.rel = "stylesheet";
  link.href =
    "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;1,700&family=Inter:wght@400;500;600;700&display=swap";
  document.head.appendChild(link);
}

/* ── 2. CSS PATCH ───────────────────────────────────────────────────────── */
const CSS_PATCH = `
/* ═══════════════════════════════════════════════════════════════════════════
   GOLDEN VAULT XM — VISUAL AESTHETIC UPGRADE PATCH v1.0
   Scope: color · background · border · shadow · font · text-shadow · animation
   No layout, no functional, no structural changes.
   ═══════════════════════════════════════════════════════════════════════════ */

/* ── Variables ─────────────────────────────────────────────────────────── */
:root {
  --gvxm-gold: linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C);
  --gvxm-tech-green: #00FF41;
  --gvxm-void: #000000;
  --gvxm-container: #050505;
}

/* ── Void-Black Foundation ─────────────────────────────────────────────── */
html, body { background-color: #000000 !important; }
#gvxm-root, .gvxm-shell { background-color: #000000 !important; }

/* ── Typography ────────────────────────────────────────────────────────── */
body, input, button, span, p, div, td, th, label {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
}

/* ── Keyframes ─────────────────────────────────────────────────────────── */
@keyframes gvxmShieldPulse {
  0%   { opacity: 0.06; transform: translate(-50%, -50%) scale(1);    filter: brightness(1)   drop-shadow(0 0 16px #00FF41) drop-shadow(0 0 40px #00FF4133); }
  50%  { opacity: 0.14; transform: translate(-50%, -50%) scale(1.05); filter: brightness(1.4) drop-shadow(0 0 28px #00FF41) drop-shadow(0 0 70px #00FF4155); }
  100% { opacity: 0.06; transform: translate(-50%, -50%) scale(1);    filter: brightness(1)   drop-shadow(0 0 16px #00FF41) drop-shadow(0 0 40px #00FF4133); }
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.4; }
}
@keyframes spin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}

/* ── Shield host: Trade section wrapper ───────────────────────────────── */
.gvxm-trade-shield-host {
  position: relative;
}
.gvxm-trade-shield-host::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 340px;
  height: 400px;
  z-index: 0;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 240'%3E%3Cdefs%3E%3ClinearGradient id='sg2' x1='0%25' y1='0%25' x2='0%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%2300FF41' stop-opacity='0.25'/%3E%3Cstop offset='100%25' stop-color='%2300FF41' stop-opacity='0.03'/%3E%3C/linearGradient%3E%3Cfilter id='glow'%3E%3CfeGaussianBlur stdDeviation='2.5' result='blur'/%3E%3CfeComposite in='SourceGraphic' in2='blur' operator='over'/%3E%3C/filter%3E%3C/defs%3E%3Cpath d='M100 8 L185 42 L185 120 Q185 185 100 232 Q15 185 15 120 L15 42 Z' fill='none' stroke='%2300FF41' stroke-width='2.5' stroke-opacity='0.9' filter='url(%23glow)'/%3E%3Cpath d='M100 18 L175 48 L175 118 Q175 178 100 220 Q25 178 25 118 L25 48 Z' fill='url(%23sg2)' stroke='%2300FF41' stroke-width='1' stroke-opacity='0.4'/%3E%3Cline x1='100' y1='25' x2='100' y2='215' stroke='%2300FF41' stroke-width='0.9' stroke-opacity='0.3'/%3E%3Cline x1='30' y1='118' x2='170' y2='118' stroke='%2300FF41' stroke-width='0.9' stroke-opacity='0.3'/%3E%3Cpath d='M45 65 L60 65 L60 80 L75 80' stroke='%2300FF41' stroke-width='0.8' stroke-opacity='0.6' fill='none'/%3E%3Ccircle cx='45' cy='65' r='2.5' fill='%2300FF41' fill-opacity='0.8'/%3E%3Ccircle cx='75' cy='80' r='2.5' fill='%2300FF41' fill-opacity='0.8'/%3E%3Cpath d='M155 65 L140 65 L140 80 L125 80' stroke='%2300FF41' stroke-width='0.8' stroke-opacity='0.6' fill='none'/%3E%3Ccircle cx='155' cy='65' r='2.5' fill='%2300FF41' fill-opacity='0.8'/%3E%3Ccircle cx='125' cy='80' r='2.5' fill='%2300FF41' fill-opacity='0.8'/%3E%3Cpath d='M55 155 L70 155 L70 170 L85 170' stroke='%2300FF41' stroke-width='0.8' stroke-opacity='0.6' fill='none'/%3E%3Ccircle cx='85' cy='170' r='2.5' fill='%2300FF41' fill-opacity='0.8'/%3E%3Cpath d='M145 155 L130 155 L130 170 L115 170' stroke='%2300FF41' stroke-width='0.8' stroke-opacity='0.6' fill='none'/%3E%3Ccircle cx='115' cy='170' r='2.5' fill='%2300FF41' fill-opacity='0.8'/%3E%3Ccircle cx='100' cy='105' r='22' fill='none' stroke='%2300FF41' stroke-width='1.5' stroke-opacity='0.7'/%3E%3Ccircle cx='100' cy='105' r='14' fill='%2300FF41' fill-opacity='0.1'/%3E%3Cpath d='M100 92 L106 101 L118 103 L109 112 L111 124 L100 118 L89 124 L91 112 L82 103 L94 101 Z' fill='%2300FF41' fill-opacity='0.45' stroke='%2300FF41' stroke-width='0.5'/%3E%3Ccircle cx='40' cy='50' r='3' fill='%2300FF41' fill-opacity='0.7'/%3E%3Ccircle cx='160' cy='50' r='3' fill='%2300FF41' fill-opacity='0.7'/%3E%3Ccircle cx='35' cy='118' r='3' fill='%2300FF41' fill-opacity='0.7'/%3E%3Ccircle cx='165' cy='118' r='3' fill='%2300FF41' fill-opacity='0.7'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-size: contain;
  background-position: center;
  opacity: 0.08;
  animation: gvxmShieldPulse 1.5s ease-in-out infinite;
}

/* ── Cinematic Gold on gold-colored text ──────────────────────────────── */
.gvxm-gold-text {
  background: linear-gradient(135deg, #BF953F, #FCF6BA, #B38728, #FBF5B7, #AA771C) !important;
  -webkit-background-clip: text !important;
  background-clip: text !important;
  -webkit-text-fill-color: transparent !important;
  font-family: 'Playfair Display', Georgia, serif !important;
  font-weight: 700 !important;
}

/* ── Scrollbar ─────────────────────────────────────────────────────────── */
::-webkit-scrollbar { width: 4px; height: 4px; }
::-webkit-scrollbar-track { background: #050505; }
::-webkit-scrollbar-thumb {
  background: linear-gradient(180deg, #BF953F, #AA771C);
  border-radius: 2px;
}
`;

/* ── 3. DOM MUTATION — post-render email & class injection ─────────────── */
function patchDOM() {
  // 3a. Email text replacement: support@goldenvaultxm.com → .live
  const walker = document.createTreeWalker(
    document.body,
    NodeFilter.SHOW_TEXT,
    null
  );
  const nodes = [];
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeValue && node.nodeValue.includes("support@goldenvaultxm.com")) {
      nodes.push(node);
    }
  }
  nodes.forEach((n) => {
    n.nodeValue = n.nodeValue.replace(
      /support@goldenvaultxm\.com/g,
      "support@goldenvaultxm.live"
    );
  });

  // 3b. Apply cinematic-gold class to gold-colored text spans
  // Selects inline-styled elements with the amber/gold color values
  document.querySelectorAll('[style]').forEach((el) => {
    const s = el.getAttribute('style') || '';
    if (
      (s.includes('#d97706') || s.includes('#f59e0b') || s.includes('#fbbf24') ||
       s.includes('rgb(217, 119, 6)') || s.includes('rgb(245, 158, 11)')) &&
      !el.classList.contains('gvxm-gold-patched')
    ) {
      el.classList.add('gvxm-gold-text', 'gvxm-gold-patched');
    }
  });
}

/* ── 4. TRADE SECTION SHIELD HOST ──────────────────────────────────────── */
function applyShieldHost() {
  // The TradePage renders inside .gvxm-shell as the active page.
  // We identify it by scanning for the dashboard metric cards
  // (they contain the balance/profit stats) and tag their parent.
  const allDivs = document.querySelectorAll('.gvxm-shell > div');
  allDivs.forEach((div) => {
    const text = div.textContent || '';
    // Trade page contains "Total Invested" or "Active Positions" or "Win Rate"
    if (
      text.includes('Total Invested') ||
      text.includes('Active Positions') ||
      text.includes('Win Rate')
    ) {
      if (!div.classList.contains('gvxm-trade-shield-host')) {
        div.classList.add('gvxm-trade-shield-host');
      }
    }
  });
}

/* ── 5. PATCH COMPONENT ────────────────────────────────────────────────── */
export default function AestheticPatch() {
  useEffect(() => {
    // Inject fonts
    injectFonts();

    // Inject CSS
    if (!document.getElementById('gvxm-aesthetic-patch')) {
      const style = document.createElement('style');
      style.id = 'gvxm-aesthetic-patch';
      style.textContent = CSS_PATCH;
      document.head.appendChild(style);
    }

    // Run DOM patches immediately
    patchDOM();
    applyShieldHost();

    // Re-run on any DOM mutation (React re-renders swap content)
    const observer = new MutationObserver(() => {
      patchDOM();
      applyShieldHost();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    return () => observer.disconnect();
  }, []);

  // Renders nothing — pure side-effect component
  return null;
}

/* ── HOW TO USE ──────────────────────────────────────────────────────────
 *
 * In your App.jsx (or index.jsx), import and render once:
 *
 *   import AestheticPatch from './AestheticPatch';
 *
 *   function App() {
 *     return (
 *       <>
 *         <AestheticPatch />
 *         ... rest of your app ...
 *       </>
 *     );
 *   }
 *
 * That's it. Zero changes to any other file.
 * ─────────────────────────────────────────────────────────────────────── */
