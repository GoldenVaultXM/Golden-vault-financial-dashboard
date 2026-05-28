import React, { useState, useEffect } from "react";
import { BarChart, Bar, ResponsiveContainer, Tooltip, XAxis, YAxis, Cell } from "recharts";
import { Home, BarChart2, Activity, ArrowDownToLine, ArrowUpFromLine, FileBarChart, ChevronRight, X, Shield } from "lucide-react";

// ─── Design & Data ──────────────────────────────────────────────────────────
const C = { bg: "#080808", card: "#0f0f0f", card2: "#141414", border: "#222222", gold: "#d97706", green: "#22c55e", red: "#ef4444", text: "#ffffff", text3: "#525252" };
const perfData = [3200,4100,3800,4900,4200,5100,4700,5800,5200,6100].map((v, i) => ({ day: i + 1, value: v }));
const holdings = [{ pair: "BTC/USDT", label: "Perpetual Futures", value: 45230.50, pct: 5.4 }, { pair: "ETH/USDT", label: "Spot Trading", value: 19600.00, pct: 8.2 }];
const allInstruments = [
  { cat: "Crypto", pair: "BTC/USDT", name: "Bitcoin", price: "75,244.02", pct: "+0.01%", up: true },
  { cat: "Crypto", pair: "ETH/USDT", name: "Ethereum", price: "2,073.54", pct: "+0.00%", up: true },
  { cat: "Forex", pair: "EUR/USD", name: "Euro / US Dollar", price: "1.1629", pct: "-0.00%", up: false }
];

// ─── Reusable UI ────────────────────────────────────────────────────────────
const Card = ({ children, style = {} }) => <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 16, ...style }}>{children}</div>;

// ─── Components ─────────────────────────────────────────────────────────────
const PortfolioChart = () => (
  <Card>
    <div style={{ fontWeight: 800, marginBottom: 12 }}>Portfolio Performance</div>
    <ResponsiveContainer width="100%" height={120}><BarChart data={perfData}><Bar dataKey="value" fill={C.gold} radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer>
  </Card>
);

const MarketsPage = () => {
  const [search, setSearch] = useState("");
  return (
    <div>
      <input placeholder="Search markets..." onChange={(e) => setSearch(e.target.value)} style={{ width: "100%", background: C.card2, border: `1px solid ${C.border}`, padding: 12, borderRadius: 8, color: C.text, marginBottom: 10, boxSizing: "border-box" }} />
      {allInstruments.filter(i => i.pair.toLowerCase().includes(search.toLowerCase())).map((item, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${C.border}` }}>
          <div><div style={{ fontWeight: 800 }}>{item.pair}</div><div style={{ fontSize: 10, color: C.text3 }}>{item.name}</div></div>
          <div style={{ textAlign: "right" }}><div style={{ fontWeight: 800 }}>{item.price}</div><div style={{ fontSize: 10, color: item.up ? C.green : C.red }}>{item.pct}</div></div>
        </div>
      ))}
    </div>
  );
};

// ─── Main Application ───────────────────────────────────────────────────────
export default function GoldenVaultXM() {
  const [activeTab, setActiveTab] = useState("Home");

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* Responsive Wrapper */}
      <div style={{ width: "100%", maxWidth: "600px", padding: "20px", paddingBottom: 100, boxSizing: "border-box" }}>
        <h1 style={{ color: C.gold, fontSize: 24, fontWeight: 900, marginBottom: 20 }}>GOLDEN VAULT XM</h1>
        
        {activeTab === "Home" && (
          <div>
            <PortfolioChart />
            <Card>
              <div style={{ fontWeight: 800, marginBottom: 12 }}>Holdings</div>
              {holdings.map((h, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                  <span>{h.pair}</span><span style={{ fontWeight: 700 }}>${h.value.toLocaleString()}</span>
                </div>
              ))}
            </Card>
          </div>
        )}
        {activeTab === "Markets" && <MarketsPage />}
        {activeTab === "Trade" && <Card>Trading Terminal</Card>}
      </div>

      {/* Navigation */}
      <div style={{ position: "fixed", bottom: 0, width: "100%", maxWidth: "600px", background: C.card, display: "flex", borderTop: `1px solid ${C.border}`, padding: "10px 0" }}>
        {[
          { id: "Home", icon: Home }, { id: "Markets", icon: BarChart2 },
          { id: "Trade", icon: Activity }
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} style={{ flex: 1, background: "none", border: "none", color: activeTab === item.id ? C.gold : C.text3, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}>
            <item.icon size={24} />
            <span style={{ fontSize: 10 }}>{item.id}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
