import React, { useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Home, BarChart2, TrendingUp, MoreHorizontal, Shield, LogOut, Activity, ChevronRight, ArrowUpFromLine, ArrowDownToLine } from "lucide-react";

// --- Design Tokens ---
const C = { bg: "#080808", card: "#0f0f0f", border: "#222222", gold: "#d97706", green: "#22c55e", red: "#ef4444", text: "#ffffff", text3: "#525252" };

// --- Reusable Components ---
const Card = ({ children }) => <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 14, padding: 16, marginBottom: 16 }}>{children}</div>;
const NavButton = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, background: "none", border: "none", color: active ? C.gold : C.text3, cursor: "pointer", flex: 1 }}>
    <Icon size={24} /> <span style={{ fontSize: 10 }}>{label}</span>
  </button>
);

const perfData = [3200, 4100, 3800, 4900, 4200, 5100, 4700, 5800, 5200, 6100].map((v, i) => ({ day: i + 1, value: v }));
const holdings = [
  { pair: "BTC/USDT", label: "Perpetual Futures", value: 45230.50, pct: 5.4 },
  { pair: "ETH/USDT", label: "Spot Trading", value: 19600.00, pct: 8.2 }
];

const PortfolioChart = () => (
  <Card>
    <div style={{ fontWeight: 800, marginBottom: 12 }}>Portfolio Performance</div>
    <ResponsiveContainer width="100%" height={150}>
      <BarChart data={perfData}>
        <XAxis dataKey="day" hide />
        <Tooltip contentStyle={{ background: C.card2, border: "none" }} />
        <Bar dataKey="value" fill={C.gold} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  </Card>
);
// --- Main App ---
export default function GoldenVaultXM() {
  const [activeTab, setActiveTab] = useState("Home");
  
  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, paddingBottom: "80px", fontFamily: "sans-serif" }}>
      <div style={{ padding: "20px" }}>
        
        {/* Home Tab */}
        {activeTab === "Home" && (
  <div>
    <h1 style={{ color: C.gold, fontSize: 24, fontWeight: 900 }}>GOLDEN VAULT XM</h1>
    <p style={{ color: C.text3, marginBottom: 20 }}>Precision Velocity Insight.</p>
    
    <Card>
      <div style={{ fontWeight: 800, marginBottom: 12 }}>Quick Start</div>
      <button style={{ background: C.gold, color: "#000", border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: 800, width: "100%" }}>Initialize Trading</button>
    </Card>

    <div style={{ fontWeight: 800, margin: "20px 0 10px 0" }}>Get Started in 4 Steps</div>
    {["Register Account", "Verify Identity", "Fund Wallet", "Start Trading"].map((step, i) => (
      <div key={i} style={{ padding: "12px 0", borderBottom: `1px solid ${C.border}`, fontSize: 14 }}>
        {i + 1}. {step}
      </div>
    ))}

    <Card style={{ marginTop: 20 }}>
      <div style={{ fontWeight: 800, marginBottom: 8 }}>Core Architecture</div>
      <div style={{ fontSize: 12, color: C.text3 }}>Advanced Trading • Bank-Level Security • Lightning Execution • Global Access</div>
    </Card>
  </div>
)}
        {/* Trade Tab */}
                {activeTab === "Trade" && (
          <div>
            <h2 style={{ marginBottom: 16 }}>Trading Terminal</h2>
            <PortfolioChart />
            <Card>
              <div style={{ fontWeight: 800, marginBottom: 12 }}>Portfolio Holdings</div>
              {holdings.map((h, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{h.pair}</div>
                    <div style={{ fontSize: 10, color: C.text3 }}>{h.label}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700 }}>${h.value.toLocaleString()}</div>
                    <div style={{ color: C.green }}>+{h.pct}%</div>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}
        {activeTab === "Markets" && (
  <div>
    <h2 style={{ marginBottom: 16 }}>Global Markets</h2>
    <Card>
      <div style={{ fontWeight: 800 }}>USD/JPY</div>
      <div style={{ fontSize: 14 }}>157.24</div>
    </Card>
  </div>
)}
        {/* More Tab */}
                {activeTab === "More" && (
          <div>
            <h2 style={{ marginBottom: 20 }}>Account Settings</h2>
            {[
              { icon: Shield, label: "Security & KYC" },
              { icon: Activity, label: "Transaction History" },
              { icon: Settings, label: "Platform Preferences" },
              { icon: LogOut, label: "Logout", color: C.red }
            ].map((item, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0", borderBottom: i < 3 ? "1px solid " + C.border : "none" }}>
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0", borderBottom: i < 3 ? "1px solid " + C.border : "none" }}>
                <span style={{ color: item.color || C.text }}>{item.label}</span>
              </div>
        ))
      </div>
    )}

    <div style={{ position: "fixed", bottom: 0, width: "100%", background: C.card, display: "flex", padding: "10px 0" }}>
      <NavButton icon={Home} label="Home" active={activeTab === "Home"} onClick={() => setActiveTab("Home")} />
      <NavButton icon={BarChart2} label="Markets" active={activeTab === "Markets"} onClick={() => setActiveTab("Markets")} />
      <NavButton icon={TrendingUp} label="Trade" active={activeTab === "Trade"} onClick={() => setActiveTab("Trade")} />
      <NavButton icon={MoreHorizontal} label="More" active={activeTab === "More"} onClick={() => setActiveTab("More")} />
    </div>
  </div>
);
}
