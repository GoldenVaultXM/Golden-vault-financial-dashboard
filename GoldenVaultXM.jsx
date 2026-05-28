import { useState, useEffect } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import {
  Activity, BarChart2, ChevronRight, ArrowDownToLine, ArrowUpFromLine, FileBarChart, X, Home, TrendingUp, MoreHorizontal
} from "lucide-react";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg: "#080808", card: "#0f0f0f", card2: "#141414", border: "#222222", border2: "#2a2a2a",
  gold: "#d97706", gold2: "#f59e0b", green: "#22c55e", red: "#ef4444",
  text: "#ffffff", text3: "#525252", text4: "#303030"
};

const allInstruments = [
  { cat: "Crypto", pair: "BTC/USDT", name: "Bitcoin", price: "75,244.02", pct: "+0.01%", up: true },
  { cat: "Crypto", pair: "ETH/USDT", name: "Ethereum", price: "2,073.54", pct: "+0.00%", up: true },
  { cat: "Forex", pair: "EUR/USD", name: "Euro / US Dollar", price: "1.1629", pct: "-0.00%", up: false }
];

const CATS = ["All", "Crypto", "Forex", "Stock", "Futures", "Commodity", "NFT"];

// ─── Components ──────────────────────────────────────────────────────────────
const Card = ({ children }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: "18px 16px" }}>
    {children}
  </div>
);

const NavButton = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} style={{ 
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4, 
    background: "none", border: "none", color: active ? C.gold : C.text3, cursor: "pointer", flex: 1 
  }}>
    <Icon size={24} />
    <span style={{ fontSize: 10 }}>{label}</span>
  </button>
);

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
  const [activeTab, setActiveTab] = useState("Home");

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "sans-serif", paddingBottom: "80px" }}>
      <div style={{ padding: "20px" }}>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: C.gold, marginBottom: 20 }}>GOLDEN VAULT XM</h1>
        {activeTab === "Home" && <MarketsPage />}
        {activeTab === "Markets" && <p>Market analysis coming soon...</p>}
      </div>

      <div style={{ 
        position: "fixed", bottom: 0, left: 0, right: 0, 
        background: C.card, padding: "10px 0", display: "flex", 
        borderTop: `1px solid ${C.border}` 
      }}>
        <NavButton icon={Home} label="Home" active={activeTab === "Home"} onClick={() => setActiveTab("Home")} />
        <NavButton icon={BarChart2} label="Markets" active={activeTab === "Markets"} onClick={() => setActiveTab("Markets")} />
        <NavButton icon={TrendingUp} label="Trade" active={activeTab === "Trade"} onClick={() => setActiveTab("Trade")} />
        <NavButton icon={MoreHorizontal} label="More" active={activeTab === "More"} onClick={() => setActiveTab("More")} />
      </div>
    </div>
  );
}
