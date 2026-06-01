import { useState, useEffect, createContext, useContext } from "react";
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, ReferenceLine } from "recharts";
import { Wallet, TrendingUp, Activity, Target, BarChart2, Shield, Zap, Globe, ArrowDownToLine, ArrowUpFromLine, FileBarChart, CheckCircle2, Menu, X, ChevronRight, Bell, Settings, LogOut, Home, Search, Lock, Award, BookOpen, Mail, Phone, MapPin, Eye, EyeOff, UserPlus, LogIn, AlertCircle, RefreshCw, Users } from "lucide-react";
import { supabase } from './supabaseClient';

/* ─── Design Tokens ──────────────────────────────────────────────────────── */
const C = {
  bg: "#080808",
  card: "#0f0f0f",
  card2: "#141414",
  card3: "#1a1a1a",
  border: "#222222",
  border2: "#2a2a2a",
  gold: "#d97706",
  gold2: "#f59e0b",
  gold3: "#fbbf24",
  goldDim: "#92400e",
  green: "#22c55e",
  red: "#ef4444",
  purple: "#7c3aed",
  blue: "#3b82f6",
  text: "#ffffff",
  text2: "#a3a3a3",
  text3: "#525252",
  text4: "#303030",
};

/* ─── Auth Context ───────────────────────────────────────────────────────── */
const AuthContext = createContext(null);

