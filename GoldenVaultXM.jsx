    { id:"markets",  label:"Markets",  icon:BarChart2 },
    { id:"trade",    label:"Trade",    icon:Activity  },
    { id:"more",     label:"More",     icon:Settings  },
  ];

  const handleNav = (id) => {
    if (id === "trade" && !isAuthenticated) {
      requireAuth("login");
    } else {
      setPage(id);
    }
  };

  return (
    <>
      {/* Top Header */}
      <header style={{
        position:"sticky", top:0, zIndex:100, background:`${C.bg}f0`,
        backdropFilter:"blur(10px)", borderBottom:`1px solid ${C.border}`,
        padding:"12px 16px", display:"flex", alignItems:"center", justifyContent:"space-between"
      }}>
        <div style={{ display:"flex", alignItems:"center", gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:6, background:C.gold, display:"grid", placeItems:"center" }}>
            <Zap size={14} color="#000" fill="#000" />
          </div>
          <div style={{ fontWeight:900, fontSize:12, color:C.text, letterSpacing:"0.05em" }}>GOLDEN VAULT</div>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:16 }}>
          {isAuthenticated ? (
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
               <div style={{ fontSize:11, color:C.text3 }}>{user.name}</div>
               <button onClick={logout} style={{ background:"none", border:"none", cursor:"pointer", color:C.red }}>
                 <LogOut size={16} />
               </button>
            </div>
          ) : (
            <button onClick={() => requireAuth("login")} style={{
              background:C.card, border:`1px solid ${C.border}`, color:C.gold,
              padding:"6px 12px", borderRadius:6, fontSize:11, fontWeight:800, cursor:"pointer"
            }}>LOGIN</button>
          )}
        </div>
      </header>

      {/* Bottom Mobile Nav */}
      <nav style={{
        position:"fixed", bottom:0, left:0, right:0, background:C.card,
        borderTop:`1px solid ${C.border}`, padding:"10px 0", display:"flex",
        justifyContent:"space-around", zIndex:99
      }}>
        {NAV.map(item => (
          <button key={item.id} onClick={() => handleNav(item.id)} style={{
            background:"none", border:"none", display:"flex", flexDirection:"column",
            alignItems:"center", gap:4, cursor:"pointer", color: page === item.id ? C.gold : C.text3
          }}>
            <item.icon size={20} />
            <span style={{ fontSize:9, fontWeight:700 }}>{item.label}</span>
          </button>
        ))}
      </nav>
    </>
  );
}

export default function GoldenVaultXM() {
  const [page, setPage] = useState("home");
  
  return (
    <AuthProvider>
      <div style={{
        minHeight:"100vh", background:C.bg, color:C.text,
        display:"flex", flexDirection:"column", maxWidth:"600px",
        margin:"0 auto", width:"100%"
      }}>
        <Nav page={page} setPage={setPage} />
        <main style={{ flex:1, padding:"20px 16px", paddingBottom:80 }}>
          {/* Page Routing */}
          {page === "home" && <div style={{ fontSize:20, fontWeight:900 }}>Welcome to the Vault</div>}
          {page === "markets" && <div style={{ fontSize:20, fontWeight:900 }}>Markets List...</div>}
          {page === "trade" && <div style={{ fontSize:20, fontWeight:900 }}>Trade Dashboard</div>}
        </main>
      </div>
    </AuthProvider>
  );
      }
