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
    (i.pair.toLowerCase().includes(search.toLowerCase()) ||
     i.name.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{padding:"20px 0 4px"}}>
        <div style={{fontSize:28,fontWeight:900,color:C.text,lineHeight:1.1}}>
          Global Trading <span style={{color:C.gold}}>Markets</span>
        </div>
        <div style={{fontSize:12,color:C.text3,marginTop:8,lineHeight:1.6}}>
          Access a comprehensive suite of trading instruments across multiple asset classes.
        </div>
      </div>

      {/* Search */}
      <div style={{position:"relative"}}>
        <Search size={14} color={C.text3} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)"}} />
        <input
          placeholder="Search markets…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            width:"100%",background:C.card,border:`1px solid ${C.border}`,
            borderRadius:10,padding:"11px 12px 11px 36px",color:C.text,
            fontSize:13,outline:"none",boxSizing:"border-box"
          }}
        />
      </div>

      {/* Category filter */}
      <div style={{display:"flex",gap:6,overflowX:"auto",paddingBottom:4}}>
        {CATS.map(c => (
          <button key={c} onClick={() => setCat(c)} style={{
            flexShrink:0,fontSize:11,fontWeight:800,padding:"6px 12px",borderRadius:6,
            border:"none",cursor:"pointer",transition:"all .15s",
            background: c===cat ? C.gold : `${C.gold}14`,
            color: c===cat ? "#000" : C.text3
          }}>{c}</button>
        ))}
      </div>

      {/* Instruments list */}
      <Card style={{padding:"0 16px"}}>
        <div style={{fontSize:11,color:C.text3,padding:"12px 0",letterSpacing:"0.06em"}}>
          {filtered.length} INSTRUMENTS
        </div>
        {filtered.map((inst,i) => (
          <div key={i}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"13px 0",cursor:"pointer"}}>
              <div style={{display:"flex",flexDirection:"column"}}>
                <div style={{fontWeight:800,fontSize:13,color:C.text}}>{inst.pair}</div>
                <div style={{fontSize:11,color:C.text3,marginTop:2}}>{inst.name}</div>
              </div>
              <div style={{textAlign:"right"}}>
                <div style={{fontWeight:800,fontSize:14,color:C.text}}>{inst.price}</div>
                <div style={{fontSize:11,fontWeight:800,color:inst.up?C.green:C.red,marginTop:2}}>
                  {inst.up?"↗":"↘"} {inst.pct}
                </div>
              </div>
            </div>
            {i<filtered.length-1 && <GoldLine />}
          </div>
        ))}
        {filtered.length===0 && (
          <div style={{padding:"30px 0",textAlign:"center",color:C.text3,fontSize:13}}>
            No instruments found
          </div>
        )}
      </Card>

      <LiveTicker />
    </div>
  );
};

