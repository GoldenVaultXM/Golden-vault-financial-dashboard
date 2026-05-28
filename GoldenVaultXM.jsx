import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Home, BarChart2, TrendingUp, MoreHorizontal, Shield, LogOut, Activity, Settings, ArrowDownToLine, ArrowUpFromLine, FileBarChart, ChevronRight, X } from "lucide-react";

// --- Design Tokens & Components (Merged) ---
const C = { bg: "#080808", card: "#0f0f0f", card2: "#1a1a1a", border: "#222222", gold: "#d97706", gold2: "#f59e0b", goldDim: "#92400e", green: "#22c55e", red: "#ef4444", text: "#ffffff", text3: "#525252" };

const Card = ({ children, style = {} }) => <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 16, ...style }}>{children}</div>;
const GoldLine = () => <div style={{ height: 1, background: `linear-gradient(90deg,transparent,${C.gold}33,transparent)`, margin: "12px 0" }} />;

// --- Main App ---
export default function GoldenVaultXM() {
  const [activeTab, setActiveTab] = useState("Home");

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, paddingBottom: "80px" }}>
      <div style={{ padding: "20px" }}>
        
        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ color: C.gold, fontSize: 24, fontWeight: 900, margin: 0 }}>GOLDEN VAULT XM</h1>
          <p style={{ color: C.text3, fontSize: 12, marginTop: 4 }}>Precision Velocity Insight.</p>
        </div>

        {activeTab === "Home" && (
          <div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ gridColumn: "span 2" }}><PortfolioChart /></div>
              <div style={{ gridColumn: "span 2" }}><QuickActions /></div>
              <div style={{ gridColumn: "span 2" }}><PortfolioHoldings /></div>
            </div>
          </div>
        )}

        {activeTab === "Trade" && (
          <div>
            <h2 style={{ marginBottom: 16 }}>Trading Terminal</h2>
            <PortfolioHoldings />
          </div>
        )}

        {activeTab === "Markets" && (
          <div>
            <LiveTicker />
            <MarketSentiment />
          </div>
        )}

        {activeTab === "More" && (
          <div>
            <AccountStatus />
          </div>
        )}
      </div>

      {/* Navigation */}
      <div style={{ position: "fixed", bottom: 0, width: "100%", background: C.card, borderTop: `1px solid ${C.border}`, display: "flex", padding: "10px 0" }}>
        {[
          { id: "Home", icon: Home },
          { id: "Markets", icon: BarChart2 },
          { id: "Trade", icon: TrendingUp },
          { id: "More", icon: MoreHorizontal }
        ].map((item) => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} style={{ flex: 1, background: "none", border: "none", color: activeTab === item.id ? C.gold : C.text3, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, cursor: "pointer" }}>
            <item.icon size={24} />
            <span style={{ fontSize: 10 }}>{item.id}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// --- Supporting Sub-components (Place these inside your file) ---

function PortfolioChart() {
  const perfData = [3200, 4100, 3800, 4900, 4200].map((v, i) => ({ day: i + 1, value: v }));
  return (
    <Card>
      <div style={{ fontWeight: 800, marginBottom: 12 }}>Portfolio Performance</div>
      <ResponsiveContainer width="100%" height={120}>
        <BarChart data={perfData}><Bar dataKey="value" fill={C.gold} radius={[4, 4, 0, 0]} /></BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

function QuickActions() {
  return (
    <Card>
      <div style={{ fontWeight: 800, marginBottom: 10 }}>Quick Actions</div>
      <div style={{ display: "flex", gap: 8 }}>
        <button style={{ flex: 1, background: C.gold, border: "none", padding: "10px", borderRadius: 8, fontWeight: 800, fontSize: 12 }}><ArrowDownToLine size={14} /> Deposit</button>
        <button style={{ flex: 1, background: C.card2, border: `1px solid ${C.border}`, color: C.text, padding: "10px", borderRadius: 8, fontWeight: 800, fontSize: 12 }}><ArrowUpFromLine size={14} /> Withdraw</button>
      </div>
    </Card>
  );
}

function PortfolioHoldings() {
  return (
    <Card>
      <div style={{ fontWeight: 800, marginBottom: 12 }}>Holdings</div>
      {[{ p: "BTC/USDT", v: "45,230" }, { p: "ETH/USDT", v: "19,600" }].map((h, i) => (
        <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0" }}>
          <span>{h.p}</span><span style={{ fontWeight: 700 }}>${h.v}</span>
        </div>
      ))}
    </Card>
  );
}

function AccountStatus() {
  return (
    <Card>
      <div style={{ fontWeight: 800, marginBottom: 12 }}>Account Status</div>
      <div style={{ display: "flex", justifyContent: "space-between" }}><span>Verification</span><span style={{ color: C.green }}>Verified</span></div>
    </Card>
  );
}

function MarketSentiment() {
  return (
    <Card>
      <div style={{ fontWeight: 800 }}>Market Sentiment</div>
      <div style={{ fontSize: 32, fontWeight: 900, color: C.red, textAlign: "center", margin: "10px 0" }}>24</div>
      <div style={{ textAlign: "center", fontSize: 12, color: C.text3 }}>Fear</div>
    </Card>
  );
}

function LiveTicker() {
  return (
    <Card>
      <div style={{ fontWeight: 800 }}>Live Markets</div>
      <div style={{ fontSize: 14, marginTop: 8 }}>BTC/USDT: <span style={{ color: C.green }}>75,244.02</span></div>
    </Card>
  );
}
