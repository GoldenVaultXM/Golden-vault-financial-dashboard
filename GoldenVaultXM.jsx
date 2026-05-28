import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import {
  Activity, BarChart2, ChevronRight, ArrowDownToLine, ArrowUpFromLine, FileBarChart, X
} from "lucide-react";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#080808", card: "#0f0f0f", card2: "#141414", border: "#222222", border2: "#2a2a2a",
  gold: "#d97706", gold2: "#f59e0b", goldDim: "#92400e", green: "#22c55e", red: "#ef4444",
  text: "#ffffff", text3: "#525252", text4: "#303030"
};

const allInstruments = [
  { cat: "Crypto", pair: "BTC/USDT", name: "Bitcoin", price: "75,244.02", pct: "+0.01%", up: true },
  { cat: "Crypto", pair: "ETH/USDT", name: "Ethereum", price: "2,073.54", pct: "+0.00%", up: true },
  { cat: "Forex", pair: "EUR/USD", name: "Euro / US Dollar", price: "1.1629", pct: "-0.00%", up: false }
];

const CATS = ["All", "Crypto", "Forex", "Stock", "Futures", "Commodity", "NFT"];

const Card = ({ children }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 16px" }}>
    {children}
  </div>
);

const Badge = ({ children, color }) => (
  <span style={{ fontSize: 10, fontWeight: 800, background: `${color}20`, color, borderRadius: 4, padding: "2px 7px", display: "inline-block", textTransform: "uppercase" }}>
    {children}
  </span>
);

const GoldLine = () => <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${C.gold}33,transparent)`, margin: "10px 0" }} />;

// ─── Components ──────────────────────────────────────────────────────────────
const MarketsPage = () => {
  const [cat, setCat] = useState("All");
  const filtered = allInstruments.filter(i => cat === "All" || i.cat === cat);

  return (
    <Card>
      <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 14 }}>Market Overview</div>
      <div style={{ display: "flex", gap: 5, marginBottom: 14, overflowX: "auto" }}>
        {CATS.map(c => (
          <button key={c} onClick={() => setCat(c)} style={{
            padding: "6px 12px", borderRadius: 6, border: "none", fontSize: 11, fontWeight: 800,
            cursor: "pointer", background: c === cat ? C.gold : `${C.gold}14`, color: c === cat ? "#000" : C.text3
          }}>{c}</button>
        ))}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((item, i) => (
          <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: `1px solid ${C.border}` }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{item.pair}</div>
              <div style={{ fontSize: 10, color: C.text3 }}>{item.name}</div>
            </div>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 13, fontWeight: 700 }}>{item.price}</div>
              <div style={{ fontSize: 11, color: item.up ? C.green : C.red }}>{item.pct}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function GoldenVaultXM() {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: "20px", color: C.text, fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: C.gold, marginBottom: 20 }}>GOLDEN VAULT XM</h1>
      <div style={{ display: "grid", gap: 20, gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))" }}>
        <MarketsPage />
      </div>
    </div>
  );
