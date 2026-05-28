import { useState, useEffect, useRef } from "react";
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine
} from "recharts";
import {
  Wallet, TrendingUp, Activity, BarChart2, Shield, Zap, Globe,
  ArrowDownToLine, ArrowUpFromLine, FileBarChart, CheckCircle2,
  Menu, X, ChevronRight, Bell, Settings, LogOut, Home,
  BookOpen, Search, Filter, Star, Target, Eye, Lock,
  Phone, Mail, MapPin, Users, DollarSign, Award
} from "lucide-react";

// ─── Design Tokens ────────────────────────────────────────────────────────────
const C = {
  bg:      "#080808",
  card:    "#0f0f0f",
  card2:   "#141414",
  card3:   "#1a1a1a",
  border:  "#222222",
  border2: "#2a2a2a",
  gold:    "#d97706",
  gold2:   "#f59e0b",
  gold3:   "#fbbf24",
  goldDim: "#92400e",
  green:   "#22c55e",
  red:     "#ef4444",
  purple:  "#7c3aed",
  blue:    "#3b82f6",
  text:    "#ffffff",
  text2:   "#a3a3a3",
  text3:   "#525252",
  text4:   "#303030",
};

// ─── Static Data ──────────────────────────────────────────────────────────────
const perfData = [
  3200,4100,3800,4900,4200,5100,4700,5800,5200,6100,
  5500,6400,5900,7000,6200,7500,6800,7200,6600,8100,
  7400,6900,8300,7800,9000,8200,7600,8800,8400,9200
].map((v, i) => ({ day: i + 1, value: v }));

const holdings = [
  { pair:"BTC/USDT", label:"Perpetual Futures", value:45230.50, pct:+5.4,  delta:+2310.50, color:C.gold2  },
  { pair:"ETH/USDT", label:"Spot Trading",      value:19600.00, pct:+8.2,  delta:+1486.70, color:C.blue   },
  { pair:"EUR/USD",  label:"Forex Pairs",        value:32100.00, pct:-2.1,  delta:-689.20,  color:C.red    },
  { pair:"XAU/USD",  label:"Gold Futures",       value:28500.00, pct:+3.8,  delta:+1045.30, color:C.gold3  },
];

const liveMarkets = [
  { name:"Bitcoin",    pair:"BTC/USDT", price:"75,244.02", raw:75244.02, pct:"+0.01%", up:true  },
  { name:"Ethereum",   pair:"ETH/USDT", price:"2,073.54",  raw:2073.54,  pct:"+0.00%", up:true  },
  { name:"EUR/Dollar", pair:"EUR/USD",  price:"1.1629",    raw:1.1629,   pct:"-0.00%", up:false },
  { name:"S&P 500",    pair:"S&P 500",  price:"4,701.11",  raw:4701.11,  pct:"+0.02%", up:true  },
];

const allInstruments = [
  { cat:"Crypto",    pair:"BTC/USDT",  name:"Bitcoin",              price:"75,244.02", pct:"+0.01%", up:true  },
  { cat:"Crypto",    pair:"ETH/USDT",  name:"Ethereum",             price:"2,073.54",  pct:"+0.00%", up:true  },
  { cat:"Forex",     pair:"EUR/USD",   name:"Euro / US Dollar",     price:"1.1629",    pct:"-0.00%", up:false },
  { cat:"Futures",   pair:"S&P 500",   name:"S&P 500 Index",        price:"4,701.11",  pct:"+0.02%", up:true  },
  { cat:"Commodity", pair:"XAU/USD",   name:"Gold Spot",            price:"2,380.77",  pct:"-0.02%", up:false },
  { cat:"Forex",     pair:"GBP/CHF",   name:"British Pound / CHF",  price:"1.1445",    pct:"+0.01%", up:true  },
  { cat:"Forex",     pair:"GBP/AUD",   name:"British Pound / AUD",  price:"1.9222",    pct:"+0.03%", up:true  },
  { cat:"Forex",     pair:"AUD/JPY",   name:"Australian Dollar/JPY",price:"101.52",    pct:"-0.00%", up:false },
  { cat:"NFT",       pair:"ETH NFTs",  name:"ETH NFT Floor Index",  price:"0.042",     pct:"+1.20%", up:true  },
  { cat:"Stock",     pair:"AAPL",      name:"Apple Inc.",           price:"189.30",    pct:"+0.34%", up:true  },
];

