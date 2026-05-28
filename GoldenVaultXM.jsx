import { useState, useEffect } from "react";
import { BarChart, Bar, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ArrowDownToLine, ArrowUpFromLine, FileBarChart, Activity, ChevronRight, X } from "lucide-react";

const C = { bg: "#080808", card: "#0f0f0f", gold: "#d97706", green: "#22c55e", red: "#ef4444", text: "#ffffff", text3: "#525252" };
const holdings = [ { pair:"BTC/USDT", label:"Futures", value:45230.50, pct:5.4, color:C.gold }, { pair:"ETH/USDT", label:"Spot", value:19600.00, pct:8.2, color:"#3b82f6" } ];

const Card = ({ children, style = {} }) => (
  <div style={{ background:C.card, borderRadius:14, padding:"18px", border:"1px solid #222", ...style }}>
    {children}
  </div>
);

export default function GoldenVaultXM() {
  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh", padding: "20px" }}>
      <h1 style={{ color: C.gold }}>GOLDEN VAULT XM</h1>
      <Card>
        <h2>Portfolio Performance</h2>
        <div style={{ height: "200px" }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[{v:10},{v:20},{v:15}]}>
              <Bar dataKey="v" fill={C.gold} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
