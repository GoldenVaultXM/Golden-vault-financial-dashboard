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
 *       referral_code text unique,   -- optional; falls back to "GV" + first 6 chars of user id
 *       updated_at timestamptz default now()
 *   • storage bucket named "avatars" with public read policy
 */

import { useState, useEffect, useRef, useCallback } from "react";
import {
  User, Mail, Phone, MapPin, Edit3, Camera, Lock, KeyRound,
  CheckCircle2, AlertCircle, RefreshCw, Eye, EyeOff, ArrowLeft,
  Shield, Sparkles, Save, X, Send, Check, Copy,
  ShieldCheck, FileText, Upload, Clock, XCircle, ChevronRight, ChevronLeft,
  ChevronDown, Globe,
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
    transition: "all .2s", fontFamily: "inherit", colorScheme: "dark",
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

/* ─── KYC / Identity verification ──────────────────────────────────────── */
const KYC_BUCKET = "kyc-documents";   // PRIVATE bucket — see kyc_setup.sql
const MAX_FILE_MB = 10;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "application/pdf"];

// ISO 3166-1 alpha-2. Add codes here if compliance restricts residents of a jurisdiction.
const RESTRICTED_COUNTRIES = [];

const ISO_COUNTRIES = ("AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ " +
  "CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR " +
  "GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP " +
  "KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ " +
  "NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW " +
  "SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ " +
  "UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW").split(" ");

const COUNTRY_OPTIONS = (() => {
  let dn = null;
  try { dn = new Intl.DisplayNames(["en"], { type: "region" }); } catch { /* old webview */ }
  return ISO_COUNTRIES
    .map(code => ({ value: code, label: (dn && dn.of(code)) || code }))
    .sort((a, b) => a.label.localeCompare(b.label));
})();

const DOC_TYPES = [
  { id: "passport", label: "Passport", needsBack: false },
  { id: "national_id", label: "National ID", needsBack: true },
  { id: "drivers_license", label: "Driver's License", needsBack: true },
];

const KYC_STEPS = ["Personal details", "Residential address", "Identity document", "Selfie & proof of address", "Review & submit"];

const KYC_STATUS = {
  none:     { label: "Not verified", color: C.text3, Icon: Shield },
  pending:  { label: "In review",    color: C.gold2, Icon: Clock },
  approved: { label: "Verified",     color: C.green, Icon: ShieldCheck },
  rejected: { label: "Action needed", color: C.red,  Icon: XCircle },
};

const newId = () =>
  (typeof crypto !== "undefined" && crypto.randomUUID)
    ? crypto.randomUUID()
    : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, c => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });

const ageFrom = (iso) => {
  const d = new Date(iso);
  if (isNaN(d)) return NaN;
  const now = new Date();
  let a = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) a--;
  return a;
};

const SelectField = ({ label, icon: Icon, value, onChange, options, placeholder = "Select…" }) => {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: "0.06em" }}>{label}</label>
      <div style={{ position: "relative" }}>
        <Icon size={14} color={focused ? C.gold : C.text4}
          style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
        <select
          value={value} onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: "100%", background: focused ? C.card3 : C.card2,
            border: `1.5px solid ${focused ? C.gold + "66" : C.border2}`,
            borderRadius: 12, padding: "13px 38px 13px 40px",
            color: value ? C.text : C.text3, fontSize: 13, outline: "none",
            boxSizing: "border-box", fontFamily: "inherit", colorScheme: "dark",
            appearance: "none", WebkitAppearance: "none", transition: "all .2s",
          }}>
          <option value="">{placeholder}</option>
          {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <ChevronDown size={14} color={C.text3}
          style={{ position: "absolute", right: 13, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }} />
      </div>
    </div>
  );
};

