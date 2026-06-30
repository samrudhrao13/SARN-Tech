// src/pages/SuperAdmin/SuperAdminDashboard.jsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../config/apiClient";

export default function SuperAdminDashboard() {
  const [name, setName]               = useState("");
  const [role, setRole]               = useState("user");
  const [userId, setUserId]           = useState("");
  const [tempPassword, setTempPassword] = useState("");
  const [message, setMessage]         = useState("");
  const [loading, setLoading]         = useState(false);
  const [stats, setStats]             = useState({ total: 0, admins: 0, users: 0, online: 0 });
  const navigate = useNavigate();

  useEffect(() => { loadStats(); }, []);

  async function loadStats() {
    try {
      const [usersRes, liveRes] = await Promise.all([
        api.get("/users"),
        api.get("/users/live-count"),
      ]);
      if (usersRes.data.ok) {
        const all = usersRes.data.users;
        setStats({
          total:  all.length,
          admins: all.filter(u => u.role === "admin").length,
          users:  all.filter(u => u.role === "user").length,
          online: liveRes.data.ok ? liveRes.data.count : 0,
        });
      }
    } catch {}
  }

  async function createUser() {
    setMessage("");
    setUserId("");
    setTempPassword("");
    if (!name.trim()) { setMessage("error:Name is required"); return; }

    setLoading(true);
    try {
      const res = await api.post("/auth/create-user", { name: name.trim(), role });
      const data = res.data;
      if (!data.ok) { setMessage("error:" + (data.error || "Failed to create user")); return; }
      setUserId(data.userId);
      setTempPassword(data.tempPassword);
      setMessage("success:User created successfully!");
      setName("");
      setRole("user");
      loadStats();
    } catch {
      setMessage("error:Server error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const isError   = message.startsWith("error:");
  const isSuccess = message.startsWith("success:");
  const msgText   = message.replace(/^(error|success):/, "");

  const quickLinks = [
    { label: "Manage Users",  icon: "👥", path: "/super-admin/users",        color: "#eff6ff", border: "#bfdbfe", iconBg: "#dbeafe" },
    { label: "Attendance",    icon: "📅", path: "/super-admin/attendance",   color: "#f0fdf4", border: "#bbf7d0", iconBg: "#dcfce7" },
    { label: "Reports",       icon: "📊", path: "/super-admin/reports",      color: "#fdf4ff", border: "#e9d5ff", iconBg: "#ede9fe" },
    { label: "Notifications", icon: "🔔", path: "/super-admin/notifications",color: "#fffbeb", border: "#fde68a", iconBg: "#fef3c7" },
    { label: "Calls & Meetings", icon: "📞", path: "/super-admin/calls",     color: "#fff1f2", border: "#fecdd3", iconBg: "#ffe4e6" },
  ];

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* ── Page header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "#0f172a", margin: 0 }}>
          Super Admin Dashboard
        </h1>
        <p style={{ color: "#64748b", fontSize: 13.5, marginTop: 5 }}>
          Manage users, monitor attendance, and oversee platform operations.
        </p>
      </div>

      {/* ── Stat cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
        <StatCard label="Total Users"   value={stats.total}  icon="👤" color="#2563eb" bg="#eff6ff" />
        <StatCard label="Admins"        value={stats.admins} icon="🛡" color="#7c3aed" bg="#f5f3ff" />
        <StatCard label="Users"         value={stats.users}  icon="👥" color="#0891b2" bg="#ecfeff" />
        <StatCard label="Online Now"    value={stats.online} icon="🟢" color="#16a34a" bg="#f0fdf4" />
      </div>

      {/* ── Main row ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

        {/* Create User card */}
        <div style={card}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: "#eff6ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>➕</div>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a" }}>Create New User</div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>Add an admin or user to the platform</div>
            </div>
          </div>

          <label style={labelStyle}>Full Name</label>
          <input
            style={inputStyle}
            placeholder="e.g. John Smith"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === "Enter" && createUser()}
            onFocus={e => e.target.style.borderColor = "#2563eb"}
            onBlur={e => e.target.style.borderColor = "#e2e8f0"}
          />

          <label style={labelStyle}>Role</label>
          <select
            style={{ ...inputStyle, cursor: "pointer" }}
            value={role}
            onChange={e => setRole(e.target.value)}
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>

          <button
            style={{
              width: "100%", padding: "12px", marginTop: 4,
              background: loading ? "#93c5fd" : "#2563eb",
              color: "#fff", border: "none", borderRadius: 10,
              fontSize: 14, fontWeight: 700, cursor: loading ? "not-allowed" : "pointer",
              transition: "background 0.2s",
            }}
            onClick={createUser}
            disabled={loading}
          >
            {loading ? "Creating…" : "Create User"}
          </button>

          {/* Message */}
          {message && (
            <div style={{
              marginTop: 14, padding: "12px 14px", borderRadius: 9, fontSize: 13, fontWeight: 500,
              background: isSuccess ? "#f0fdf4" : "#fef2f2",
              border: `1px solid ${isSuccess ? "#bbf7d0" : "#fecaca"}`,
              color: isSuccess ? "#15803d" : "#b91c1c",
            }}>
              {isSuccess ? "✅" : "⚠"} {msgText}
            </div>
          )}

          {/* Credentials box */}
          {userId && (
            <div style={{
              marginTop: 14, padding: "14px 16px", borderRadius: 10,
              background: "#f8fafc", border: "1px solid #e2e8f0",
            }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5 }}>
                New Credentials
              </div>
              <div style={credRow}>
                <span style={credLabel}>User ID</span>
                <span style={credValue}>{userId}</span>
              </div>
              <div style={credRow}>
                <span style={credLabel}>Temp Password</span>
                <span style={credValue}>{tempPassword}</span>
              </div>
              <div style={{ fontSize: 11.5, color: "#94a3b8", marginTop: 8 }}>
                User must log in and reset their password.
              </div>
            </div>
          )}
        </div>

        {/* Quick links card */}
        <div style={card}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", marginBottom: 4 }}>Quick Access</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 18 }}>Navigate to any section</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {quickLinks.map(q => (
              <button
                key={q.label}
                onClick={() => navigate(q.path)}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "12px 14px", borderRadius: 10,
                  background: q.color, border: `1px solid ${q.border}`,
                  cursor: "pointer", width: "100%", textAlign: "left",
                  transition: "transform 0.1s, box-shadow 0.1s",
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = "translateX(3px)"; e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)"; }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateX(0)"; e.currentTarget.style.boxShadow = "none"; }}
              >
                <div style={{ width: 34, height: 34, borderRadius: 8, background: q.iconBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, flexShrink: 0 }}>
                  {q.icon}
                </div>
                <span style={{ fontSize: 13.5, fontWeight: 600, color: "#0f172a" }}>{q.label}</span>
                <span style={{ marginLeft: "auto", color: "#94a3b8", fontSize: 16 }}>→</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ── */

