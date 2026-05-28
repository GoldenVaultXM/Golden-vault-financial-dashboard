import { useState, useEffect } from "react";
import { BarChart, Bar, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { Activity, ChevronRight, ArrowDownToLine, ArrowUpFromLine, FileBarChart } from "lucide-react";

// Design Tokens
const C = { bg: "#080808", card: "#0f0f0f", gold: "#d97706", gold2: "#f59e0b", green: "#22c55e", red: "#ef4444", text: "#ffffff", text2: "#a3a3a3", text3: "#525252" };

// Components
const Card = ({ title, children }) => (
  <div style={{ background: C.card, padding: "20px", borderRadius: "14px", border: "1px solid #222", marginBottom: "20px" }}>
    {title && <h3 style={{ fontSize: "14px", color: C.text3, marginBottom: "15px" }}>{title}</h3>}
    {children}
  </div>
);

const AssetRow = ({ asset, price, change }) => (
  <div style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #1a1a1a" }}>
    <div style={{ fontWeight: "600" }}>{asset}</div>
    <div style={{ textAlign: "right" }}>
      <div>${price}</div>
      <div style={{ fontSize: "11px", color: change >= 0 ? C.green : C.red }}>{change >= 0 ? "+" : ""}{change}%</div>
    </div>
  </div>
);

const StatItem = ({ label, value, color }) => (
  <div style={{ background: C.card, padding: "15px", borderRadius: "12px", border: "1px solid #222" }}>
    <div style={{ fontSize: "11px", color: C.text3, marginBottom: "4px" }}>{label}</div>
    <div style={{ fontSize: "18px", fontWeight: "bold", color: color || "#fff" }}>{value}</div>
  </div>
);

export default function GoldenVaultXM() {
  return (
    <div style={{ background: C.bg, minHeight: "100vh", padding: "20px", fontFamily: "sans-serif", color: C.text }}>
      <header style={{ marginBottom: "20px" }}>
        <h1 style={{ color: C.gold, margin: 0 }}>GOLDEN VAULT XM</h1>
      </header>

      {/* Summary Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
        <StatItem label="Total Balance" value="$64,830" />
        <StatItem label="24h Profit" value="+$842" color={C.green} />
      </div>

      {/* Overview Chart */}
      <Card title="Portfolio Overview">
        <ResponsiveContainer width="100%" height={150}>
          <BarChart data={[{v:3000},{v:5000},{v:4000}]}>
            <Bar dataKey="v" fill={C.gold} radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      {/* Holdings */}
      <Card title="Holdings">
        <AssetRow asset="BTC/USDT" price="45,230" change={1.2} />
        <AssetRow asset="ETH/USDT" price="19,600" change={-0.5} />
      </Card>

      {/* Market Updates */}
      <Card title="Market Updates">
        <div style={{ fontSize: "13px", color: C.text2 }}>
          <p style={{ marginBottom: "10px" }}>• BTC breaking resistance at $75,500.</p>
          <p>• Institutional flow suggests bullish trend for Q3.</p>
        </div>
      </Card>
    </div>
  );
        }