const FilePicker = ({ label, hint, file, onPick, accept = "image/*,application/pdf", capture }) => {
  const ref = useRef();
  const [preview, setPreview] = useState(null);
  useEffect(() => {
    if (file && file.type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      setPreview(url);
      return () => URL.revokeObjectURL(url);
    }
    setPreview(null);
  }, [file]);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: "0.06em" }}>{label}</label>
      <button type="button" onClick={() => ref.current?.click()} style={{
        display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left",
        background: C.card2, border: `1.5px dashed ${file ? C.green + "66" : C.border2}`,
        borderRadius: 12, padding: "12px 14px", cursor: "pointer", color: C.text,
      }}>
        <div style={{ width: 44, height: 44, borderRadius: 10, background: C.card3, flexShrink: 0,
          display: "grid", placeItems: "center", overflow: "hidden" }}>
          {preview
            ? <img src={preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : file ? <FileText size={18} color={C.green} /> : <Upload size={18} color={C.text3} />}
        </div>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: file ? C.text : C.text2,
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {file ? file.name : "Tap to upload"}
          </div>
          <div style={{ fontSize: 11, color: C.text3, marginTop: 2 }}>
            {file ? `${(file.size / 1048576).toFixed(1)} MB · tap to replace` : hint}
          </div>
        </div>
        {file && <CheckCircle2 size={16} color={C.green} />}
      </button>
      <input ref={ref} type="file" accept={accept} capture={capture} style={{ display: "none" }}
        onChange={e => { const f = e.target.files?.[0]; if (f) onPick(f); e.target.value = ""; }} />
    </div>
  );
};

