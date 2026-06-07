/**
 * ProfilePage.jsx — Golden Vault XM
 * Drop-in replacement. Wire it up in AppShell like:
 *
 *   import ProfilePage from './ProfilePage';
 *   // in renderPage():
 *   case "profile": return <ProfilePage />;
 *
 * Also update the Nav MENU_ITEMS "Profile" onClick:
 *   onClick: () => { setPage("profile"); setOpen(false); }
 *
 * Supabase requirements:
 *   • auth.users  (built-in)
 *   • public.profiles table:
 *       id uuid references auth.users primary key,
 *       full_name text,
 *       username text,
 *       phone text,
 *       location text,
 *       bio text,
 *       avatar_url text,
 *       updated_at timestamptz default now()
 *   • storage bucket named "avatars" with public read policy
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  User, Mail, Phone, MapPin, Edit3, Camera, Lock, KeyRound,
  CheckCircle2, AlertCircle, RefreshCw, Eye, EyeOff, ArrowLeft,
  Shield, Sparkles, Save, X, Send, Check,
} from "lucide-react";
import { supabase } from "./supabaseClient";

/* ─── Design tokens (mirrors App.jsx) ──────────────────────────────────── */
const C = {
  bg: "#080808", card: "#0f0f0f", card2: "#141414", card3: "#1a1a1a",
  border: "#222222", border2: "#2a2a2a",
  gold: "#d97706", gold2: "#f59e0b", gold3: "#fbbf24", goldDim: "#92400e",
  green: "#22c55e", red: "#ef4444", purple: "#7c3aed", blue: "#3b82f6",
  text: "#ffffff", text2: "#a3a3a3", text3: "#525252", text4: "#303030",
};

/* ─── Tiny shared primitives ────────────────────────────────────────────── */
const Card = ({ children, style = {} }) => (
  <div style={{
    background: C.card, border: `1px solid ${C.border}`,
    borderRadius: 16, padding: "20px 18px", ...style,
  }}>
    {children}
  </div>
);

const SectionLabel = ({ children }) => (
  <div style={{
    fontSize: 10, fontWeight: 800, color: C.text3,
    letterSpacing: "0.14em", textTransform: "uppercase",
    marginBottom: 12, paddingLeft: 2,
  }}>
    {children}
  </div>
);

const Field = ({ label, icon: Icon, value, onChange, type = "text", placeholder, disabled, hint, multiline }) => {
  const [focused, setFocused] = useState(false);
  const baseStyle = {
    width: "100%", background: focused ? C.card3 : C.card2,
    border: `1.5px solid ${focused ? C.gold + "66" : C.border2}`,
    borderRadius: 12, padding: "13px 14px 13px 40px",
    color: disabled ? C.text3 : C.text, fontSize: 13,
    outline: "none", boxSizing: "border-box",
    transition: "all .2s", fontFamily: "inherit",
    resize: multiline ? "vertical" : "none",
    minHeight: multiline ? 80 : "auto",
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: "0.06em" }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <Icon size={14} color={focused ? C.gold : C.text4}
          style={{ position: "absolute", left: 13, top: multiline ? 15 : "50%",
            transform: multiline ? "none" : "translateY(-50%)", transition: "color .2s" }} />
        {multiline
          ? <textarea value={value} onChange={e => onChange(e.target.value)}
              placeholder={placeholder} disabled={disabled}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              style={baseStyle} />
          : <input type={type} value={value} onChange={e => onChange(e.target.value)}
              placeholder={placeholder} disabled={disabled}
              onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              style={baseStyle} />
        }
      </div>
      {hint && <div style={{ fontSize: 11, color: C.text4, paddingLeft: 2 }}>{hint}</div>}
    </div>
  );
};

