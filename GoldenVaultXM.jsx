import { useState, useEffect } from "react";
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell
} from "recharts";
import {
  Wallet, TrendingUp, Activity, BarChart2, Shield, Zap, Globe,
  ArrowDownToLine, ArrowUpFromLine, FileBarChart, CheckCircle2,
  Menu, X, ChevronRight, Flame, Droplets, Bitcoin, DollarSign,
  Star, Target, Eye, Bell, Settings, LogOut, Home, BookOpen
} from "lucide-react";

// ── Palette & helpers ────────────────────────────────────────────────────────
const GOLD   = "#d97706";
const GOLD2  = "#f59e0b";
const BG     = "#080808";
const CARD   = "#111111";
const CARD2  = "#161616";
const BORDER = "#1e1e1e";
const GREEN  = "#22c55e";
const RED    = "#ef4444";

// ── Fake data ────────────────────────────────────────────────────────────────
const perfData = Array.from({ length: 30 }, (_, i) => ({
  day: i + 1,
  value: 4000 + Math.sin(i * 0.6) * 1200 + Math.random() * 800,
}));

const holdings = [
  { pair: "BTC/USDT", label: "Perpetual Futures", value: 45230.50, pct: +5.4,  delta: +2310.50 },
  { pair: "ETH/USDT", label: "Spot Trading",      value: 19600.00, pct: +8.2,  delta: +1486.70 },
  { pair: "EUR/USD",  label: "Forex Pairs",        value: 32100.00, pct: -2.1,  delta: -689.20  },
  { pair: "XAU/USD",  label: "Gold Futures",       value: 28500.00, pct: +3.8,  delta: +1045.30 },
];

const liveMarkets = [
  { name: "Bitcoin",       pair: "BTC/USDT", price: "75,244.02", pct: "+0.01%", up: true  },
  { name: "Ethereum",      pair: "ETH/USDT", price: "2,073.54",  pct: "+0.00%", up: true  },
  { name: "Euro / Dollar", pair: "EUR/USD",  price: "1.1629",    pct: "-0.00%", up: false },
  { name: "S&P 500",       pair: "S&P 500",  price: "4,701.11",  pct: "+0.02%", up: true  },
];

const marketItems = [
  { id: "01", label: "Forex Trading",      desc: "Major, minor, and exotic currency pairs" },
  { id: "02", label: "Cryptocurrency",     desc: "Spot, perpetual futures, and margin" },
  { id: "03", label: "Futures Contracts",  desc: "Commodities and financial futures" },
  { id: "04", label: "Commodities",        desc: "Gold, silver, oil and agricultural" },
  { id: "05", label: "NFT Marketplace",    desc: "Digital assets and collectibles" },
];

// ── Sub-components ────────────────────────────────────────────────────────────

function GoldDivider() {
  return (
    <div style={{ height: 1, background: `linear-gradient(90deg, transparent, ${GOLD}44, transparent)` }} />
  );
}

// Stat card
function StatCard({ icon: Icon, label, value, badge, color = GREEN }) {
  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14,
      padding: "18px 20px", display: "flex", flexDirection: "column", gap: 8
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{
          width: 40, height: 40, borderRadius: 10,
          background: `${color}18`, display: "grid", placeItems: "center"
        }}>
          <Icon size={18} color={color} />
        </div>
        {badge && (
          <span style={{
            fontSize: 11, fontWeight: 700, color, letterSpacing: "0.05em",
            background: `${color}18`, borderRadius: 20, padding: "2px 8px"
          }}>↑ {badge}</span>
        )}
      </div>
      <div style={{ fontSize: 12, color: "#666", fontWeight: 500, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, color: "#fff", letterSpacing: "-0.02em" }}>
        {value}
      </div>
    </div>
  );
}