const CATS = ["All","Crypto","Forex","Stock","Futures","Commodity","NFT"];

// ─── Helpers ─────────────────────────────────────────────────────────────────
const GoldLine = () => (
  <div style={{height:1,background:`linear-gradient(90deg,transparent,${C.gold}33,transparent)`}} />
);

const Badge = ({ children, color }) => (
  <span style={{
    fontSize:10,fontWeight:800,letterSpacing:"0.06em",
    background:`${color}20`,color,borderRadius:4,padding:"2px 7px",
    display:"inline-block",textTransform:"uppercase"
  }}>{children}</span>
);

const IconBox = ({ icon: Icon, color = C.gold, size = 16, boxSize = 36 }) => (
  <div style={{
    width:boxSize,height:boxSize,borderRadius:9,
    background:`${color}18`,display:"grid",placeItems:"center",flexShrink:0
  }}>
    <Icon size={size} color={color} />
  </div>
);

const Card = ({ children, style = {} }) => (
  <div style={{
    background:C.card,border:`1px solid ${C.border}`,
    borderRadius:14,padding:"18px 16px",...style
  }}>
    {children}
  </div>
);

const SectionTag = ({ children }) => (
  <div style={{
    display:"inline-flex",alignItems:"center",gap:6,
    border:`1px solid ${C.gold}44`,borderRadius:6,
    padding:"5px 12px",marginBottom:14,cursor:"default"
  }}>
    <BarChart2 size={11} color={C.gold} />
    <span style={{fontSize:10,fontWeight:800,color:C.gold,letterSpacing:"0.14em",textTransform:"uppercase"}}>
      {children}
    </span>
    <ChevronRight size={10} color={C.gold} />
  </div>
);

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, badge, color = C.green, wide }) => (
  <Card style={{ display:"flex", flexDirection:"column", gap:10, gridColumn: wide ? "span 2" : undefined }}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
      <IconBox icon={Icon} color={color} />
      {badge && (
        <span style={{
          fontSize:11,fontWeight:800,color,background:`${color}18`,
          borderRadius:20,padding:"3px 8px",letterSpacing:"0.04em"
        }}>↑ {badge}</span>
      )}
    </div>
    <div>
      <div style={{fontSize:11,color:C.text3,textTransform:"uppercase",letterSpacing:"0.08em",marginBottom:4}}>
        {label}
      </div>
      <div style={{fontSize:26,fontWeight:900,color:C.text,letterSpacing:"-0.02em",lineHeight:1}}>
        {value}
      </div>
    </div>
  </Card>
);

// ─── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:C.card2,border:`1px solid ${C.border2}`,
      borderRadius:8,padding:"8px 12px",fontSize:12
    }}>
      <div style={{color:C.text3}}>Day {payload[0]?.payload?.day}</div>
      <div style={{color:C.gold2,fontWeight:700}}>${payload[0]?.value?.toLocaleString()}</div>
    </div>
  );
};