const Toast = ({ msg, type = "success", onDone }) => {
  useEffect(() => {
    const t = setTimeout(onDone, 3200);
    return () => clearTimeout(t);
  }, [onDone]);
  const color = type === "success" ? C.green : C.red;
  return (
    <div style={{
      position: "fixed", bottom: 100, left: "50%", transform: "translateX(-50%)",
      background: C.card, border: `1px solid ${color}55`,
      borderRadius: 40, padding: "12px 20px",
      display: "flex", alignItems: "center", gap: 10,
      boxShadow: `0 8px 32px ${color}22`, zIndex: 9999,
      animation: "slideUp .3s ease",
      whiteSpace: "nowrap",
    }}>
      {type === "success"
        ? <Check size={15} color={color} />
        : <AlertCircle size={15} color={color} />}
      <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{msg}</span>
    </div>
  );
};

/* ─── Avatar component ──────────────────────────────────────────────────── */
function AvatarUploader({ avatarUrl, fullName, uploading, onUpload }) {
  const fileRef = useRef();
  const initials = (fullName || "GV")
    .split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, padding: "8px 0 4px" }}>
      {/* Avatar ring */}
      <div style={{ position: "relative" }}>
        <div style={{
          width: 96, height: 96, borderRadius: "50%",
          background: avatarUrl ? "transparent" : `linear-gradient(135deg, ${C.gold}, ${C.goldDim})`,
          border: `3px solid ${C.gold}55`,
          boxShadow: `0 0 0 4px ${C.gold}18, 0 8px 32px #000a`,
          display: "grid", placeItems: "center",
          overflow: "hidden", position: "relative",
        }}>
          {avatarUrl
            ? <img src={avatarUrl} alt="avatar"
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <span style={{ fontSize: 28, fontWeight: 900, color: "#000", letterSpacing: "-0.02em" }}>
                {initials}
              </span>
          }
          {uploading && (
            <div style={{
              position: "absolute", inset: 0,
              background: "#000b", display: "grid", placeItems: "center",
            }}>
              <RefreshCw size={20} color={C.gold} style={{ animation: "spin 1s linear infinite" }} />
            </div>
          )}
        </div>

        {/* Camera button */}
        <button
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          style={{
            position: "absolute", bottom: 2, right: 2,
            width: 30, height: 30, borderRadius: "50%",
            background: C.gold, border: `2px solid ${C.bg}`,
            display: "grid", placeItems: "center",
            cursor: uploading ? "not-allowed" : "pointer",
            boxShadow: "0 2px 8px #000a",
          }}>
          <Camera size={13} color="#000" />
        </button>
        <input
          ref={fileRef} type="file" accept="image/*"
          style={{ display: "none" }}
          onChange={e => { if (e.target.files?.[0]) onUpload(e.target.files[0]); }}
        />
      </div>

      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: 18, fontWeight: 900, color: C.text, letterSpacing: "-0.01em" }}>
          {fullName || "Your Name"}
        </div>
        <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, marginTop: 3, letterSpacing: "0.08em" }}>
          GOLDEN VAULT XM MEMBER
        </div>
      </div>
    </div>
  );
}