// Portfolio bar chart
function PortfolioChart() {
  const [range, setRange] = useState("30D");
  const ranges = ["7D", "30D", "3M", "1Y"];
  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: "20px 16px"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>Portfolio Performance</div>
          <div style={{ fontSize: 12, color: "#555", marginTop: 2 }}>Total return over time</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {ranges.map(r => (
            <button key={r} onClick={() => setRange(r)} style={{
              fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, border: "none",
              cursor: "pointer", transition: "all 0.2s",
              background: range === r ? GOLD : `${GOLD}15`,
              color: range === r ? "#000" : "#666"
            }}>{r}</button>
          ))}
        </div>
      </div>
      <ResponsiveContainer width="100%" height={160}>
        <BarChart data={perfData} barSize={6}>
          <XAxis dataKey="day" hide />
          <YAxis hide domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ background: "#1a1a1a", border: `1px solid ${BORDER}`, borderRadius: 8, fontSize: 12 }}
            labelStyle={{ color: "#888" }}
            itemStyle={{ color: GOLD2 }}
            formatter={(v) => [`$${v.toFixed(2)}`, "Value"]}
          />
          <Bar dataKey="value" radius={[3, 3, 0, 0]}>
            {perfData.map((entry, i) => (
              <Cell key={i} fill={entry.value > 4800 ? GOLD2 : `${GOLD}88`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12 }}>
        <div>
          <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" }}>Total Invested</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#fff", marginTop: 2 }}>$125,430.50</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#555", textTransform: "uppercase", letterSpacing: "0.06em" }}>Current Value</div>
          <div style={{ fontSize: 16, fontWeight: 700, color: GREEN, marginTop: 2 }}>$129,683.10</div>
        </div>
      </div>
    </div>
  );
}

// Quick Actions
function QuickActions() {
  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20
    }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: "#fff", marginBottom: 14 }}>Quick Actions</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <button style={{
          background: GOLD, color: "#000", border: "none", borderRadius: 10,
          padding: "13px 16px", fontWeight: 800, fontSize: 14, cursor: "pointer",
          display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
          letterSpacing: "0.03em"
        }}>
          <ArrowDownToLine size={16} /> Deposit Funds
        </button>
        <button style={{
          background: "transparent", color: GOLD, border: `1.5px solid ${GOLD}`,
          borderRadius: 10, padding: "13px 16px", fontWeight: 800, fontSize: 14,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8
        }}>
          <ArrowUpFromLine size={16} /> Withdraw Funds
        </button>
        <button style={{
          background: CARD2, color: "#888", border: `1px solid ${BORDER}`,
          borderRadius: 10, padding: "13px 16px", fontWeight: 600, fontSize: 14,
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8
        }}>
          <FileBarChart size={16} /> View Reports
        </button>
      </div>
    </div>
  );
}

// Account Status
function AccountStatus() {
  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20
    }}>
      <div style={{ fontWeight: 700, fontSize: 15, color: "#fff", marginBottom: 14 }}>Account Status</div>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#666", fontSize: 13 }}>Verification</span>
          <span style={{
            fontSize: 11, fontWeight: 700, color: GREEN,
            background: `${GREEN}18`, borderRadius: 20, padding: "3px 10px",
            display: "flex", alignItems: "center", gap: 4
          }}>
            <CheckCircle2 size={11} /> Verified
          </span>
        </div>
        <GoldDivider />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#666", fontSize: 13 }}>Account Type</span>
          <span style={{
            fontSize: 11, fontWeight: 700, color: GOLD2,
            background: `${GOLD}22`, borderRadius: 20, padding: "3px 10px"
          }}>Premium</span>
        </div>
        <GoldDivider />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#666", fontSize: 13 }}>KYC Level</span>
          <span style={{
            fontSize: 11, fontWeight: 700, color: "#8b5cf6",
            background: "#8b5cf618", borderRadius: 20, padding: "3px 10px"
          }}>Level 3</span>
        </div>
      </div>
    </div>
  );
}

