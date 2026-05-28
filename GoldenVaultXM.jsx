import { useState, useEffect } from "react";
import { BarChart, Bar, ResponsiveContainer, Tooltip, Cell } from "recharts";
import { ArrowDownToLine, ArrowUpFromLine, Activity, ChevronRight, X } from "lucide-react";

const C = { bg: "#080808", card: "#0f0f0f", gold: "#d97706", green: "#22c55e", red: "#ef4444", text: "#ffffff", text3: "#525252" };

export default function GoldenVaultXM() {
  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh", padding: "20px", fontFamily: "sans-serif" }}>
      <header style={{ marginBottom: "20px" }}><h1 style={{ color: C.gold, margin: 0 }}>GOLDEN VAULT XM</h1></header>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        {/* Portfolio Section */}
        <div style={{ background: C.card, padding: "20px", borderRadius: "14px" }}>
          <h2 style={{ fontSize: "16px", marginBottom: "15px" }}>Portfolio Overview</h2>
          <div style={{ height: "150px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[{d:1,v:3000},{d:2,v:5000},{d:3,v:4000}]}>
                <Bar dataKey="v" fill={C.gold} radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Market Sentiment */}
        <div style={{ background: C.card, padding: "20px", borderRadius: "14px" }}>
          <h2 style={{ fontSize: "16px", marginBottom: "15px" }}>Market Sentiment</h2>
          <div style={{ textAlign: "center", fontSize: "40px", fontWeight: "900", color: C.red }}>24</div>
          <div style={{ textAlign: "center", color: C.text3, fontSize: "12px" }}>FEAR INDEX</div>
          <div style={{ background: C.text3, height: "8px", borderRadius: "4px", marginTop: "15px" }}>
            <div style={{ background: C.red, width: "24%", height: "100%", borderRadius: "4px" }} />
          </div>
        </div>
      </div>

      <div style={{ marginTop: "20px", background: C.card, padding: "20px", borderRadius: "14px" }}>
        <h2 style={{ fontSize: "16px" }}>Quick Actions</h2>
        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <button style={{ background: C.gold, border: "none", padding: "10px 20px", borderRadius: "8px", cursor: "pointer", fontWeight: "bold" }}>Deposit</button>
          <button style={{ background: "transparent", border: `1px solid ${C.gold}`, color: C.gold, padding: "10px 20px", borderRadius: "8px", cursor: "pointer" }}>Withdraw</button>
        </div>
      </div>
    </div>
  );
}