function AuthModal({ onClose, onLogin, initialMode = "signup" }) {
  const [mode, setMode] = useState(initialMode);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) { setError(error.message); setGoogleLoading(false); }
  };

  const handle = async () => {
    setError("");
    if (mode === "signup" && !agreed) { setError("Please confirm you are 18 or older and agree to the Terms."); return; }
    setLoading(true);
    let authError = null;
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({ email: form.email, password: form.password, options: { data: { full_name: form.name } } });
      authError = error;
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: form.email, password: form.password });
      authError = error;
    }
    if (authError) { setError(authError.message); setLoading(false); return; }
    onLogin({ name: form.name || form.email.split("@")[0], email: form.email });
    setLoading(false);
    onClose();
  };

  const inp = { width: "100%", background: C.card2, border: `1px solid ${C.border2}`, borderRadius: 12, padding: "13px 14px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", backdropFilter: "blur(14px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, overflowY: "auto" }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "28px 24px 24px", width: "100%", maxWidth: 420, position: "relative", boxShadow: "0 32px 96px #000c" }}>
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: C.text3, padding: 4 }}><X size={18} /></button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 22 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: `linear-gradient(135deg,${C.gold},${C.goldDim})`, display: "grid", placeItems: "center" }}><Zap size={20} color="#000" fill="#000" /></div>
          <div>
            <div style={{ fontWeight: 900, fontSize: 13, color: C.gold, letterSpacing: "0.12em" }}>GOLDEN VAULT XM</div>
            <div style={{ fontSize: 9, color: C.text3, letterSpacing: "0.2em", marginTop: 1 }}>ELITE TRADING</div>
          </div>
        </div>
        <div style={{ fontWeight: 900, fontSize: 24, color: C.text, marginBottom: 4 }}>{mode === "signup" ? "Create Account" : "Welcome Back"}</div>
        <div style={{ fontSize: 13, color: C.text3, marginBottom: 22, lineHeight: 1.5 }}>{mode === "signup" ? "Join thousands of institutional traders worldwide." : "Sign in to access your trading dashboard."}</div>
        <button onClick={handleGoogle} disabled={googleLoading} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#fff", border: "none", borderRadius: 12, padding: "13px 16px", fontWeight: 700, fontSize: 14, color: "#1a1a1a", cursor: googleLoading ? "not-allowed" : "pointer", opacity: googleLoading ? 0.7 : 1, transition: "opacity .2s, box-shadow .2s", boxShadow: "0 2px 8px #0004" }}>
          {googleLoading ? "Redirecting…" : "Continue with Google"}
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
          <div style={{ flex: 1, height: 1, background: C.border2 }} />
          <span style={{ fontSize: 12, color: C.text3, fontWeight: 600 }}>or</span>
          <div style={{ flex: 1, height: 1, background: C.border2 }} />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {mode === "signup" && <input placeholder="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp} />}
          <input placeholder="Email address" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inp} />
          <div style={{ position: "relative" }}>
            <input placeholder="Password" type={showPw ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} onKeyDown={e => e.key === "Enter" && handle()} style={{ ...inp, paddingRight: 46 }} />
            <button onClick={() => setShowPw(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.text3 }}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </div>
        </div>
        {mode === "signup" && (
          <div onClick={() => setAgreed(a => !a)} style={{ display: "flex", alignItems: "flex-start", gap: 11, marginTop: 14, padding: "13px 14px", background: C.card2, border: `1px solid ${agreed ? C.gold + "55" : C.border2}`, borderRadius: 12, cursor: "pointer", transition: "border-color .2s" }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${agreed ? C.gold : C.text3}`, background: agreed ? C.gold : "transparent", display: "grid", placeItems: "center", flexShrink: 0, marginTop: 1, transition: "all .15s" }}>
              {agreed && <CheckCircle2 size={11} color="#000" strokeWidth={3} />}
            </div>
            <span style={{ fontSize: 12, color: C.text2, lineHeight: 1.6 }}>
              I confirm I am <strong style={{ color: C.text }}>18 years of age or older</strong>, and I agree to the <span style={{ color: C.gold, fontWeight: 700 }}>Terms of Service</span>.
            </span>
          </div>
        )}
        {error && <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, padding: "10px 12px", background: `${C.red}14`, border: `1px solid ${C.red}33`, borderRadius: 9 }}><AlertCircle size={13} color={C.red} /><span style={{ fontSize: 12, color: C.red }}>{error}</span></div>}
        <button onClick={handle} disabled={loading || (mode === "signup" && !agreed)} style={{ width: "100%", marginTop: 16, borderRadius: 12, padding: "14px 16px", fontSize: 15, background: C.gold, color: "#000", fontWeight: 900, border: "none", cursor: "pointer" }}>
          {loading ? "Processing..." : (mode === "signup" ? "Create Account" : "Sign In")}
        </button>
        <div style={{ textAlign: "center", marginTop: 18, fontSize: 12, color: C.text3 }}>
          {mode === "signup" ? "Already have an account? " : "Don't have an account? "}
          <button onClick={() => { setMode(m => m === "signup" ? "login" : "signup"); setError(""); setAgreed(false); }} style={{ background: "none", border: "none", cursor: "pointer", color: C.gold, fontWeight: 800, fontSize: 12 }}>{mode === "signup" ? "Sign In" : "Create Account"}</button>
        </div>
      </div>
    </div>
  );
}

function AuthProvider({ children, onLogin }) {
  const [user, setUser] = useState(null);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) setUser({ name: session.user.user_metadata?.full_name || session.user.email.split("@")[0], email: session.user.email });
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) { setUser({ name: session.user.user_metadata?.full_name || session.user.email.split("@")[0], email: session.user.email }); setModal(null); if (onLogin) onLogin(); }
      if (event === "SIGNED_OUT") setUser(null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const login = (u) => { setUser(u); setModal(null); if (onLogin) onLogin(); };
  const logout = async () => { await supabase.auth.signOut(); setUser(null); };

  return (
    <AuthContext.Provider value={{ user, login, logout, setModal }}>
      {children}
      {modal && <AuthModal onClose={() => setModal(null)} onLogin={login} initialMode={modal} />}
    </AuthContext.Provider>
  );
}

export default function GoldenVaultXM() {
  // Main app entry point
  return (
    <AuthProvider>
        {/* Your AppShell / Components here */}
        <div style={{ background: C.bg, minHeight: "100vh" }}>
           {/* Rest of your existing AppShell logic */}
        </div>
    </AuthProvider>
  );
}