function StatCard({ label, value, icon, color, bg }) {
  return (
    <div style={{
      background: "#fff", border: "1px solid #e2e8f0", borderRadius: 14,
      padding: "18px 20px", display: "flex", alignItems: "center", gap: 14,
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 24, fontWeight: 800, color, lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: 12, color: "#64748b", marginTop: 2, fontWeight: 500 }}>{label}</div>
      </div>
    </div>
  );
}

/* ── Styles ── */

const card = {
  background: "#fff", borderRadius: 14,
  border: "1px solid #e2e8f0", padding: "24px",
  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
};

const labelStyle = {
  display: "block", fontSize: 12.5, fontWeight: 600,
  color: "#374151", marginBottom: 6, marginTop: 12,
};

const inputStyle = {
  width: "100%", padding: "11px 14px", boxSizing: "border-box",
  border: "1.5px solid #e2e8f0", borderRadius: 10,
  fontSize: 14, fontFamily: "inherit", color: "#0f172a",
  background: "#fafafa", outline: "none", transition: "border-color 0.15s",
};

const credRow = {
  display: "flex", justifyContent: "space-between",
  alignItems: "center", padding: "5px 0",
  borderBottom: "1px solid #f1f5f9",
};

const credLabel = { fontSize: 12, color: "#64748b", fontWeight: 500 };
const credValue = { fontSize: 13, fontWeight: 700, color: "#0f172a", fontFamily: "monospace" };