function KycSection({ authUser, fullName, onToast }) {
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [submission, setSubmission] = useState(null);
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef();

  const [form, setForm] = useState(() => {
    const [first = "", ...rest] = (fullName || "").trim().split(/\s+/);
    return {
      first_name: first, last_name: rest.join(" "), dob: "", nationality: "",
      country: "", address_line1: "", address_line2: "", city: "", region: "", postal_code: "",
      doc_type: "passport", doc_number: "", doc_expiry: "", consent: false,
    };
  });
  const [files, setFiles] = useState({ front: null, back: null, selfie: null, address_proof: null });
  const set = k => v => setForm(f => ({ ...f, [k]: v }));
  const docType = DOC_TYPES.find(d => d.id === form.doc_type);

  /* Load latest submission */
  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error: err } = await supabase
        .from("kyc_submissions")
        .select("id,status,rejection_reason,created_at,reviewed_at")
        .eq("user_id", authUser.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!alive) return;
      if (err) setUnavailable(true); else setSubmission(data);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [authUser.id]);

  const scrollToCard = () =>
    setTimeout(() => cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);

  const pickFile = key => file => {
    if (!ALLOWED_MIME.includes(file.type)) { setError("Use a JPG, PNG, WebP or PDF file."); return; }
    if (file.size > MAX_FILE_MB * 1048576) { setError(`File is too large (max ${MAX_FILE_MB} MB).`); return; }
    setError("");
    setFiles(f => ({ ...f, [key]: file }));
  };

  /* Per-step validation → returns an error string or "" */
  const validate = (s) => {
    const nameOk = v => /^[\p{L}][\p{L}\s'’.-]*$/u.test(v.trim());
    if (s === 0) {
      if (!nameOk(form.first_name)) return "Enter your first name exactly as on your ID.";
      if (!nameOk(form.last_name)) return "Enter your last name exactly as on your ID.";
      const age = ageFrom(form.dob);
      if (isNaN(age)) return "Enter your date of birth.";
      if (age < 18) return "You must be at least 18 years old.";
      if (age > 120) return "Check your date of birth.";
      if (!form.nationality) return "Select your nationality.";
    }
    if (s === 1) {
      if (!form.country) return "Select your country of residence.";
      if (RESTRICTED_COUNTRIES.includes(form.country)) return "We can't verify residents of this country at the moment.";
      if (form.address_line1.trim().length < 3) return "Enter your street address.";
      if (!form.city.trim()) return "Enter your city.";
      if (!form.postal_code.trim()) return "Enter your postal / ZIP code.";
    }
    if (s === 2) {
      if (form.doc_number.trim().length < 4) return "Enter the document number.";
      if (!form.doc_expiry || new Date(form.doc_expiry) <= new Date()) return "Your document must not be expired.";
      if (!files.front) return docType.needsBack ? "Upload the front of your document." : "Upload your passport photo page.";
      if (docType.needsBack && !files.back) return "Upload the back of your document.";
    }
    if (s === 3) {
      if (!files.selfie) return "Take or upload a selfie.";
      if (!files.address_proof) return "Upload a proof of address.";
    }
    if (s === 4 && !form.consent) return "Please confirm the declaration to continue.";
    return "";
  };

  const next = () => {
    const err = validate(step);
    if (err) { setError(err); return; }
    setError(""); setStep(s => s + 1); scrollToCard();
  };
  const back = () => { setError(""); setStep(s => Math.max(0, s - 1)); scrollToCard(); };

  const submit = async () => {
    for (let s = 0; s <= 4; s++) {
      const err = validate(s);
      if (err) { setStep(s); setError(err); return; }
    }
    setSubmitting(true); setError("");

    const id = newId();
    const base = `${authUser.id}/${id}`;
    const toUpload = [
      ["doc_front_path", "front", files.front],
      ...(docType.needsBack ? [["doc_back_path", "back", files.back]] : []),
      ["selfie_path", "selfie", files.selfie],
      ["address_proof_path", "address_proof", files.address_proof],
    ];

    const paths = {};
    const uploaded = [];
    for (const [col, name, file] of toUpload) {
      const ext = (file.name.split(".").pop() || "bin").toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${base}/${name}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(KYC_BUCKET).upload(path, file, { upsert: false, contentType: file.type });
      if (upErr) {
        if (uploaded.length) await supabase.storage.from(KYC_BUCKET).remove(uploaded);
        setError("Upload failed: " + upErr.message);
        setSubmitting(false);
        return;
      }
      uploaded.push(path);
      paths[col] = path;
    }

    const { error: insErr } = await supabase.from("kyc_submissions").insert({
      id,
      user_id: authUser.id,
      status: "pending",
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      date_of_birth: form.dob,
      nationality: form.nationality,
      country: form.country,
      address_line1: form.address_line1.trim(),
      address_line2: form.address_line2.trim() || null,
      city: form.city.trim(),
      region: form.region.trim() || null,
      postal_code: form.postal_code.trim(),
      doc_type: form.doc_type,
      doc_number: form.doc_number.trim(),
      doc_expiry: form.doc_expiry,
      consent_at: new Date().toISOString(),
      ...paths,
    });

    if (insErr) {
      await supabase.storage.from(KYC_BUCKET).remove(uploaded);
      const dup = insErr.code === "23505";
      setError(dup ? "You already have a verification in progress." : "Submission failed: " + insErr.message);
      setSubmitting(false);
      return;
    }

    setSubmission({ id, status: "pending", created_at: new Date().toISOString() });
    setOpen(false); setStep(0);
    setFiles({ front: null, back: null, selfie: null, address_proof: null });
    onToast({ msg: "Documents submitted for review", type: "success" });
    setSubmitting(false);
  };

  const status = submission?.status || "none";
  const S = KYC_STATUS[status];
  const primaryBtn = {
    flex: 1, background: C.gold, border: "none", borderRadius: 12, padding: "14px",
    color: "#000", fontSize: 14, fontWeight: 900, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
  };
  const ghostBtn = {
    background: C.card2, border: `1px solid ${C.border2}`, borderRadius: 12,
    padding: "14px 16px", color: C.text2, fontSize: 13, fontWeight: 700, cursor: "pointer",
    display: "flex", alignItems: "center", gap: 5,
  };
  const row = (k, v) => (
    <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
      <span style={{ fontSize: 12, color: C.text3 }}>{k}</span>
      <span style={{ fontSize: 12, fontWeight: 700, color: C.text2, textAlign: "right", wordBreak: "break-word" }}>{v}</span>
    </div>
  );
  const countryName = code => COUNTRY_OPTIONS.find(c => c.value === code)?.label || code;

  return (
    <div ref={cardRef} style={{ scrollMarginTop: 12 }}>
      <Card>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <div style={{ width: 34, height: 34, borderRadius: 9, background: `${C.gold}22`,
              display: "grid", placeItems: "center", flexShrink: 0 }}>
              <ShieldCheck size={15} color={C.gold} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: C.text }}>Identity Verification</div>
              <div style={{ fontSize: 11, color: C.text3 }}>KYC · Know Your Customer</div>
            </div>
          </div>
          {!loading && !unavailable && (
            <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "5px 10px", borderRadius: 40,
              background: `${S.color}14`, border: `1px solid ${S.color}44`, flexShrink: 0 }}>
              <S.Icon size={11} color={S.color} />
              <span style={{ fontSize: 11, fontWeight: 800, color: S.color }}>{S.label}</span>
            </div>
          )}
        </div>

        {loading && <div style={{ height: 60, borderRadius: 12, background: C.card2, animation: "shimmer 1.5s ease-in-out infinite" }} />}

        {!loading && unavailable && (
          <div style={{ fontSize: 12, color: C.text3, lineHeight: 1.6 }}>
            Identity verification isn't available right now. Please try again later.
          </div>
        )}

        {/* Idle states */}
        {!loading && !unavailable && !open && (
          <>
            {status === "none" && (
              <>
                <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.6, marginBottom: 14 }}>
                  Verify your identity to secure your account and meet regulatory requirements. It takes about 5 minutes.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
                  {["Government-issued photo ID", "A selfie", "Proof of address (last 3 months)"].map(t => (
                    <div key={t} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                      <CheckCircle2 size={13} color={C.text4} />
                      <span style={{ fontSize: 12, color: C.text3 }}>{t}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
            {status === "pending" && (
              <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.6 }}>
                Your documents were submitted{submission?.created_at ? ` on ${new Date(submission.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""} and
                are being reviewed. Check back here for updates.
              </div>
            )}
            {status === "approved" && (
              <div style={{ fontSize: 13, color: C.text2, lineHeight: 1.6 }}>
                Your identity has been verified{submission?.reviewed_at ? ` on ${new Date(submission.reviewed_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}.
              </div>
            )}
            {status === "rejected" && (
              <div style={{ padding: "10px 13px", background: `${C.red}12`, border: `1px solid ${C.red}33`,
                borderRadius: 10, marginBottom: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: C.red, marginBottom: 3 }}>Verification was not approved</div>
                <div style={{ fontSize: 12, color: C.text2, lineHeight: 1.5 }}>
                  {submission?.rejection_reason || "Please resubmit with clear, valid documents."}
                </div>
              </div>
            )}
            {(status === "none" || status === "rejected") && (
              <button onClick={() => { setOpen(true); setStep(0); setError(""); scrollToCard(); }}
                style={{ ...primaryBtn, width: "100%", flex: "none" }}>
                {status === "rejected" ? "Resubmit verification" : "Start verification"} <ChevronRight size={15} />
              </button>
            )}
          </>
        )}

        {/* Form */}
        {!loading && !unavailable && open && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Progress */}
            <div>
              <div style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                {KYC_STEPS.map((_, i) => (
                  <div key={i} style={{ flex: 1, height: 3, borderRadius: 3,
                    background: i <= step ? C.gold : C.card3, transition: "background .3s" }} />
                ))}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: C.text }}>{KYC_STEPS[step]}</span>
                <span style={{ fontSize: 11, color: C.text3 }}>Step {step + 1} of {KYC_STEPS.length}</span>
              </div>
            </div>

            {step === 0 && (
              <>
                <Field label="First name (as on ID)" icon={User} value={form.first_name} onChange={set("first_name")} placeholder="First name" />
                <Field label="Last name (as on ID)" icon={User} value={form.last_name} onChange={set("last_name")} placeholder="Last name" />
                <Field label="Date of birth" icon={Clock} type="date" value={form.dob} onChange={set("dob")}
                  hint="You must be 18 or older" />
                <SelectField label="Nationality" icon={Globe} value={form.nationality} onChange={set("nationality")}
                  options={COUNTRY_OPTIONS} />
              </>
            )}

            {step === 1 && (
              <>
                <SelectField label="Country of residence" icon={Globe} value={form.country} onChange={set("country")}
                  options={COUNTRY_OPTIONS} />
                <Field label="Address line 1" icon={MapPin} value={form.address_line1} onChange={set("address_line1")} placeholder="Street and number" />
                <Field label="Address line 2 (optional)" icon={MapPin} value={form.address_line2} onChange={set("address_line2")} placeholder="Apartment, suite, etc." />
                <Field label="City" icon={MapPin} value={form.city} onChange={set("city")} placeholder="City" />
                <Field label="State / Region (optional)" icon={MapPin} value={form.region} onChange={set("region")} placeholder="State or region" />
                <Field label="Postal / ZIP code" icon={MapPin} value={form.postal_code} onChange={set("postal_code")} placeholder="Postal code" />
              </>
            )}

            {step === 2 && (
              <>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: "0.06em", marginBottom: 8 }}>Document type</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {DOC_TYPES.map(d => {
                      const on = form.doc_type === d.id;
                      return (
                        <button key={d.id} type="button"
                          onClick={() => { set("doc_type")(d.id); if (!d.needsBack) setFiles(f => ({ ...f, back: null })); }}
                          style={{ flex: 1, padding: "11px 6px", borderRadius: 11, cursor: "pointer",
                            background: on ? `${C.gold}18` : C.card2,
                            border: `1.5px solid ${on ? C.gold + "88" : C.border2}`,
                            color: on ? C.gold2 : C.text3, fontSize: 11.5, fontWeight: 800, lineHeight: 1.3 }}>
                          {d.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <Field label="Document number" icon={FileText} value={form.doc_number} onChange={set("doc_number")} placeholder="Document number" />
                <Field label="Expiry date" icon={Clock} type="date" value={form.doc_expiry} onChange={set("doc_expiry")} />
                <FilePicker label={docType.needsBack ? "Front of document" : "Passport photo page"}
                  hint="All four corners visible, no glare · JPG, PNG, WebP or PDF"
                  file={files.front} onPick={pickFile("front")} />
                {docType.needsBack && (
                  <FilePicker label="Back of document" hint="All four corners visible, no glare"
                    file={files.back} onPick={pickFile("back")} />
                )}
              </>
            )}

            {step === 3 && (
              <>
                <FilePicker label="Selfie" hint="Face clearly visible, good lighting, no hat or sunglasses"
                  accept="image/*" capture="user" file={files.selfie} onPick={pickFile("selfie")} />
                <FilePicker label="Proof of address" hint="Utility bill or bank statement dated within 3 months"
                  file={files.address_proof} onPick={pickFile("address_proof")} />
              </>
            )}

            {step === 4 && (
              <>
                <div style={{ display: "flex", flexDirection: "column", gap: 9, padding: "12px 14px",
                  background: C.card2, border: `1px solid ${C.border}`, borderRadius: 12 }}>
                  {row("Name", `${form.first_name.trim()} ${form.last_name.trim()}`)}
                  {row("Date of birth", form.dob)}
                  {row("Nationality", countryName(form.nationality))}
                  {row("Address", [form.address_line1, form.address_line2, form.city, form.region, form.postal_code, countryName(form.country)].map(s => s.trim()).filter(Boolean).join(", "))}
                  {row("Document", `${docType.label} · •••• ${form.doc_number.trim().slice(-4)}`)}
                  {row("Expires", form.doc_expiry)}
                  {row("Files", `${Object.values(files).filter(Boolean).length} uploaded`)}
                </div>
                <label style={{ display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer" }}>
                  <input type="checkbox" checked={form.consent} onChange={e => set("consent")(e.target.checked)}
                    style={{ marginTop: 2, width: 16, height: 16, accentColor: C.gold, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: C.text2, lineHeight: 1.55 }}>
                    I confirm the information and documents I provided are accurate and genuine, and I consent to
                    Golden Vault XM processing my personal data and identity documents for verification and
                    regulatory compliance.
                  </span>
                </label>
              </>
            )}

            {error && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 12px",
                background: `${C.red}12`, border: `1px solid ${C.red}33`, borderRadius: 9 }}>
                <AlertCircle size={12} color={C.red} style={{ flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: C.red }}>{error}</span>
              </div>
            )}

            <div style={{ display: "flex", gap: 8 }}>
              {step > 0
                ? <button onClick={back} disabled={submitting} style={ghostBtn}><ChevronLeft size={14} /> Back</button>
                : <button onClick={() => { setOpen(false); setError(""); }} style={ghostBtn}><X size={14} /> Cancel</button>}
              {step < KYC_STEPS.length - 1
                ? <button onClick={next} style={primaryBtn}>Continue <ChevronRight size={15} /></button>
                : <button onClick={submit} disabled={submitting}
                    style={{ ...primaryBtn, opacity: submitting ? 0.7 : 1, cursor: submitting ? "not-allowed" : "pointer" }}>
                    {submitting
                      ? <><RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} /> Uploading…</>
                      : <><ShieldCheck size={15} /> Submit for review</>}
                  </button>}
            </div>

            <div style={{ fontSize: 10.5, color: C.text3, lineHeight: 1.5, textAlign: "center" }}>
              🔒 Documents are uploaded over an encrypted connection to private storage and used only for identity verification.
            </div>
          </div>
        )}
      </Card>
    </div>
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
  const [referralCode, setReferralCode] = useState("");
  const [copied, setCopied] = useState(false);

  /* ── Copy referral code ── */
  const handleCopyReferral = async () => {
    if (!referralCode) return;
    try {
      await navigator.clipboard.writeText(referralCode);
    } catch {
      // Fallback for browsers / webviews without the Clipboard API
      const ta = document.createElement("textarea");
      ta.value = referralCode;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch {}
      document.body.removeChild(ta);
    }
    setCopied(true);
    setToast({ msg: "Referral code copied!", type: "success" });
    setTimeout(() => setCopied(false), 2000);
  };

  /* ── Load user + profile ── */
  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }
      setAuthUser(user);

      // Fallback referral code derived from the user id (stable, unique enough)
      const derivedCode = "GV" + user.id.replace(/-/g, "").slice(0, 6).toUpperCase();

      // Try fetching profile row
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      // Use profiles.referral_code if the column exists and is filled, else fallback
      setReferralCode(
        data?.referral_code || user.user_metadata?.referral_code || derivedCode
      );

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

    // Also update auth display name
    await supabase.auth.updateUser({
      data: { full_name: profile.full_name },
    });

    if (error) {
      setToast({ msg: "Save failed: " + error.message, type: "error" });
    } else {
      setOriginal({ ...profile });
      setEditMode(false);
      setToast({ msg: "Profile saved!", type: "success" });
    }
    setSaving(false);
  };

  const isDirty = JSON.stringify(profile) !== JSON.stringify(original);

  /* ── Membership badge from created_at ── */
  const memberSince = authUser?.created_at
    ? new Date(authUser.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;

  /* ── Loading skeleton ── */
  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "20px 0" }}>
        {[96, 60, 120, 200].map((h, i) => (
          <div key={i} style={{
            height: h, borderRadius: 16, background: C.card,
            border: `1px solid ${C.border}`,
            animation: "shimmer 1.5s ease-in-out infinite",
          }} />
        ))}
        <style>{`@keyframes shimmer{0%,100%{opacity:.3}50%{opacity:.7}}`}</style>
      </div>
    );
  }

  /* ── Not authenticated ── */
  if (!authUser) {
    return (
      <div style={{ padding: "40px 0", textAlign: "center" }}>
        <div style={{ fontSize: 40, marginBottom: 14 }}>🔐</div>
        <div style={{ fontSize: 16, fontWeight: 800, color: C.text, marginBottom: 8 }}>
          Sign in to view your profile
        </div>
        <div style={{ fontSize: 13, color: C.text3 }}>
          Create an account or log in to access your profile.
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shimmer { 0%,100%{opacity:.3} 50%{opacity:.7} }
        @keyframes slideUp { from{opacity:0;transform:translate(-50%,16px)} to{opacity:1;transform:translate(-50%,0)} }
        input::placeholder, textarea::placeholder { color: #404040; }
        textarea { resize: vertical; }
      `}</style>

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />}

      {/* ── Header ── */}
      <div style={{ padding: "20px 0 4px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 11, color: C.text3, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 5 }}>
            Account
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: C.text }}>
            My <span style={{ color: C.gold }}>Profile</span>
          </div>
        </div>
        <button
          onClick={() => {
            if (editMode) { setProfile({ ...original }); setEditMode(false); }
            else setEditMode(true);
          }}
          style={{
            background: editMode ? `${C.red}14` : `${C.gold}14`,
            border: `1px solid ${editMode ? C.red + "44" : C.gold + "44"}`,
            borderRadius: 10, padding: "8px 14px", cursor: "pointer",
            display: "flex", alignItems: "center", gap: 6,
            fontSize: 12, fontWeight: 800,
            color: editMode ? C.red : C.gold,
          }}>
          {editMode ? <><X size={13} /> Cancel</> : <><Edit3 size={13} /> Edit</>}
        </button>
      </div>

      {/* ── Avatar + name card ── */}
      <Card style={{
        background: `linear-gradient(160deg, #1a0f00, ${C.card})`,
        border: `1px solid ${C.gold}28`,
      }}>
        <AvatarUploader
          avatarUrl={profile.avatar_url}
          fullName={profile.full_name}
          uploading={uploading}
          onUpload={handleAvatarUpload}
        />

        {/* Membership badge */}
        {memberSince && (
          <div style={{
            display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            marginTop: 14, padding: "7px 16px",
            background: `${C.gold}10`, border: `1px solid ${C.gold}28`,
            borderRadius: 40,
          }}>
            <Sparkles size={11} color={C.gold} />
            <span style={{ fontSize: 11, fontWeight: 700, color: C.gold }}>
              Member since {memberSince}
            </span>
          </div>
        )}
      </Card>

      {/* ── Personal info ── */}
      <Card>
        <SectionLabel>Personal Information</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Field
            label="Full Name" icon={User}
            value={profile.full_name}
            onChange={v => setProfile(p => ({ ...p, full_name: v }))}
            placeholder="Your full name"
            disabled={!editMode}
          />
          <Field
            label="Username" icon={User}
            value={profile.username}
            onChange={v => setProfile(p => ({ ...p, username: v }))}
            placeholder="@username"
            disabled={!editMode}
            hint="Visible to other traders"
          />
          <Field
            label="Bio" icon={Edit3}
            value={profile.bio}
            onChange={v => setProfile(p => ({ ...p, bio: v }))}
            placeholder="Tell other traders about yourself…"
            disabled={!editMode}
            multiline
          />
        </div>
      </Card>

      {/* ── Contact info ── */}
      <Card>
        <SectionLabel>Contact Details</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Email — always read-only (must go via Supabase auth flow to change) */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontSize: 11, fontWeight: 700, color: C.text3, letterSpacing: "0.06em" }}>
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <Mail size={14} color={C.text4}
                style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)" }} />
              <input
                value={authUser.email}
                disabled
                readOnly
                style={{
                  width: "100%", background: C.card2,
                  border: `1.5px solid ${C.border}`,
                  borderRadius: 12, padding: "13px 14px 13px 40px",
                  color: C.text3, fontSize: 13, outline: "none",
                  boxSizing: "border-box", fontFamily: "inherit",
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: C.text4, paddingLeft: 2 }}>
              Email is managed through your login credentials
            </div>
          </div>

          <Field
            label="Phone Number" icon={Phone}
            value={profile.phone}
            onChange={v => setProfile(p => ({ ...p, phone: v }))}
            placeholder="+1 (555) 000-0000"
            disabled={!editMode}
            type="tel"
          />
          <Field
            label="Location" icon={MapPin}
            value={profile.location}
            onChange={v => setProfile(p => ({ ...p, location: v }))}
            placeholder="City, Country"
            disabled={!editMode}
          />
        </div>
      </Card>

      {/* ── Save button ── */}
      {editMode && (
        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          style={{
            width: "100%", background: isDirty ? C.gold : C.card2,
            border: `1px solid ${isDirty ? C.gold : C.border}`,
            borderRadius: 13, padding: "15px",
            color: isDirty ? "#000" : C.text3,
            fontSize: 15, fontWeight: 900, cursor: saving || !isDirty ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 9,
            opacity: saving ? 0.7 : 1, transition: "all .2s",
          }}>
          {saving
            ? <><RefreshCw size={15} style={{ animation: "spin 1s linear infinite" }} /> Saving…</>
            : <><Save size={15} /> Save Changes</>
          }
        </button>
      )}

      {/* ── Security / Password ── */}
      <PasswordSection userEmail={authUser.email} />

      {/* ── KYC / Identity verification ── */}
      <KycSection
        authUser={authUser}
        fullName={original?.full_name || profile.full_name}
        onToast={setToast}
      />

      {/* ── Account meta info ── */}
      <Card style={{ padding: "14px 18px" }}>
        <SectionLabel>Account Info</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            ["User ID", authUser.id?.slice(0, 18) + "…"],
            ["Account Type", authUser.app_metadata?.provider === "google" ? "Google OAuth" : "Email / Password"],
            ["Email Verified", authUser.email_confirmed_at ? "✅ Verified" : "⚠️ Not verified"],
            ["Joined", memberSince || "—"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: C.text3 }}>{k}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: C.text2, fontFamily: k === "User ID" ? "monospace" : "inherit" }}>
                {v}
              </span>
            </div>
          ))}

          {/* Referral code with copy button */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: C.text3 }}>Referral Code</span>
            <button
              onClick={handleCopyReferral}
              title="Tap to copy"
              style={{
                display: "flex", alignItems: "center", gap: 7,
                background: `${C.gold}14`, border: `1px solid ${C.gold}33`,
                borderRadius: 8, padding: "5px 10px", cursor: "pointer",
              }}>
              <span style={{
                fontSize: 12, fontWeight: 800, color: C.gold2,
                fontFamily: "monospace", letterSpacing: "0.08em",
              }}>
                {referralCode || "—"}
              </span>
              {copied
                ? <Check size={12} color={C.green} />
                : <Copy size={12} color={C.gold} />}
            </button>
          </div>
        </div>
      </Card>

      {/* Bottom padding for nav */}
      <div style={{ height: 20 }} />
    </div>
  );
}