/* ─── Password section ──────────────────────────────────────────────────── */
function PasswordSection({ userEmail }) {
  const [mode, setMode] = useState("idle"); // idle | change | forgot | sent
  const [form, setForm] = useState({ current: "", next: "", confirm: "" });
  const [show, setShow] = useState({ current: false, next: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const strength = pw => {
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^A-Za-z0-9]/.test(pw)) s++;
    return s;
  };
  const str = strength(form.next);
  const strColor = ["#333", C.red, C.gold, C.gold2, C.green][str];
  const strLabel = ["", "Weak", "Fair", "Good", "Strong"][str];

  const handleChange = async () => {
    setError(""); setSuccess("");
    if (!form.current) { setError("Enter your current password."); return; }
    if (form.next.length < 8) { setError("New password must be at least 8 characters."); return; }
    if (form.next !== form.confirm) { setError("Passwords don't match."); return; }
    setLoading(true);
    // Re-authenticate then update
    const { error: signInErr } = await supabase.auth.signInWithPassword({
      email: userEmail, password: form.current,
    });
    if (signInErr) { setError("Current password is incorrect."); setLoading(false); return; }
    const { error: updateErr } = await supabase.auth.updateUser({ password: form.next });
    if (updateErr) { setError(updateErr.message); setLoading(false); return; }
    setSuccess("Password updated successfully!");
    setForm({ current: "", next: "", confirm: "" });
    setMode("idle");
    setLoading(false);
  };

  const handleForgot = async () => {
    setError(""); setLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(userEmail, {
      redirectTo: window.location.origin + "?reset=1",
    });
    if (err) { setError(err.message); setLoading(false); return; }
    setMode("sent");
    setLoading(false);
  };

  const PwField = ({ label, key_, showKey }) => {
    const [focused, setFocused] = useState(false);
    return (
      <div style={{ position: "relative" }}>
        <Lock size={13} color={focused ? C.gold : C.text4}
          style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
        <input
          type={show[showKey] ? "text" : "password"}
          placeholder={label}
          value={form[key_]}
          onChange={e => setForm(f => ({ ...f, [key_]: e.target.value }))}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: "100%", background: focused ? C.card3 : C.card2,
            border: `1.5px solid ${focused ? C.gold + "66" : C.border2}`,
            borderRadius: 12, padding: "13px 42px 13px 40px",
            color: C.text, fontSize: 13, outline: "none",
            boxSizing: "border-box", transition: "all .2s", fontFamily: "inherit",
          }}
        />
        <button
          onClick={() => setShow(s => ({ ...s, [showKey]: !s[showKey] }))}
          style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)",
            background: "none", border: "none", cursor: "pointer", color: C.text3 }}>
          {show[showKey] ? <EyeOff size={14} /> : <Eye size={14} />}
        </button>
      </div>
    );
  };

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: 9, background: `${C.purple}22`,
            display: "grid", placeItems: "center" }}>
            <Shield size={15} color={C.purple} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: C.text }}>Security</div>
            <div style={{ fontSize: 11, color: C.text3 }}>Password management</div>
          </div>
        </div>
        {mode === "idle" && (
          <button onClick={() => setMode("change")} style={{
            background: `${C.gold}14`, border: `1px solid ${C.gold}33`,
            borderRadius: 8, padding: "6px 12px", cursor: "pointer",
            fontSize: 11, fontWeight: 700, color: C.gold,
          }}>Change</button>
        )}
      </div>

      {/* Success banner */}
      {success && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 13px",
          background: `${C.green}12`, border: `1px solid ${C.green}33`,
          borderRadius: 10, marginBottom: 14 }}>
          <CheckCircle2 size={13} color={C.green} />
          <span style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>{success}</span>
        </div>
      )}

      {/* Sent state */}
      {mode === "sent" && (
        <div style={{ textAlign: "center", padding: "12px 0 4px" }}>
          <div style={{ width: 52, height: 52, borderRadius: "50%", background: `${C.green}18`,
            border: `1px solid ${C.green}44`, display: "grid", placeItems: "center", margin: "0 auto 12px" }}>
            <Send size={22} color={C.green} />
          </div>
          <div style={{ fontWeight: 800, fontSize: 15, color: C.text, marginBottom: 6 }}>Check your email</div>
          <div style={{ fontSize: 13, color: C.text3, lineHeight: 1.6, marginBottom: 16 }}>
            A password reset link was sent to<br />
            <span style={{ color: C.gold, fontWeight: 700 }}>{userEmail}</span>
          </div>
          <button onClick={() => setMode("idle")} style={{
            background: C.card2, border: `1px solid ${C.border2}`,
            borderRadius: 10, padding: "10px 20px",
            color: C.text3, fontSize: 13, fontWeight: 700, cursor: "pointer",
          }}>Done</button>
        </div>
      )}

      {/* Change password form */}
      {mode === "change" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <PwField label="Current password" key_="current" showKey="current" />
          <PwField label="New password" key_="next" showKey="next" />

          {/* Strength bar */}
          {form.next.length > 0 && (
            <div>
              <div style={{ display: "flex", gap: 4, marginBottom: 4 }}>
                {[1,2,3,4].map(i => (
                  <div key={i} style={{
                    flex: 1, height: 3, borderRadius: 3,
                    background: i <= str ? strColor : C.card3,
                    transition: "background .3s",
                  }} />
                ))}
              </div>
              <div style={{ fontSize: 10, color: strColor, fontWeight: 700 }}>{strLabel}</div>
            </div>
          )}

          <PwField label="Confirm new password" key_="confirm" showKey="confirm" />

          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px",
              background: `${C.red}12`, border: `1px solid ${C.red}33`, borderRadius: 9 }}>
              <AlertCircle size={12} color={C.red} />
              <span style={{ fontSize: 12, color: C.red }}>{error}</span>
            </div>
          )}

          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={handleChange} disabled={loading} style={{
              flex: 1, background: C.purple, border: "none",
              borderRadius: 11, padding: "13px", cursor: loading ? "not-allowed" : "pointer",
              color: "#fff", fontSize: 13, fontWeight: 800,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
              opacity: loading ? 0.7 : 1,
            }}>
              {loading ? <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> : <KeyRound size={14} />}
              {loading ? "Updating…" : "Update Password"}
            </button>
            <button onClick={() => { setMode("idle"); setError(""); setForm({ current: "", next: "", confirm: "" }); }}
              style={{ background: C.card2, border: `1px solid ${C.border2}`,
                borderRadius: 11, padding: "13px 16px", cursor: "pointer",
                color: C.text3, fontSize: 13 }}>
              <X size={15} />
            </button>
          </div>

          {/* Forgot link */}
          <button onClick={handleForgot} disabled={loading} style={{
            background: "none", border: "none", cursor: "pointer",
            color: C.gold, fontSize: 12, fontWeight: 700,
            textAlign: "center", padding: "4px 0",
          }}>
            Forgot password? Send reset email →
          </button>
        </div>
      )}

      {/* Idle state: show masked email + forgot option */}
      {mode === "idle" && !success && (
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px",
            background: C.card2, border: `1px solid ${C.border}`, borderRadius: 10 }}>
            <Mail size={13} color={C.text3} />
            <span style={{ fontSize: 13, color: C.text2 }}>{userEmail}</span>
          </div>
          <button onClick={() => { setMode("change"); setError(""); }}
            style={{ background: "none", border: "none", cursor: "pointer",
              color: C.text3, fontSize: 12, marginTop: 10, display: "flex",
              alignItems: "center", gap: 5 }}>
            <Lock size={11} />
            Forgot your password?{" "}
            <span style={{ color: C.gold, fontWeight: 700 }}>Reset via email</span>
          </button>
        </div>
      )}
    </Card>
  );
}