// Portfolio Holdings
function PortfolioHoldings() {
  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>Portfolio Holdings</div>
        <button style={{
          background: "none", border: "none", color: GOLD, fontSize: 12,
          fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 3
        }}>View All <ChevronRight size={12} /></button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
        {holdings.map((h, i) => (
          <div key={i}>
            <div style={{ padding: "12px 0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14, color: "#fff" }}>{h.pair}</div>
                <div style={{ fontSize: 11, color: "#555", marginTop: 2 }}>${h.value.toLocaleString()}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: h.pct >= 0 ? GREEN : RED }}>
                  {h.pct >= 0 ? "+" : ""}{h.pct}%
                </div>
                <div style={{ fontSize: 11, color: h.delta >= 0 ? GREEN : RED, marginTop: 2 }}>
                  {h.delta >= 0 ? "+" : ""}${Math.abs(h.delta).toFixed(2)}
                </div>
              </div>
            </div>
            {i < holdings.length - 1 && <GoldDivider />}
          </div>
        ))}
      </div>
    </div>
  );
}

// Market Sentiment gauge
function MarketSentiment() {
  const [vote, setVote] = useState(null);
  const [showPrompt, setShowPrompt] = useState(true);
  const bearish = 24, bullish = 38;
  const total = bearish + bullish;
  const bullPct = Math.round((bullish / total) * 100);

  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>Market Sentiment</div>
        <Activity size={16} color={GOLD} />
      </div>

      {/* Fear/Greed index */}
      <div style={{ textAlign: "center", marginBottom: 16 }}>
        <div style={{ fontSize: 56, fontWeight: 900, color: RED, lineHeight: 1, letterSpacing: "-0.04em" }}>24</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: RED, marginTop: 4, textTransform: "uppercase", letterSpacing: "0.1em" }}>Fear</div>
      </div>

      {/* Bullish/Bearish bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", gap: 4, height: 6, borderRadius: 3, overflow: "hidden", marginBottom: 6 }}>
          <div style={{ flex: bullish, background: GREEN, borderRadius: "3px 0 0 3px" }} />
          <div style={{ flex: bearish, background: RED, borderRadius: "0 3px 3px 0" }} />
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: GREEN }}>Bullish {bullish}</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: RED }}>Bearish {bearish}</span>
        </div>
      </div>

      <GoldDivider />
      <div style={{ padding: "10px 0", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#555", fontSize: 12 }}>ETH Gas</span>
          <span style={{ color: "#aaa", fontSize: 12, fontWeight: 600 }}>0.127 GWei ≈ $0.006</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "#555", fontSize: 12 }}>BTC Long/Short</span>
          <span style={{ fontSize: 12, fontWeight: 700 }}>
            <span style={{ color: GREEN }}>66.0</span>
            <span style={{ color: "#444" }}> / </span>
            <span style={{ color: RED }}>34.0</span>
          </span>
        </div>
      </div>

      {/* Vote prompt */}
      {showPrompt && (
        <div style={{
          background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 12,
          padding: "14px", marginTop: 12, position: "relative"
        }}>
          <button onClick={() => setShowPrompt(false)} style={{
            position: "absolute", top: 8, right: 8,
            background: "none", border: "none", cursor: "pointer", color: "#444"
          }}><X size={14} /></button>
          <div style={{ fontWeight: 700, fontSize: 13, color: "#fff", marginBottom: 12 }}>
            How do you feel about the Market today?
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setVote("bullish")} style={{
              flex: 1, padding: "10px 0", borderRadius: 20, border: "none",
              cursor: "pointer", fontWeight: 700, fontSize: 13,
              background: vote === "bullish" ? GREEN : `${GREEN}22`,
              color: vote === "bullish" ? "#fff" : GREEN,
              transition: "all 0.2s"
            }}>Bullish</button>
            <button onClick={() => setVote("bearish")} style={{
              flex: 1, padding: "10px 0", borderRadius: 20, border: "none",
              cursor: "pointer", fontWeight: 700, fontSize: 13,
              background: vote === "bearish" ? RED : `${RED}22`,
              color: vote === "bearish" ? "#fff" : RED,
              transition: "all 0.2s"
            }}>Bearish</button>
          </div>
        </div>
      )}
    </div>
  );
}