// ─── Trading Page ─────────────────────────────────────────────────────────────
const TradingPage = () => {
  const [activeTab, setActiveTab] = useState("1m");
  const tabs = ["1m","5m","15m","1h","4h","D"];

  const candleData = Array.from({length:40},(_,i) => {
    const base = 4680 + Math.sin(i*.4)*40 + i*1.2;
    const open = base + (Math.random()-.5)*10;
    const close = open + (Math.random()-.5)*15;
    return { i, open, close, high: Math.max(open,close)+(Math.random()*8), low: Math.min(open,close)-(Math.random()*8) };
  });

  const lineData = candleData.map(d => ({ i: d.i, v: (d.open+d.close)/2 }));

  const stats = [
    { val:"$2.4B+", label:"Daily Volume"    },
    { val:"150K+",  label:"Active Traders"  },
    { val:"200+",   label:"Trading Pairs"   },
    { val:"24/7",   label:"Support"         },
  ];

  const infraCards = [
    { icon:TrendingUp, title:"Advanced Trading",   desc:"Institutional-grade tools and real-time analytics" },
    { icon:Shield,     title:"Bank-Level Security",desc:"Multi-layer encryption and cold storage protection" },
    { icon:Zap,        title:"Lightning Execution",desc:"Sub-millisecond order routing across deep liquidity" },
    { icon:Globe,      title:"Global Access",      desc:"Trade 24/7 across forex, crypto and commodities"   },
  ];

  const steps = [
    { n:"01", icon:Users,           title:"Register Your Account", desc:"Create a secure account in minutes. Provide your email, set a strong password, and verify your identity." },
    { n:"02", icon:TrendingUp,      title:"Deposit Funds",         desc:"Fund your account using bank transfers, credit cards, and cryptocurrency deposits." },
    { n:"03", icon:BarChart2,       title:"Start Trading",         desc:"Access real-time market data, execute trades across multiple asset classes with advanced tools." },
    { n:"04", icon:ArrowUpFromLine, title:"Withdraw Profits",      desc:"Easily withdraw your earnings through your preferred payment method. Fast processing." },
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      {/* Hero */}
      <div style={{
        background:`linear-gradient(160deg, #1a0f00 0%, ${C.bg} 60%)`,
        borderRadius:16,border:`1px solid ${C.gold}22`,
        padding:"28px 20px",position:"relative",overflow:"hidden"
      }}>
        <div style={{
          position:"absolute",top:-20,right:-20,width:120,height:120,
          background:`radial-gradient(${C.gold}22,transparent 70%)`,borderRadius:"50%"
        }} />
        <div style={{
          fontSize:11,color:C.green,letterSpacing:"0.14em",
          display:"flex",alignItems:"center",gap:6,marginBottom:16
        }}>
          <span style={{width:6,height:6,borderRadius:"50%",background:C.green,display:"inline-block"}} />
          System Online // Live Data
        </div>
        <div style={{
          fontSize:42,fontWeight:900,lineHeight:1.05,letterSpacing:"-0.02em",marginBottom:18
        }}>
          <div style={{color:C.text}}>PRECISION</div>
          <div style={{color:C.gold}}>VELOCITY</div>
          <div style={{color:C.text}}>INSIGHT.</div>
        </div>
        <div style={{
          borderLeft:`3px solid ${C.gold}`,paddingLeft:14,
          fontSize:13,color:C.text2,lineHeight:1.7,marginBottom:20
        }}>
          Experience access to institutional-grade trading infrastructure engineered for precision,
          performance, and global market reach across Forex, Crypto, Futures, Commodities, and NFT ecosystems.
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          <button style={{
            background:C.text,color:"#000",border:"none",borderRadius:10,
            padding:"13px 20px",fontWeight:900,fontSize:13,cursor:"pointer",
            letterSpacing:"0.06em"
          }}>INITIALIZE TRADING</button>
          <button style={{
            background:C.purple,color:"#fff",border:"none",borderRadius:10,
            padding:"13px 20px",fontWeight:900,fontSize:13,cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",gap:8
          }}>
            EXPLORE MARKETS
            <div style={{
              width:22,height:22,borderRadius:"50%",border:"2px solid #ffffff55",
              display:"grid",placeItems:"center"
            }}>
              <div style={{width:8,height:8,borderRadius:"50%",border:"2px solid #fff"}} />
            </div>
          </button>
        </div>
      </div>

      {/* Mini chart */}
      <Card>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:12}}>
          <div>
            <div style={{fontWeight:800,fontSize:14,color:C.text}}>S&P 500</div>
            <div style={{fontSize:11,color:C.text3}}>Live Chart</div>
          </div>
          <div style={{display:"flex",gap:5}}>
            {tabs.map(t => (
              <button key={t} onClick={() => setActiveTab(t)} style={{
                fontSize:10,fontWeight:800,padding:"4px 8px",borderRadius:5,border:"none",cursor:"pointer",
                background: t===activeTab ? C.gold : `${C.gold}14`,
                color: t===activeTab ? "#000" : C.text3
              }}>{t}</button>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={130}>
          <AreaChart data={lineData} margin={{left:-30,right:0,top:4,bottom:0}}>
            <defs>
              <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={C.gold} stopOpacity={0.2} />
                <stop offset="100%" stopColor={C.gold} stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="i" hide />
            <YAxis domain={["dataMin - 20","dataMax + 20"]} />
            <Tooltip contentStyle={{background:C.card2,border:`1px solid ${C.border2}`,borderRadius:8,fontSize:11}}
              formatter={v => [v.toFixed(2),"Price"]} labelFormatter={() => ""} />
            <ReferenceLine y={4700} stroke={C.green} strokeDasharray="3 3" strokeWidth={1} />
            <Area type="monotone" dataKey="v" stroke={C.gold} strokeWidth={2} fill="url(#cg)" dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      {/* Stats strip */}
      <div style={{
        background:`linear-gradient(135deg,#130c00,#0d0800)`,
        border:`1px solid ${C.gold}2a`,borderRadius:14,
        display:"grid",gridTemplateColumns:"repeat(4,1fr)",padding:"14px 8px"
      }}>
        {stats.map(s => (
          <div key={s.label} style={{textAlign:"center"}}>
            <div style={{fontSize:15,fontWeight:900,color:C.gold}}>{s.val}</div>
            <div style={{fontSize:9,color:C.text3,textTransform:"uppercase",letterSpacing:"0.06em",marginTop:2}}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* 4 Steps */}
      <Card>
        <SectionTag>Quick Start</SectionTag>
        <div style={{fontWeight:900,fontSize:19,color:C.text,marginBottom:4}}>
          Get Started in <span style={{color:C.gold}}>Four Simple Steps</span>
        </div>
        <div style={{fontSize:12,color:C.text3,marginBottom:16,lineHeight:1.5}}>
          Follow our streamlined onboarding process to register, deposit, trade, and withdraw with ease.
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
          {steps.map((s,i) => (
            <div key={i} style={{
              background:C.card2,border:`1px solid ${C.gold}22`,
              borderRadius:12,padding:"14px 12px",
              position:"relative",overflow:"hidden",
              boxShadow:`inset 0 0 0 1px ${C.gold}0a`
            }}>
              {/* Corner brackets */}
              {[["top","left"],["bottom","right"]].map(([v,h]) => (
                <div key={`${v}${h}`} style={{
                  position:"absolute",[v]:0,[h]:0,
                  width:12,height:12,
                  borderTop: v==="top"?`2px solid ${C.gold}`:undefined,
                  borderBottom: v==="bottom"?`2px solid ${C.gold}`:undefined,
                  borderLeft: h==="left"?`2px solid ${C.gold}`:undefined,
                  borderRight: h==="right"?`2px solid ${C.gold}`:undefined,
                }} />
              ))}
              <div style={{fontSize:22,fontWeight:900,color:`${C.gold}20`,lineHeight:1,marginBottom:8}}>
                {s.n}
              </div>
              <IconBox icon={s.icon} color={C.gold} size={14} boxSize={30} />
              <div style={{fontSize:12,fontWeight:800,color:C.text,marginTop:8,marginBottom:4}}>{s.title}</div>
              <div style={{fontSize:11,color:C.text3,lineHeight:1.5}}>{s.desc}</div>
            </div>
          ))}
        </div>
        <button style={{
          width:"100%",marginTop:14,padding:"13px 0",borderRadius:10,
          background:C.purple,border:"none",color:"#fff",fontWeight:900,
          fontSize:13,cursor:"pointer",letterSpacing:"0.06em",
          display:"flex",alignItems:"center",justifyContent:"center",gap:8
        }}>
          START YOUR JOURNEY <ChevronRight size={16} />
        </button>
      </Card>

      {/* Infra */}
      <Card>
        <SectionTag>Core Architecture</SectionTag>
        <div style={{fontWeight:900,fontSize:19,color:C.text,marginBottom:4}}>
          Enterprise-Grade <span style={{color:C.gold}}>Infrastructure.</span>
        </div>
        <div style={{fontSize:12,color:C.text3,marginBottom:16,lineHeight:1.6}}>
          Built on cutting-edge technology to deliver unmatched performance, security, and reliability.
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:10}}>
          {infraCards.map((ic,i) => (
            <div key={i} style={{
              background:C.card2,border:`1px solid ${C.border}`,
              borderRadius:12,padding:"14px 14px",
              display:"flex",alignItems:"flex-start",gap:12
            }}>
              <IconBox icon={ic.icon} color={C.gold} size={16} boxSize={38} />
              <div>
                <div style={{fontWeight:800,fontSize:13,color:C.text,marginBottom:4}}>{ic.title}</div>
                <div style={{fontSize:12,color:C.text3,lineHeight:1.5}}>{ic.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
};

// ─── Settings Page ────────────────────────────────────────────────────────────
const SettingsPage = () => {
  const groups = [
    {
      title: "Platform",
      items: [
        { icon:BarChart2, label:"Markets",         sub:"View all trading pairs" },
        { icon:TrendingUp,label:"Trading",         sub:"Configure trading preferences" },
        { icon:BookOpen,  label:"Support Center",  sub:"Help and documentation" },
      ]
    },
    {
      title: "Account",
      items: [
        { icon:Eye,      label:"Dashboard",         sub:"View performance overview" },
        { icon:Lock,     label:"Security Settings", sub:"2FA and login management" },
        { icon:Bell,     label:"Notifications",     sub:"Alerts and push settings" },
      ]
    },
    {
      title: "Resources",
      items: [
        { icon:BookOpen, label:"Trading Guide",  sub:"Learn trading strategies" },
        { icon:Award,    label:"Market Analysis",sub:"Expert insights and reports" },
      ]
    }
  ];

  return (
    <div style={{display:"flex",flexDirection:"column",gap:14}}>
      <div style={{padding:"20px 0 4px"}}>
        <div style={{fontSize:22,fontWeight:900,color:C.text}}>Account</div>
        <div style={{fontSize:12,color:C.text3,marginTop:4}}>Manage your profile and platform settings</div>
      </div>

      {/* Profile card */}
      <Card style={{
        background:`linear-gradient(160deg, #1a1000, ${C.card})`,
        border:`1px solid ${C.gold}33`
      }}>
        <div style={{display:"flex",alignItems:"center",gap:14}}>
          <div style={{
            width:54,height:54,borderRadius:13,
            background:`linear-gradient(135deg,${C.gold},${C.goldDim})`,
            display:"grid",placeItems:"center"
          }}>
            <span style={{fontSize:18,fontWeight:900,color:"#000"}}>PT</span>
          </div>
          <div>
            <div style={{fontWeight:900,fontSize:16,color:C.text,letterSpacing:"0.04em"}}>GOLDEN VAULT XM</div>
            <div style={{fontSize:10,color:C.text3,letterSpacing:"0.14em",marginTop:2}}>CHAIN</div>
          </div>
        </div>
        <div style={{fontSize:13,color:C.text2,lineHeight:1.7,margin:"14px 0"}}>
          Enterprise-grade trading platform providing access to global financial markets with institutional-level security and performance.
        </div>
        <GoldLine />
        <div style={{display:"flex",flexDirection:"column",gap:9,marginTop:12}}>
          {[
            [Mail,  "support@primetraderchain.com"],
            [Phone, "24/7 Trading Desk"],
            [MapPin,"Global Trading Hub"],
          ].map(([Icon,val]) => (
            <div key={val} style={{display:"flex",alignItems:"center",gap:10}}>
              <Icon size={13} color={C.gold} />
              <span style={{fontSize:13,color:C.text2}}>{val}</span>
            </div>
          ))}
        </div>
      </Card>

      {groups.map(group => (
        <Card key={group.title} style={{padding:"4px 0"}}>
          <div style={{fontWeight:800,fontSize:13,color:C.text3,padding:"14px 16px 10px",
            textTransform:"uppercase",letterSpacing:"0.1em"}}>
            {group.title}
          </div>
          {group.items.map((item,i) => (
            <div key={item.label}>
              <div style={{
                display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"12px 16px",cursor:"pointer"
              }}>
                <div style={{display:"flex",alignItems:"center",gap:12}}>
                  <IconBox icon={item.icon} color={C.gold} size={14} boxSize={34} />
                  <div>
                    <div style={{fontSize:13,fontWeight:700,color:C.text}}>{item.label}</div>
                    <div style={{fontSize:11,color:C.text3,marginTop:1}}>{item.sub}</div>
                  </div>
                </div>
                <ChevronRight size={13} color={C.text4} />
              </div>
              {i<group.items.length-1 && <div style={{margin:"0 16px"}}><GoldLine /></div>}
            </div>
          ))}
        </Card>
      ))}

      {/* Sign out */}
      <button style={{
        display:"flex",alignItems:"center",justifyContent:"center",gap:10,
        padding:"14px",background:C.card,border:`1px solid ${C.border}`,
        borderRadius:14,cursor:"pointer",color:C.red,fontWeight:800,fontSize:13,
        letterSpacing:"0.04em"
      }}>
        <LogOut size={16} />Sign Out
      </button>
    </div>
  );
};

// ─── Dashboard Home ───────────────────────────────────────────────────────────
const DashboardPage = () => (
  <div style={{display:"flex",flexDirection:"column",gap:14}}>
    {/* Welcome */}
    <div style={{padding:"20px 0 4px"}}>
      <div style={{fontSize:11,color:C.text3,letterSpacing:"0.12em",textTransform:"uppercase",marginBottom:6}}>
        Trading Overview
      </div>
      <div style={{fontSize:24,fontWeight:900,color:C.text,lineHeight:1.15}}>
        Welcome Back,
      </div>
      <div style={{fontSize:24,fontWeight:900,color:C.gold,lineHeight:1.15}}>
        goldenvaultxm
      </div>
      <div style={{
        fontSize:13,color:"#7c3aed",marginTop:8,fontStyle:"italic",
        letterSpacing:"0.01em"
      }}>
        Here's your trading overview for today
      </div>
    </div>

    {/* Stats */}
    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
      <StatCard icon={Wallet}     label="Total Balance"    value="$0.00"  badge="+5.2%"  color={C.green} />
      <StatCard icon={TrendingUp} label="Total Profit"     value="$0.00"  badge="+11.2%" color={C.green} />
      <StatCard icon={Activity}   label="Active Positions" value="0"      badge="+3"     color={C.gold}  />
      <StatCard icon={Target}     label="Win Rate"         value="0.0%"   badge="+2.3%"  color={C.gold}  />
    </div>

    <PortfolioChart />
    <LiveTicker />
    <QuickActions />
    <AccountStatus />
    <PortfolioHoldings />
    <MarketSentiment />
  </div>
);

// ─── Navigation ───────────────────────────────────────────────────────────────
const Nav = ({ page, setPage, open, setOpen }) => {
  const navItems = [
    { id:"dashboard", label:"Dashboard", icon:Home       },
    { id:"markets",   label:"Markets",   icon:BarChart2  },
    { id:"trading",   label:"Trading",   icon:TrendingUp },
    { id:"settings",  label:"Settings",  icon:Settings   },
  ];

  return (
    <header style={{
      position:"sticky",top:0,zIndex:100,
      background:`${C.bg}f0`,backdropFilter:"blur(16px)",
      borderBottom:`1px solid ${C.border}`,
      padding:"0 16px",height:58,
      display:"flex",alignItems:"center",justifyContent:"space-between"
    }}>
      <div style={{display:"flex",alignItems:"center",gap:10}}>
        <div style={{
          width:36,height:36,borderRadius:9,
          background:`linear-gradient(135deg,${C.gold} 0%,${C.goldDim} 100%)`,
          display:"grid",placeItems:"center",flexShrink:0
        }}>
          <Zap size={17} color="#000" fill="#000" />
        </div>
        <div>
          <div style={{fontWeight:900,fontSize:12,color:C.gold,letterSpacing:"0.1em"}}>GOLDEN VAULT XM</div>
          <div style={{fontSize:9,color:C.text3,letterSpacing:"0.2em"}}>ELITE TRADING</div>
        </div>
      </div>

      <div style={{display:"flex",alignItems:"center",gap:2}}>
        <button style={{background:"none",border:"none",cursor:"pointer",color:C.text3,
          padding:8,display:"grid",placeItems:"center"}}>
          <Bell size={17} />
        </button>
        <button onClick={() => setOpen(!open)} style={{background:"none",border:"none",
          cursor:"pointer",color:C.text2,padding:8,display:"grid",placeItems:"center"}}>
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div style={{
          position:"fixed",top:58,left:0,right:0,bottom:0,
          background:`${C.bg}f8`,backdropFilter:"blur(20px)",zIndex:200,
          padding:"24px 20px 32px",display:"flex",flexDirection:"column",gap:2
        }}>
          {navItems.map(n => (
            <button key={n.id} onClick={() => { setPage(n.id); setOpen(false); }} style={{
              display:"flex",alignItems:"center",gap:14,padding:"15px 14px",
              background: page===n.id ? `${C.gold}12` : "none",
              border:"none",borderRadius:12,cursor:"pointer",
              borderLeft: page===n.id ? `3px solid ${C.gold}` : `3px solid transparent`
            }}>
              <n.icon size={18} color={page===n.id ? C.gold : C.text3} />
              <span style={{fontSize:17,fontWeight:800,color:page===n.id?C.text:C.text3}}>
                {n.label}
              </span>
            </button>
          ))}
          <div style={{marginTop:"auto"}}>
            <GoldLine />
            <button style={{display:"flex",alignItems:"center",gap:14,padding:"15px 14px",
              background:"none",border:"none",cursor:"pointer",width:"100%"}}>
              <LogOut size={18} color={C.text3} />
              <span style={{fontSize:14,fontWeight:700,color:C.text3}}>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

// ─── Bottom Tab Bar ───────────────────────────────────────────────────────────
const BottomNav = ({ page, setPage }) => {
  const tabs = [
    { id:"dashboard", icon:Home,      label:"Home"    },
    { id:"markets",   icon:BarChart2, label:"Markets" },
    { id:"trading",   icon:Zap,       label:"Trade"   },
    { id:"settings",  icon:Settings,  label:"More"    },
  ];
  return (
    <nav style={{
      position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
      width:"100%",maxWidth:480,
      background:`${C.bg}f2`,backdropFilter:"blur(16px)",
      borderTop:`1px solid ${C.border}`,
      display:"flex",padding:"8px 0 24px",zIndex:50
    }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => setPage(t.id)} style={{
          flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:4,
          background:"none",border:"none",cursor:"pointer",padding:"4px 0",transition:"all .15s"
        }}>
          <div style={{
            width:t.id===page?36:28,height:t.id===page?36:28,
            borderRadius:t.id===page?10:8,
            background: t.id===page ? `${C.gold}20` : "transparent",
            display:"grid",placeItems:"center",transition:"all .2s"
          }}>
            <t.icon size={18} color={t.id===page ? C.gold : C.text4} />
          </div>
          <span style={{fontSize:10,fontWeight:800,
            color:t.id===page?C.gold:C.text4,letterSpacing:"0.04em",
            transition:"all .15s"
          }}>{t.label}</span>
        </button>
      ))}
    </nav>
  );
};

// ─── Root App ─────────────────────────────────────────────────────────────────
export default function GoldenVaultXM() {
  const [page, setPage] = useState("dashboard");
  const [menuOpen, setMenuOpen] = useState(false);

  const pages = {
    dashboard: <TradingPage />,
    markets:   <MarketsPage />,
    trading:   <DashboardPage />,
    settings:  <SettingsPage />,
  };

  return (
    <div style={{
      minHeight:"100vh",background:C.bg,color:C.text,
      fontFamily:"'DM Sans','Sora',system-ui,sans-serif",
      maxWidth:480,margin:"0 auto",position:"relative",
      WebkitFontSmoothing:"antialiased"
    }}>
      <style>{`
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { display:none; }
        input::placeholder { color: #404040; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
      `}</style>

      {/* Ambient glow */}
      <div style={{
        position:"fixed",top:0,left:"50%",transform:"translateX(-50%)",
        width:300,height:300,
        background:`radial-gradient(${C.gold}08 0%, transparent 70%)`,
        pointerEvents:"none",zIndex:0
      }} />

      <div style={{position:"relative",zIndex:1}}>
        <Nav page={page} setPage={setPage} open={menuOpen} setOpen={setMenuOpen} />
        <main style={{padding:"0 16px",paddingBottom:100,minHeight:"calc(100vh - 58px)"}}>
          {pages[page]}
        </main>
        <BottomNav page={page} setPage={setPage} />
      </div>
    </div>
  );
}