/* ─── Main ProfilePage ──────────────────────────────────────────────────── */
export default function ProfilePage({ onBack }) {
  const [authUser, setAuthUser] = useState(null);
  const [profile, setProfile] = useState({
    full_name: "", username: "", phone: "", location: "", bio: "", avatar_url: "",
  });
  const [original, setOriginal] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null); // { msg, type }
  const [editMode, setEditMode] = useState(false);

  /* ── Load user + profile ── */
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setAuthUser(user);

      // Try fetching profile row
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        const p = {
          full_name: data.full_name || user.user_metadata?.full_name || "",
          username: data.username || "",
          phone: data.phone || "",
          location: data.location || "",
          bio: data.bio || "",
          avatar_url: data.avatar_url || user.user_metadata?.avatar_url || "",
        };
        setProfile(p);
        setOriginal(p);
      } else {
        // No row yet — seed from auth metadata
        const p = {
          full_name: user.user_metadata?.full_name || "",
          username: "",
          phone: "",
          location: "",
          bio: "",
          avatar_url: user.user_metadata?.avatar_url || "",
        };
        setProfile(p);
        setOriginal(p);
        // Insert blank row so upsert works later
        await supabase.from("profiles").insert({ id: user.id, ...p });
      }
      setLoading(false);
    };
    load();
  }, []);

  /* ── Avatar upload ── */
  const handleAvatarUpload = useCallback(async (file) => {
    if (!authUser) return;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${authUser.id}/avatar.${ext}`;

    const { error: upErr } = await supabase.storage
      .from("avatars")
      .upload(path, file, { upsert: true });

    if (upErr) {
      setToast({ msg: "Upload failed: " + upErr.message, type: "error" });
      setUploading(false);
      return;
    }

    const { data: { publicUrl } } = supabase.storage
      .from("avatars")
      .getPublicUrl(path);

    const busted = publicUrl + "?v=" + Date.now();
    setProfile(p => ({ ...p, avatar_url: busted }));

    await supabase.from("profiles").upsert({ id: authUser.id, avatar_url: busted });
    setToast({ msg: "Photo updated!", type: "success" });
    setUploading(false);
  }, [authUser]);

  /* ── Save profile ── */
  const handleSave = async () => {
    if (!authUser) return;
    setSaving(true);

    const { error } = await supabase.from("profiles").upsert({
      id: authUser.id,
      full_name: profile.full_name,
      username: profile.username,
      phone: profile.phone,
      location: profile.location,
      bio: profile.bio,
      avatar_url: profile.avatar_url,
      updated_at: new Date().toISOString(),
    });
    await supabase.auth.updateUser({ data: { full_name: profile.full_name } });
    if (error) { setToast({ msg: "Save failed: " + error.message, type: "error" }); }
    else { setOriginal({ ...profile }); setEditMode(false); setToast({ msg: "Profile saved!", type: "success" }); }
    setSaving(false);
  };

  const isDirty = JSON.stringify(profile) !== JSON.stringify(original);
  const memberSince = authUser?.created_at ? new Date(authUser.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : null;

  if (loading) return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "20px 0" }}>
      {[96, 60, 120, 200].map((h, i) => (<div key={i} style={{ height: h, borderRadius: 16, background: "#0f0f0f", border: "1px solid #222", animation: "shimmer 1.5s ease-in-out infinite" }} />))}
      <style>{`@keyframes shimmer{0%,100%{opacity:.3}50%{opacity:.7}}`}</style>
    </div>
  );

  if (!authUser) return (
    <div style={{ padding: "40px 0", textAlign: "center" }}>
      <div style={{ fontSize: 40, marginBottom: 14 }}>🔐</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 8 }}>Sign in to view your profile</div>
      <div style={{ fontSize: 13, color: "#525252" }}>Create an account or log in to access your profile.</div>
    </div>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}} @keyframes slideUp{from{opacity:0;transform:translate(-50%,16px)}to{opacity:1;transform:translate(-50%,0)}} input::placeholder,textarea::placeholder{color:#404040} textarea{resize:vertical}`}</style>
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}
      <div style={{ padding: "20px 0 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, color: "#525252", letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 5 }}>Account</div>
          <div style={{ fontSize: 24, fontWeight: 900, color: "#fff" }}>My <span style={{ color: "#d97706" }}>Profile</span></div>
        </div>
        <button onClick={() => { if (editMode) { setProfile({ ...original }); setEditMode(false); } else setEditMode(true); }}
          style={{ background: editMode ? "#ef444414" : "#d9770614", border: `1px solid ${editMode ? "#ef444444" : "#d9770644"}`, borderRadius: 10, padding: "8px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 800, color: editMode ? "#ef4444" : "#d97706" }}>
          {editMode ? <><X size={13} /> Cancel</> : <><Edit3 size={13} /> Edit</>}
        </button>
      </div>
      <Card style={{ background: "linear-gradient(160deg, #1a0f00, #0f0f0f)", border: "1px solid #d9770628" }}>
        <AvatarUploader avatarUrl={profile.avatar_url} fullName={profile.full_name} uploading={uploading} onUpload={handleAvatarUpload} />
        {memberSince && (<div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 14, padding: "7px 16px", background: "#d9770610", border: "1px solid #d9770628", borderRadius: 40 }}><Sparkles size={11} color="#d97706" /><span style={{ fontSize: 11, fontWeight: 700, color: "#d97706" }}>Member since {memberSince}</span></div>)}
      </Card>
      <Card>
        <SectionLabel>Personal Information</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field label="Full Name" icon={User} value={profile.full_name} onChange={v => setProfile(p => ({ ...p, full_name: v }))} placeholder="Your full name" disabled={!editMode} />
          <Field label="Username" icon={User} value={profile.username} onChange={v => setProfile(p => ({ ...p, username: v }))} placeholder="@username" disabled={!editMode} hint="Visible to other traders" />
          <Field label="Bio" icon={Edit3} value={profile.bio} onChange={v => setProfile(p => ({ ...p, bio: v }))} placeholder="Tell other traders about yourself…" disabled={!editMode} multiline />
        </div>
      </Card>
      <Card>
        <SectionLabel>Contact Details</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: "#525252", letterSpacing: "0.06em" }}>Email Address</label>
            <div style={{ position: "relative" }}>
              <Mail size={14} color="#303030" style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
              <input value={authUser.email} disabled readOnly style={{ width: "100%", background: "#141414", border: "1.5px solid #222", borderRadius: 12, padding: "13px 14px 13px 40px", color: "#525252", fontSize: 13, outline: "none", boxSizing: "border-box", fontFamily: "inherit" }} />
            </div>
            <div style={{ fontSize: 11, color: "#303030", paddingLeft: 2 }}>Email is managed through your login credentials</div>
          </div>
          <Field label="Phone Number" icon={Phone} value={profile.phone} onChange={v => setProfile(p => ({ ...p, phone: v }))} placeholder="+1 (555) 000-0000" disabled={!editMode} type="tel" />
          <Field label="Location" icon={MapPin} value={profile.location} onChange={v => setProfile(p => ({ ...p, location: v }))} placeholder="City, Country" disabled={!editMode} />
        </div>
      </Card>
      {editMode && (
        <button onClick={handleSave} disabled={saving || !isDirty} style={{ width: "100%", background: isDirty ? "#d97706" : "#141414", border: `1px solid ${isDirty ? "#d97706" : "#222"}`, borderRadius: 13, padding: "15px", color: isDirty ? "#000" : "#525252", fontSize: 15, fontWeight: 900, cursor: saving || !isDirty ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 9, opacity: saving ? 0.7 : 1 }}>
          {saving ? <><RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> Saving…</> : <><Save size={15} /> Save Changes</>}
        </button>
      )}
      <PasswordSection userEmail={authUser.email} />
      <Card style={{ padding: "14px 18px" }}>
        <SectionLabel>Account Info</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[["User ID", authUser.id?.slice(0, 18) + "…"], ["Account Type", authUser.app_metadata?.provider === "google" ? "Google OAuth" : "Email / Password"], ["Email Verified", authUser.email_confirmed_at ? "✅ Verified" : "⚠️ Not verified"], ["Joined", memberSince || "—"]].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#525252" }}>{k}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#a3a3a3", fontFamily: k === "User ID" ? "monospace" : "inherit" }}>{v}</span>
            </div>
          ))}
        </div>
      </Card>
      <div style={{ height: 20 }} />
    </div>
  );
            }
