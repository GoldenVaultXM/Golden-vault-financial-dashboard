import { useState } from "react";
import { BarChart, Bar, ResponsiveContainer, Tooltip } from "recharts";
import { Activity } from "lucide-react";

const C = { bg: "#080808", card: "#0f0f0f", gold: "#d97706", red: "#ef4444", text: "#ffffff", text3: "#525252" };
const Badge = ({ text, color }) => (
  <span style={{ background: `${color}20`, color: color, padding: "4px 8px", borderRadius: "6px", fontSize: "10px", fontWeight: "bold" }}>
    {text}
  </span>
);
const Card = ({ title, children }) => (
  <div style={{ background: "#0f0f0f", padding: "20px", borderRadius: "14px", border: "1px solid #222", marginBottom: "20px" }}>
    <h3 style={{ fontSize: "14px", color: "#525252", marginBottom: "15px" }}>{title}</h3>
    {children}
  </div>
);
const AssetRow = ({ asset, price, change }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #1a1a1a" }}>
    <div>
      <div style={{ fontWeight: "600" }}>{asset}</div>
    </div>
    <div style={{ textAlign: "right" }}>
      <div>${price}</div>
      <div style={{ fontSize: "11px", color: change >= 0 ? "#22c55e" : "#ef4444" }}>
        {change >= 0 ? "+" : ""}{change}%
      </div>
    </div>
  </div>
);
const StatItem = ({ label, value, color }) => (
  <div style={{ background: "#0f0f0f", padding: "15px", borderRadius: "12px", border: "1px solid #222" }}>
    <div style={{ fontSize: "11px", color: "#525252", marginBottom: "4px" }}>{label}</div>
    <div style={{ fontSize: "18px", fontWeight: "bold", color: color || "#fff" }}>{value}</div>
  </div>
);
export default function GoldenVaultXM() {
  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh", padding: "20px", fontFamily: "sans-serif" }}>
      <header style={{ marginBottom: "20px" }}><h1 style={{ color: C.gold, margin: 0 }}>GOLDEN VAULT XM</h1></header>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
  <StatItem label="Total Balance" value="$64,830" />
  <StatItem label="24h Profit" value="+$842" color="#22c55e" />
</div>
      {/* Overview */}
      <div style={{ display: "grid", gap: "20px", gridTemplateColumns: "1fr 1fr" }}>
        <div style={{ background: C.card, padding: "20px", borderRadius: "14px" }}>
          <h2 style={{ fontSize: "16px", marginBottom: "15px" }}>Portfolio Overview</h2>
          <div style={{ height: "150px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{v:3000},{v:5000},{v:4000}]}>
                <Bar dataKey="v" fill={C.gold} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ background: C.card, padding: "20px", borderRadius: "14px" }}>
          <h2 style={{ fontSize: "16px" }}>Market Sentiment</h2>
          <div style={{ fontSize: "40px", fontWeight: "900", color: C.red, textAlign: "center", margin: "10px 0" }}>24</div>
          <div style={{ background: C.text3, height: "8px", borderRadius: "4px" }}>
            <div style={{ background: C.red, width: "24%", height: "100%", borderRadius: "4px" }} />
          </div>
        </div>
      </div>

      {/* Holdings & Ticker */}
      <div style={{ marginTop: "20px", background: C.card, padding: "20px", borderRadius: "14px" }}>
        <h2 style={{ fontSize: "16px" }}>Holdings</h2>
       <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid #222" }}><span>BTC/USDT</span><span style={{ fontWeight: "bold" }}>$45,230</span></div>
       <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}><span>ETH/USDT</span><span style={{ fontWeight: "bold" }}>$19,600</span></div>
      </div>
      
      <div style={{ marginTop: "20px", background: C.card, padding: "20px", borderRadius: "14px" }}>
        <h2 style={{ fontSize: "16px" }}>Live Ticker</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "10px" }}>
          <div style={{ background: "#141414", padding: "10px", borderRadius: "8px", textAlign: "center" }}>BTC: $75,244</div>
          <div style={{ background: "#141414", padding: "10px", borderRadius: "8px", textAlign: "center" }}>ETH: $2,073</div>
        </div>
      </div>
      <Card title="Market Updates">
  <div style={{ fontSize: "13px", color: "#a3a3a3" }}>
    <p style={{ marginBottom: "10px" }}>• BTC breaking resistance at $75,500.</p>
    <p>• Institutional flow suggests bullish trend for Q3.</p>
  </div>
</Card>
    </div>
  );
                                }
    i.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Card>
      <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:14}}>Market Overview</div>
      <div style={{display:"flex",gap:5,marginBottom:14,overflowX:"auto"}}>
        {CATS.map(c => (
          <button key={c} onClick={() => setCat(c)} style={{
            padding:"6px 12px",borderRadius:6,border:"none",fontSize:11,fontWeight:800,
            cursor:"pointer",background:c===cat?C.gold:`${C.gold}14`,color:c===cat?"#000":C.text3
          }}>{c}</button>
        ))}
      </div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {filtered.map((item,i) => (
          <div key={i} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
            <div>
              <div style={{fontSize:13,fontWeight:700}}>{item.pair}</div>
              <div style={{fontSize:10,color:C.text3}}>{item.name}</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontSize:13,fontWeight:700}}>{item.price}</div>
              <div style={{fontSize:11,color:item.up?C.green:C.red}}>{item.pct}</div>
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
    <div style={{background:C.bg,minHeight:"100vh",padding:"20px",color:C.text,fontFamily:"sans-serif"}}>
      <h1 style={{fontSize:24,fontWeight:900,color:C.gold,marginBottom:20}}>GOLDEN VAULT XM</h1>
      <div style={{display:"grid",gap:20,gridTemplateColumns:"repeat(auto-fit, minmax(300px, 1fr))"}}>
        <PortfolioChart />
        <div style={{display:"flex",flexDirection:"column",gap:20}}>
          <AccountStatus />
          <QuickActions />
        </div>
        <PortfolioHoldings />
        <MarketSentiment />
        <LiveTicker />
        <MarketsPage />
      </div>
    </div>
  );
}
