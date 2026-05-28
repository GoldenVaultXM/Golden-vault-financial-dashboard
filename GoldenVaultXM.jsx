import { useState } from "react";
import { Home, BarChart2, TrendingUp, MoreHorizontal } from "lucide-react";

// --- Design Tokens & Components ---
const C = { bg: "#080808", card: "#0f0f0f", gold: "#d97706", text: "#ffffff", text3: "#525252" };

const NavButton = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} style={{ 
    display: "flex", flexDirection: "column", alignItems: "center", gap: 4, 
    background: "none", border: "none", color: active ? C.gold : C.text3, cursor: "pointer", flex: 1 
  }}>
    <Icon size={24} />
    <span style={{ fontSize: 10 }}>{label}</span>
  </button>
);

// --- Main Layout ---
export default function GoldenVaultXM() {
  const [activeTab, setActiveTab] = useState("Home");

  return (
    <div style={{ background: C.bg, minHeight: "100vh", color: C.text, fontFamily: "sans-serif", paddingBottom: "80px" }}>
      
      {/* Dynamic Content Area */}
      <div style={{ padding: "20px" }}>
        {activeTab === "Home" && <div><h1 style={{ color: C.gold }}>GOLDEN VAULT XM</h1><p>Precision Velocity Insight.</p></div>}
        {activeTab === "Markets" && <div><h2>Global Trading Markets</h2></div>}
        {activeTab === "Trade" && <div><h2>Trading Overview</h2></div>}
        {activeTab === "More" && <div><h2>Account</h2></div>}
      </div>

      {/* Bottom Navigation Bar */}
      <div style={{ 
        position: "fixed", bottom: 0, left: 0, right: 0, 
        background: C.card, padding: "10px 0", display: "flex", 
        borderTop: "1px solid #222" 
      }}>
        <NavButton icon={Home} label="Home" active={activeTab === "Home"} onClick={() => setActiveTab("Home")} />
        <NavButton icon={BarChart2} label="Markets" active={activeTab === "Markets"} onClick={() => setActiveTab("Markets")} />
        <NavButton icon={TrendingUp} label="Trade" active={activeTab === "Trade"} onClick={() => setActiveTab("Trade")} />
        <NavButton icon={MoreHorizontal} label="More" active={activeTab === "More"} onClick={() => setActiveTab("More")} />
      </div>
    </div>
  );
}
