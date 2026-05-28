import { useState, useEffect } from "react";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Cell } from "recharts";
import { ArrowDownToLine, ArrowUpFromLine, FileBarChart, Activity, ChevronRight, X, Search, Menu } from "lucide-react";

const C = { bg: "#080808", card: "#0f0f0f", card2: "#141414", gold: "#d97706", green: "#22c55e", red: "#ef4444", text: "#ffffff", text3: "#525252" };
const allInstruments = [ { cat:"Crypto", pair:"BTC/USDT", name:"Bitcoin", price:"75,244.02" }, { cat:"Forex", pair:"EUR/USD", name:"Euro / US Dollar", price:"1.1629" } ];

export default function GoldenVaultXM() {
  const [page, setPage] = useState("dashboard");

  return (
    <div style={{ background: C.bg, color: C.text, minHeight: "100vh", fontFamily: "sans-serif" }}>
      <nav style={{ padding: "20px", borderBottom: `1px solid ${C.card2}`, display: "flex", justifyContent: "space-between" }}>
        <h1 style={{ fontSize: "18px", margin: 0, color: C.gold }}>GOLDEN VAULT XM</h1>
        <button onClick={() => setPage(page === "dashboard" ? "markets" : "dashboard")} style={{ background: C.card2, color: C.text, border: "none", padding: "8px 12px", borderRadius: "6px", cursor: "pointer" }}>
          {page === "dashboard" ? "Markets" : "Dashboard"}
        </button>
      </nav>
      <main style={{ padding: "20px" }}>
        {page === "dashboard" ? <div>Dashboard Content Here</div> : <div>Markets Content Here</div>}
      </main>
    </div>
  );
}
