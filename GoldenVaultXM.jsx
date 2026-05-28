import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Home, BarChart2, TrendingUp, MoreHorizontal, Shield, ArrowDownToLine, ArrowUpFromLine, FileBarChart, ChevronRight, X, Activity, LogOut, Settings } from "lucide-react";

// ─── Design Tokens ───
const C = {
  bg: "#080808", card: "#0f0f0f", card2: "#141414", card3: "#1a1a1a",
  border: "#222222", border2: "#2a2a2a", gold: "#d97706", gold2: "#f59e0b",
  goldDim: "#92400e", green: "#22c55e", red: "#ef4444", text: "#ffffff", text3: "#525252"
};

// ─── Data ───
const perfData = [3200,4100,3800,4900,4200,5100,4700,5800,5200,6100].map((v, i) => ({ day: i + 1, value: v }));
const holdings = [
  { pair: "BTC/USDT", label: "Perpetual Futures", value: 45230.50, pct: 5.4, color: C.gold2 },
  { pair: "ETH/USDT", label: "Spot Trading", value: 19600.00, pct: 8.2, color: "#3b82f6" }
];
const allInstruments = [
  { cat: "Crypto", pair: "BTC/USDT", name: "Bitcoin", price: "75,244.02", pct: "+0.01%", up: true },
  { cat: "Crypto", pair: "ETH/USDT", name: "Ethereum", price: "2,073.54", pct: "+0.00%", up: true },
  { cat: "Forex", pair: "EUR/USD", name: "Euro / US Dollar", price: "1.1629", pct: "-0.00%", up: false }
];

// ─── Components ───
const Card = ({ children, style = {} }) => (
  <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 18, marginBottom: 16, ...style }}>
    {children}
  </div>
);

const Badge = ({ children, color }) => (
  <span style={{ fontSize: 10, fontWeight: 800, background: `${color}20`, color, borderRadius: 4, padding: "2px 7px", textTransform: "uppercase" }}>{children}</span>
);

const PortfolioChart = () => (
  <Card>
    <div style={{ fontWeight: 800, marginBottom: 12 }}>Portfolio Performance</div>
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={perfData}>
        <Tooltip contentStyle={{ background: C.card2, border: "none" }} />
        <Bar dataKey="value" fill={C.gold} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </Card>
);

const MarketsPage = () => (
  <div>
    {allInstruments.map((item, i) => (
      <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "14px 0", borderBottom: `1px solid ${C.border}` }}>
        <div>
          <div style={{ fontWeight: 800 }}>{item.pair}</div>
          <div style={{ fontSize: 10, color: C.text3 }}>{item.name}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 800 }}>{item.price}</div>
          <div style={{ fontSize: 10, color: item.up ? C.green : C.red }}>{item.pct}</div>
        </div>
      </div>
    ))}
  </div>
);

// ─── Main App ───
export default function GoldenVaultXM() {
  const [activeTab, setActiveTab] = useState("Home");

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, paddingBottom: 90 }}>
      <div style={{ padding: 20 }}>
        <h1 style={{ color: C.gold, fontSize: 24, fontWeight: 900, marginBottom: 20 }}>GOLDEN VAULT XM</h1>
        
        {activeTab === "Home" && (
          <div>
            <PortfolioChart />
            <Card>
              <div style={{ fontWeight: 800, marginBottom: 12 }}>Portfolio Holdings</div>
              {holdings.map((h, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
                  <span>{h.pair}</span>
                  <span style={{ fontWeight: 700 }}>${h.value.toLocaleString()}</span>
                </div>
              ))}
            </Card>
          </div>
        )}
        
        {activeTab === "Markets" && <MarketsPage />}
        
        {activeTab === "Trade" && (
          <Card>
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <TrendingUp size={40} color={C.gold} style={{ marginBottom: 12 }} />
              <div>Trading Terminal Active</div>
            </div>
          </Card>
        )}
        
        {activeTab === "More" && (
          <Card>
            <div style={{ fontWeight: 800, marginBottom: 16 }}>Account Settings</div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0" }}>
              <Shield size={18} /> <span>Security & KYC</span>
            </div>
          </Card>
        )}
      </div>

      <div style={{ position: "fixed", bottom: 0, width: "100%", background: C.card, display: "flex", borderTop: `1px solid ${C.border}`, padding: "12px 0" }}>
        {[
          { id: "Home", icon: Home }, { id: "Markets", icon: BarChart2 },
          { id: "Trade", icon: TrendingUp }, { id: "More", icon: MoreHorizontal }
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
