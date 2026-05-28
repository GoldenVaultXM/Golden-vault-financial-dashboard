import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Home, BarChart2, TrendingUp, MoreHorizontal, Activity, ChevronRight, X } from "lucide-react";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = { bg: "#080808", card: "#0f0f0f", gold: "#d97706", green: "#22c55e", red: "#ef4444", text: "#ffffff", text3: "#525252" };

// ─── Components ──────────────────────────────────────────────────────────────
const Card = ({ children }) => <div style={{ background: C.card, border: "1px solid #222", borderRadius: 14, padding: 16, marginBottom: 16 }}>{children}</div>;

const PortfolioChart = () => (
  <Card>
    <div style={{ fontWeight: 800, marginBottom: 10 }}>Portfolio Performance</div>
    <ResponsiveContainer width="100%" height={150}>
      <BarChart data={Array.from({length: 20}, (_, i) => ({day: i, val: Math.random() * 100}))}>
        <Bar dataKey="val" fill={C.gold} radius={[4,4,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  </Card>
);

const MarketSentiment = () => (
  <Card>
    <div style={{ fontWeight: 800, marginBottom: 10 }}>Market Sentiment</div>
    <div style={{ fontSize: 40, fontWeight: 900, color: C.red }}>24</div>
    <div style={{ color: C.red, fontSize: 12 }}>FEAR</div>
    <div style={{ background: C.bg, height: 8, borderRadius: 4, marginTop: 10 }}>
      <div style={{ width: "40%", background: C.red, height: "100%", borderRadius: 4 }} />
    </div>
  </Card>
);

// ─── Main Application ─────────────────────────────────────────────────────────
export default function GoldenVaultXM() {
  const [activeTab, setActiveTab] = useState("Trade");

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "sans-serif", paddingBottom: 80 }}>
      <div style={{ padding: 20 }}>
        <h1 style={{ color: C.gold, fontSize: 22 }}>GOLDEN VAULT XM</h1>
        
        {activeTab === "Trade" && (
          <>
            <div style={{ fontWeight: 800, marginBottom: 10 }}>Welcome back, goldenvaultxm</div>
            <PortfolioChart />
            <MarketSentiment />
          </>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{ position: "fixed", bottom: 0, width: "100%", background: C.card, display: "flex", padding: "10px 0", borderTop: "1px solid #222" }}>
        {[
          { id: "Home", icon: Home }, { id: "Markets", icon: BarChart2 }, 
          { id: "Trade", icon: TrendingUp }, { id: "More", icon: MoreHorizontal }
        ].map(item => (
          <button key={item.id} onClick={() => setActiveTab(item.id)} style={{ 
            flex: 1, background: "none", border: "none", color: activeTab === item.id ? C.gold : C.text3, 
            display: "flex", flexDirection: "column", alignItems: "center", cursor: "pointer" 
          }}>
            <item.icon size={22} />
            <span style={{ fontSize: 10 }}>{item.id}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