// ─── Portfolio Chart ──────────────────────────────────────────────────────────
const PortfolioChart = () => {
  const [range, setRange] = useState("30D");
  const ranges = ["7D","30D","3M","1Y"];
  const data = range === "7D" ? perfData.slice(-7) :
               range === "3M" ? [...perfData,...perfData,...perfData] :
               range === "1Y" ? [...perfData,...perfData,...perfData,...perfData,...perfData,...perfData,...perfData,...perfData,...perfData,...perfData,...perfData,...perfData].slice(0,90) :
               perfData;

  return (
    <Card>
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16}}>
        <div>
          <div style={{fontWeight:800,fontSize:15,color:C.text}}>Portfolio Performance</div>
          <div style={{fontSize:11,color:C.text3,marginTop:2}}>Last {range} overview</div>
        </div>
        <div style={{display:"flex",gap:5}}>
          {ranges.map(r => (
            <button key={r} onClick={() => setRange(r)} style={{
              fontSize:10,fontWeight:800,padding:"4px 9px",borderRadius:5,border:"none",
              cursor:"pointer",transition:"all .15s",
              background: r===range ? C.gold : `${C.gold}14`,
              color: r===range ? "#000" : C.text3
            }}>{r}</button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={148}>
        <BarChart data={data} barSize={range==="1Y"?2:range==="3M"?4:7} margin={{left:-20,right:0}}>
          <XAxis dataKey="day" hide />
          <YAxis hide domain={["dataMin - 500","dataMax + 200"]} />
          <Tooltip content={<CustomTooltip />} cursor={{fill:`${C.gold}08`}} />
          <Bar dataKey="value" radius={[3,3,0,0]}>
            {data.map((e,i) => (
              <Cell key={i} fill={e.value > 7000 ? C.gold2 : e.value > 5500 ? C.gold : `${C.goldDim}cc`} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      <div style={{display:"flex",justifyContent:"space-between",marginTop:14,paddingTop:12,borderTop:`1px solid ${C.border}`}}>
        <div>
          <div style={{fontSize:10,color:C.text3,textTransform:"uppercase",letterSpacing:"0.08em"}}>Total Invested</div>
          <div style={{fontSize:17,fontWeight:800,color:C.text,marginTop:3}}>$125,430.50</div>
        </div>
        <div style={{textAlign:"right"}}>
          <div style={{fontSize:10,color:C.text3,textTransform:"uppercase",letterSpacing:"0.08em"}}>Current Value</div>
          <div style={{fontSize:17,fontWeight:800,color:C.green,marginTop:3}}>$129,683.10</div>
        </div>
      </div>
    </Card>
  );
};

// ─── Quick Actions ────────────────────────────────────────────────────────────
const QuickActions = () => {
  const [loading, setLoading] = useState(null);
  const handle = (key) => {
    setLoading(key);
    setTimeout(() => setLoading(null), 1400);
  };

  return (
    <Card>
      <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:14}}>Quick Actions</div>
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        <button onClick={() => handle("dep")} style={{
          background: loading==="dep" ? C.goldDim : C.gold,
          color:"#000",border:"none",borderRadius:10,
          padding:"13px 16px",fontWeight:900,fontSize:13,cursor:"pointer",
          display:"flex",alignItems:"center",justifyContent:"center",gap:8,
          letterSpacing:"0.04em",transition:"all .2s",opacity: loading==="dep"?.7:1
        }}>
          <ArrowDownToLine size={15} />
          {loading==="dep" ? "Processing…" : "Deposit Funds"}
        </button>
        <button onClick={() => handle("wd")} style={{
          background:"transparent",color:C.gold,border:`1.5px solid ${C.gold}`,
          borderRadius:10,padding:"13px 16px",fontWeight:900,fontSize:13,
          cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8,
          transition:"all .2s",opacity: loading==="wd"?.7:1
        }}>
          <ArrowUpFromLine size={15} />
          {loading==="wd" ? "Processing…" : "Withdraw Funds"}
        </button>
        <button onClick={() => handle("rpt")} style={{
          background:C.card2,color:C.text3,border:`1px solid ${C.border}`,
          borderRadius:10,padding:"13px 16px",fontWeight:700,fontSize:13,
          cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:8
        }}>
          <FileBarChart size={15} />
          View Reports
        </button>
      </div>
    </Card>
  );
};

// ─── Account Status ───────────────────────────────────────────────────────────
const AccountStatus = () => (
  <Card>
    <div style={{fontWeight:800,fontSize:15,color:C.text,marginBottom:14}}>Account Status</div>
    {[
      { label:"Verification", value:"Verified",  color:C.green  },
      { label:"Account Type", value:"Premium",   color:C.gold2  },
      { label:"KYC Level",    value:"Level 3",   color:"#a78bfa" },
    ].map((row, i, arr) => (
      <div key={i}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 0"}}>
          <span style={{fontSize:13,color:C.text3}}>{row.label}</span>
          <Badge color={row.color}>{row.value}</Badge>
        </div>
        {i < arr.length-1 && <GoldLine />}
      </div>
    ))}
  </Card>
);

// ─── Portfolio Holdings ───────────────────────────────────────────────────────
const PortfolioHoldings = () => (
  <Card>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
      <div style={{fontWeight:800,fontSize:15,color:C.text}}>Portfolio Holdings</div>
      <button style={{background:"none",border:"none",color:C.gold,fontSize:12,fontWeight:700,cursor:"pointer",
        display:"flex",alignItems:"center",gap:3}}>
        View All <ChevronRight size={12} />
      </button>
    </div>
    {holdings.map((h,i) => (
      <div key={i}>
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 0"}}>
          <div style={{
            width:36,height:36,borderRadius:9,background:`${h.color}18`,
            display:"grid",placeItems:"center",flexShrink:0
          }}>
            <span style={{fontSize:10,fontWeight:900,color:h.color}}>
              {h.pair.split("/")[0]}
            </span>
          </div>
          <div style={{flex:1}}>
            <div style={{fontWeight:800,fontSize:13,color:C.text}}>{h.pair}</div>
            <div style={{fontSize:10,color:C.text3,marginTop:1}}>{h.label}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div style={{fontSize:13,fontWeight:800,color:h.pct>=0?C.green:C.red}}>
              {h.pct>=0?"+":""}{h.pct}%
            </div>
            <div style={{fontSize:11,color:h.pct>=0?C.green:C.red,marginTop:1}}>
              {h.delta>=0?"+$":"-$"}{Math.abs(h.delta).toFixed(2)}
            </div>
          </div>
        </div>
        {i<holdings.length-1 && <GoldLine />}
      </div>
    ))}
  </Card>
);

// ─── Market Sentiment ─────────────────────────────────────────────────────────
const MarketSentiment = () => {
  const [vote, setVote] = useState(null);
  const [show, setShow] = useState(true);
  const bullish = 38, bearish = 24;
  const total = bullish + bearish;
  const bPct = Math.round((bullish/total)*100);

  return (
    <Card>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <div style={{fontWeight:800,fontSize:15,color:C.text}}>Market Sentiment</div>
        <Activity size={15} color={C.gold} />
      </div>

      {/* Fear/Greed number */}
      <div style={{textAlign:"center",marginBottom:18,position:"relative"}}>
        <div style={{
          fontSize:72,fontWeight:900,color:C.red,lineHeight:1,
          letterSpacing:"-0.04em",textShadow:`0 0 40px ${C.red}44`
        }}>24</div>
        <div style={{
          fontSize:12,fontWeight:800,color:C.red,marginTop:4,
          textTransform:"uppercase",letterSpacing:"0.14em"
        }}>Fear</div>
        <div style={{
          fontSize:10,color:C.text3,marginTop:2,letterSpacing:"0.06em"
        }}>Fear & Greed Index</div>
      </div>

      {/* Progress bar */}
      <div style={{marginBottom:14}}>
        <div style={{
          display:"flex",height:7,borderRadius:4,overflow:"hidden",
          gap:2,marginBottom:7,background:C.card2
        }}>
          <div style={{flex:bullish,background:`linear-gradient(90deg,${C.green},${C.green}aa)`,borderRadius:"4px 0 0 4px"}} />
          <div style={{flex:bearish,background:`linear-gradient(90deg,${C.red}aa,${C.red})`,borderRadius:"0 4px 4px 0"}} />
        </div>
        <div style={{display:"flex",justifyContent:"space-between"}}>
          <span style={{fontSize:12,fontWeight:800,color:C.green}}>Bullish {bullish}</span>
          <span style={{fontSize:12,fontWeight:800,color:C.red}}>Bearish {bearish}</span>
        </div>
      </div>

      <GoldLine />
      <div style={{padding:"12px 0",display:"flex",flexDirection:"column",gap:8}}>
        {[
          ["ETH Gas", "0.127 GWei ≈ $0.006"],
          ["BTC Long/Short", null, C.green, C.red, "66.0", "34.0"],
        ].map(([label, val, c1, c2, v1, v2]) => (
          <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
            <span style={{fontSize:12,color:C.text3}}>{label}</span>
            {val
              ? <span style={{fontSize:12,fontWeight:700,color:C.text2}}>{val}</span>
              : <span style={{fontSize:12,fontWeight:800}}>
                  <span style={{color:c1}}>{v1}</span>
                  <span style={{color:C.text4}}> / </span>
                  <span style={{color:c2}}>{v2}</span>
                </span>
            }
          </div>
        ))}
      </div>

      {show && (
        <div style={{
          background:C.card2,border:`1px solid ${C.border2}`,
          borderRadius:12,padding:"14px",marginTop:8,position:"relative"
        }}>
          <button onClick={() => setShow(false)} style={{
            position:"absolute",top:8,right:8,background:"none",
            border:"none",cursor:"pointer",color:C.text4,padding:2
          }}><X size={14} /></button>
          <div style={{fontWeight:800,fontSize:13,color:C.text,marginBottom:12,paddingRight:16,lineHeight:1.4}}>
            How do you feel about the Market today?
          </div>
          <div style={{display:"flex",gap:8}}>
            {[["bullish",C.green,"Bullish"],["bearish",C.red,"Bearish"]].map(([key,color,label]) => (
              <button key={key} onClick={() => setVote(key)} style={{
                flex:1,padding:"11px 0",borderRadius:20,border:"none",cursor:"pointer",
                fontWeight:800,fontSize:13,transition:"all .2s",
                background: vote===key ? color : `${color}22`,
                color: vote===key ? "#fff" : color,
                transform: vote===key ? "scale(1.02)" : "scale(1)"
              }}>{label}</button>
            ))}
          </div>
          {vote && (
            <div style={{marginTop:10,textAlign:"center",fontSize:11,color:C.text3}}>
              ✓ Thanks for your vote — sentiment updated
            </div>
          )}
        </div>
      )}
    </Card>
  );
};

// ─── Live Ticker ──────────────────────────────────────────────────────────────
const LiveTicker = () => {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick(p => p+1), 3000);
    return () => clearInterval(t);
  }, []);

  const jitter = (base) => +(base + (Math.random()-.5)*base*.001).toFixed(base>100?2:4);

  return (
    <Card>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
        <div style={{fontWeight:800,fontSize:15,color:C.text}}>Live Markets</div>
        <div style={{display:"flex",alignItems:"center",gap:5}}>
          <div style={{width:6,height:6,borderRadius:"50%",background:C.green,
            boxShadow:`0 0 6px ${C.green}`,animation:"pulse 1.5s infinite"}} />
          <span style={{fontSize:10,fontWeight:800,color:C.green,letterSpacing:"0.08em"}}>LIVE</span>
        </div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
        {liveMarkets.map((m,i) => {
          const price = tick % 2 === 0 ? m.price : jitter(m.raw).toLocaleString();
          return (
            <div key={i} style={{
              background:C.card2,border:`1px solid ${C.border}`,
              borderRadius:10,padding:"12px 13px"
            }}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                <div style={{fontSize:9,color:C.text3,textTransform:"uppercase",letterSpacing:"0.08em"}}>{m.name}</div>
                <Badge color={C.text4}>LIVE</Badge>
              </div>
              <div style={{fontWeight:900,fontSize:12,color:C.text,marginBottom:6}}>{m.pair}</div>
              <div style={{fontWeight:900,fontSize:16,color:C.text,marginBottom:4,fontVariantNumeric:"tabular-nums"}}>
                {m.price}
              </div>
              <div style={{fontSize:11,fontWeight:800,color:m.up?C.green:C.red}}>
                {m.up?"↗":"↘"} {m.pct} today
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

// ─── Markets Full Page ────────────────────────────────────────────────────────
const MarketsPage = () => {
  const [cat, setCat] = useState("All");
  const [search, setSearch] = useState("");
  const filtered = allInstruments.filter(i =>
    (cat==="All" || i.cat===cat) &&
    (i.pair.toLowerCase().includes(search.toLowerCase
