import { useState, createContext, useContext } from "react";
import { supabase } from './supabaseClient';
import { X, Zap, RefreshCw, Eye, EyeOff, CheckCircle2 } from "lucide-react";

/* ─── Auth Context ───────────────────────────────────────────────────────── */
const AuthContext = createContext(null);
const useAuth = () => useContext(AuthContext);

/* ─── Design Tokens ──────────────────────────────────────────────────────── */
const C = {
  bg: "#080808",
  card: "#0f0f0f",
  card2: "#141414",
  border: "#222222",
  border2: "#2a2a2a",
  gold: "#d97706",
  goldDim: "#92400e",
  text: "#ffffff",
  text2: "#a3a3a3",
  text3: "#525252",
};

/* ─── Google Icon Component ──────────────────────────────────────────────── */
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);

export default function AuthModal({ onClose, initialMode = "signup" }) {
  const { login } = useAuth();
  const [mode, setMode] = useState(initialMode);
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [agreed, setAgreed] = useState(false);
  const [form, setForm] = useState({ name: "", email: "", password: "" });

  /* ── Google OAuth: Trigger Only ── */
  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) { 
      setError(error.message); 
      setGoogleLoading(false); 
    }
  };

  /* ── Email / Password Auth ── */
  const handleEmailAuth = async () => {
    setError("");
    if (mode === "signup" && !agreed) { setError("Please agree to the Terms."); return; }
    if (!form.email || !form.password) { setError("Please fill in all fields."); return; }
    
    setLoading(true);
    let authError = null;
    
    if (mode === "signup") {
      const { error, data } = await supabase.auth.signUp({ 
        email: form.email, 
        password: form.password, 
        options: { data: { full_name: form.name } } 
      });
      authError = error;
      if (!error && data.user) login({ name: form.name || form.email.split("@")[0], email: form.email });
    } else {
      const { error, data } = await supabase.auth.signInWithPassword({ 
        email: form.email, 
        password: form.password 
      });
      authError = error;
      if (!error && data.user) login({ name: data.user.user_metadata?.full_name || form.email.split("@")[0], email: form.email });
    }
    
    if (authError) { 
      setError(authError.message); 
      setLoading(false); 
    } else {
      onClose();
    }
  };

  const inp = { width: "100%", background: C.card2, border: `1px solid ${C.border2}`, borderRadius: 12, padding: "13px 14px", color: C.text, fontSize: 13, outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", backdropFilter: "blur(14px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 20, padding: "28px 24px 24px", width: "100%", maxWidth: 420, boxShadow: "0 32px 96px #000c" }}>
        
        <button onClick={onClose} style={{ position: "absolute", top: 16, right: 16, background: "none", border: "none", cursor: "pointer", color: C.text3 }}><X size={18} /></button>

        <div style={{ fontWeight: 900, fontSize: 24, color: C.text, marginBottom: 22 }}>{mode === "signup" ? "Create Account" : "Welcome Back"}</div>

        <button onClick={handleGoogle} disabled={googleLoading || loading} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, background: "#fff", border: "none", borderRadius: 12, padding: "13px 16px", fontWeight: 700, fontSize: 14, color: "#1a1a1a", cursor: "pointer" }}>
          {googleLoading ? <RefreshCw size={16} style={{ animation: "spin 1s linear infinite" }} /> : <GoogleIcon />}
          {googleLoading ? "Redirecting…" : "Continue with Google"}
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0" }}>
          <div style={{ flex: 1, height: 1, background: C.border2 }} />
          <span style={{ fontSize: 12, color: C.text3 }}>or</span>
          <div style={{ flex: 1, height: 1, background: C.border2 }} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
          {mode === "signup" && <input placeholder="Full Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} style={inp} />}
          <input placeholder="Email address" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={inp} />
          <div style={{ position: "relative" }}>
            <input placeholder="Password" type={showPw ? "text" : "password"} value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} style={{ ...inp, paddingRight: 46 }} />
            <button onClick={() => setShowPw(p => !p)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: C.text3 }}>{showPw ? <EyeOff size={16} /> : <Eye size={16} />}</button>
          </div>
        </div>

        {mode === "signup" && (
          <div onClick={() => setAgreed(a => !a)} style={{ display: "flex", alignItems: "flex-start", gap: 11, marginTop: 14, padding: "13px 14px", background: C.card2, borderRadius: 12, cursor: "pointer", border: `1px solid ${C.border2}` }}>
             <div style={{ width: 18, height: 18, borderRadius: 4, border: `1px solid ${agreed ? C.gold : C.border}`, display: "grid", placeItems: "center" }}>
                {agreed && <CheckCircle2 size={12} color={C.gold} />}
             </div>
             <div style={{ fontSize: 11, color: C.text2, lineHeight: 1.4 }}>I confirm I am 18+ and agree to the Terms of Service.</div>
          </div>
        )}

        {error && <div style={{ color: "red", fontSize: 12, marginTop: 10 }}>{error}</div>}

        <button onClick={handleEmailAuth} disabled={loading || googleLoading} style={{ width: "100%", background: C.gold, borderRadius: 12, padding: "13px", marginTop: 20, fontWeight: 900, cursor: "pointer" }}>
          {loading ? "Processing..." : mode === "signup" ? "Create Account" : "Sign In"}
        </button>

        <button onClick={() => setMode(m => m === "signup" ? "login" : "signup")} style={{ background: "none", border: "none", color: C.gold, fontSize: 12, marginTop: 16, width: "100%", cursor: "pointer" }}>
          {mode === "signup" ? "Already have an account? Sign In" : "Need an account? Sign Up"}
        </button>
      </div>
    </div>
  );
}

