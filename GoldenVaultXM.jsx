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
            <p style={{ color: C.text3 }}>Precision Velocity Insight.</p>
            <Card>
              <div style={{ fontWeight: 800, marginBottom: 8 }}>Quick Start</div>
              <button style={{ background: C.gold, color: "#000", border: "none", padding: "10px 20px", borderRadius: 8, fontWeight: 800 }}>Initialize Trading</button>
            </Card>
          </div>
        )}

        {/* Trade Tab */}
        {activeTab === "Trade" && (
          <div>
            <h2 style={{ marginBottom: 16 }}>Trading Terminal</h2>
            <Card>
              <div style={{ fontSize: 12, color: C.text3 }}>Total Balance</div>
              <div style={{ fontSize: 24, fontWeight: 900 }}>$129,683.10</div>
            </Card>
            <Card>
              <div style={{ fontWeight: 800, marginBottom: 10 }}>Portfolio Holdings</div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>BTC/USDT</span> <span style={{ color: C.green }}>+5.4%</span>
              </div>
            </Card>
          </div>
        )}

        {/* More Tab */}
        {activeTab === "More" && (
          <div>
            <h2 style={{ marginBottom: 20 }}>Account Settings</h2>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0", borderBottom: `1px solid ${C.border}` }}><Shield size={20} color={C.gold} /> <span>Security & KYC</span></div>
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px 0" }}><LogOut size={20} color={C.red} /> <span>Logout</span></div>
          </div>
        )}
      </div>

      {/* Persistent Navigation */}
      <div style={{ position: "fixed", bottom: 0, width: "100%", background: C.card, display: "flex", padding: "10px 0", borderTop: `1px solid ${C.border}` }}>
        <NavButton icon={Home} label="Home" active={activeTab === "Home"} onClick={() => setActiveTab("Home")} />
        <NavButton icon={BarChart2} label="Markets" active={activeTab === "Markets"} onClick={() => setActiveTab("Markets")} />
        <NavButton icon={TrendingUp} label="Trade" active={activeTab === "Trade"} onClick={() => setActiveTab("Trade")} />
        <NavButton icon={MoreHorizontal} label="More" active={activeTab === "More"} onClick={() => setActiveTab("More")} />
      </div>
    </div>
  );
}