// Live Market Ticker
function LiveTicker() {
  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: "#fff" }}>Live Markets</div>
        <span style={{
          fontSize: 10, fontWeight: 800, color: GREEN, background: `${GREEN}18`,
          borderRadius: 4, padding: "2px 6px", letterSpacing: "0.08em"
        }}>● LIVE</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        {liveMarkets.map((m, i) => (
          <div key={i} style={{
            background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 10,
            padding: "12px 14px"
          }}>
            <div style={{ fontSize: 10, color: "#444", textTransform: "uppercase", letterSpacing: "0.07em" }}>{m.name}</div>
            <div style={{ fontWeight: 800, fontSize: 13, color: "#fff", marginTop: 2 }}>{m.pair}</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: "#fff", marginTop: 6 }}>{m.price}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: m.up ? GREEN : RED, marginTop: 2 }}>
              {m.up ? "↗" : "↘"} {m.pct} today
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Market ecosystem list
function MarketEcosystem() {
  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: 20
    }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: GOLD, textTransform: "uppercase", letterSpacing: "0.12em", marginBottom: 4 }}>
        Multi-Asset
      </div>
      <div style={{ fontWeight: 900, fontSize: 20, color: "#fff", marginBottom: 4 }}>
        Trading <span style={{ color: GOLD }}>Ecosystem</span>
      </div>
      <div style={{ fontSize: 12, color: "#555", marginBottom: 16 }}>
        200+ instruments across all major asset classes
      </div>
      {marketItems.map((m, i) => (
        <div key={i}>
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "space-between",
            padding: "12px 0", cursor: "pointer"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 11, color: GOLD, fontWeight: 700 }}>{m.id}</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>{m.label}</div>
                <div style={{ fontSize: 11, color: "#444", marginTop: 1 }}>{m.desc}</div>
              </div>
            </div>
            <ChevronRight size={14} color="#333" />
          </div>
          {i < marketItems.length - 1 && <GoldDivider />}
        </div>
      ))}
    </div>
  );
}

// Infrastructure cards
function InfraCard({ icon: Icon, title, desc }) {
  return (
    <div style={{
      background: CARD2, border: `1px solid ${BORDER}`, borderRadius: 12, padding: 16
    }}>
      <div style={{
        width: 36, height: 36, borderRadius: 8, background: `${GOLD}18`,
        display: "grid", placeItems: "center", marginBottom: 10
      }}>
        <Icon size={16} color={GOLD} />
      </div>
      <div style={{ fontWeight: 700, fontSize: 13, color: "#fff", marginBottom: 4 }}>{title}</div>
      <div style={{ fontSize: 12, color: "#555", lineHeight: 1.5 }}>{desc}</div>
    </div>
  );
}

// Nav
function Nav({ page, setPage, menuOpen, setMenuOpen }) {
  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Home },
    { id: "markets",   label: "Markets",   icon: BarChart2 },
    { id: "trading",   label: "Trading",   icon: TrendingUp },
    { id: "settings",  label: "Settings",  icon: Settings },
  ];

  return (
    <header style={{
      position: "sticky", top: 0, zIndex: 100,
      background: `${BG}ee`, backdropFilter: "blur(12px)",
      borderBottom: `1px solid ${BORDER}`,
      padding: "0 16px", height: 60,
      display: "flex", alignItems: "center", justifyContent: "space-between"
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 38, height: 38, borderRadius: 10,
          background: `linear-gradient(135deg, ${GOLD} 0%, #92400e 100%)`,
          display: "grid", placeItems: "center"
        }}>
          <Zap size={18} color="#000" fill="#000" />
        </div>
        <div>
          <div style={{ fontWeight: 900, fontSize: 13, color: GOLD, letterSpacing: "0.08em" }}>GOLDEN VAULT XM</div>
          <div style={{ fontSize: 9, color: "#555", letterSpacing: "0.18em" }}>ELITE TRADING</div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <button style={{ background: "none", border: "none", cursor: "pointer", color: "#555", padding: 6 }}>
          <Bell size={18} />
        </button>
        <button
          on
