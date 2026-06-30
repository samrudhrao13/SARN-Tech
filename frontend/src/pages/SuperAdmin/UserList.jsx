// src/pages/SuperAdmin/UserList.jsx
import React, { useEffect, useState, useRef } from "react";
import api from "../../config/apiClient";
import { StatusDot } from "../../components/StatusPicker";

const STATUS_MAP = {
  available: "Available", away: "Away", busy: "Busy",
  dnd: "Do Not Disturb", "in-call": "In a Call",
  presenting: "Presenting", offline: "Offline",
};

const ROLE_COLOR = {
  superadmin: { bg: "#ede9fe", text: "#6d28d9" },
  admin:      { bg: "#dbeafe", text: "#1d4ed8" },
  user:       { bg: "#f0fdf4", text: "#15803d" },
};

export default function UserList() {
  const [users, setUsers]       = useState([]);
  const [statuses, setStatuses] = useState({});
  const [error, setError]       = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [search, setSearch]     = useState("");
  const pollRef = useRef();

  useEffect(() => {
    loadUsers();
    loadStatuses();
    pollRef.current = setInterval(loadStatuses, 10000);
    return () => clearInterval(pollRef.current);
  }, []);

  async function loadUsers() {
    try {
      const res = await api.get("/users");
      if (!res.data.ok) { setError(res.data.error || "Failed to load users"); return; }
      setUsers(res.data.users);
    } catch { setError("Server error"); }
  }

  async function loadStatuses() {
    try {
      const res = await api.get("/users/statuses");
      if (res.data.ok) setStatuses(res.data.statuses);
    } catch {}
  }

  async function resetPassword(userId) {
    if (!window.confirm(`Reset password for ${userId}?`)) return;
    const res = await api.post("/super-admin/reset-password", { userId });
    if (!res.data.ok) { alert(res.data.error || "Reset failed"); return; }
    alert(`Temporary password for ${userId}:\n\n${res.data.tempPassword}`);
    loadUsers();
  }

  async function deleteUser(userId) {
    if (!window.confirm(`Delete user ${userId}? This is permanent.`)) return;
    const res = await api.post("/super-admin/delete-user", { userId });
    if (!res.data.ok) { alert(res.data.error || "Delete failed"); return; }
    loadUsers();
  }

  const q = search.trim().toLowerCase();
  const displayed = users.filter(u => {
    const roleMatch = roleFilter === "ALL" || u.role.toUpperCase() === roleFilter;
    const searchMatch = !q ||
      u.userId.toLowerCase().includes(q) ||
      u.name.toLowerCase().includes(q) ||
      u.role.toLowerCase().includes(q);
    return roleMatch && searchMatch;
  });

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 800, color: "#0f172a", margin: 0 }}>User List</h1>
        <p style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>
          Manage all users — reset passwords, change roles, or remove access.
        </p>
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, alignItems: "center", flexWrap: "wrap" }}>

        {/* Search */}
        <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
          <span style={{
            position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)",
            fontSize: 15, color: "#94a3b8", pointerEvents: "none",
          }}>🔍</span>
          <input
            type="text"
            placeholder="Search by name or User ID…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              width: "100%", padding: "10px 14px 10px 36px",
              border: "1.5px solid #e2e8f0", borderRadius: 10,
              fontSize: 13.5, fontFamily: "inherit", color: "#0f172a",
              background: "#fff", outline: "none", boxSizing: "border-box",
              transition: "border-color 0.15s",
            }}
            onFocus={e => e.target.style.borderColor = "#2563eb"}
            onBlur={e => e.target.style.borderColor = "#e2e8f0"}
          />
          {search && (
            <button onClick={() => setSearch("")} style={{
              position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)",
              background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: 16,
            }}>×</button>
          )}
        </div>

        {/* Role filter */}
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          style={{
            padding: "10px 14px", border: "1.5px solid #e2e8f0", borderRadius: 10,
            fontSize: 13.5, fontFamily: "inherit", background: "#fff",
            color: "#0f172a", cursor: "pointer", outline: "none",
          }}
        >
          <option value="ALL">All Roles</option>
          <option value="USER">User</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPERADMIN">Super Admin</option>
        </select>

        {/* Count badge */}
        <div style={{
          padding: "8px 16px", background: "#f1f5f9", borderRadius: 10,
          fontSize: 13, fontWeight: 600, color: "#475569", whiteSpace: "nowrap",
        }}>
          {displayed.length} of {users.length} users
        </div>
      </div>

      {error && (
        <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", color: "#b91c1c", fontSize: 13, marginBottom: 16 }}>
          {error}
        </div>
      )}

      {/* ── Table ── */}
      <div style={{
        background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0",
        overflow: "hidden", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
              {["User ID", "Name", "Role", "Status", "Must Reset", "Actions"].map(h => (
                <th key={h} style={{
                  padding: "12px 16px", textAlign: "left",
                  fontSize: 11.5, fontWeight: 700, color: "#64748b",
                  textTransform: "uppercase", letterSpacing: 0.6, whiteSpace: "nowrap",
                }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayed.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: "48px 16px", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
                  {search ? `No users found matching "${search}"` : "No users found"}
                </td>
              </tr>
            ) : (
              displayed.map((u, i) => {
                const s = statuses[u.userId]?.status || "available";
                const rc = ROLE_COLOR[u.role] || ROLE_COLOR.user;
                return (
                  <tr key={u.userId} style={{
                    borderBottom: "1px solid #f1f5f9",
                    background: i % 2 === 0 ? "#fff" : "#fafafa",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "#f0f7ff"}
                  onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? "#fff" : "#fafafa"}
                  >
                    {/* User ID */}
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#1e40af" }}>
                        {u.userId}
                      </span>
                    </td>

                    {/* Name */}
                    <td style={{ padding: "13px 16px", fontSize: 14, fontWeight: 500, color: "#0f172a" }}>
                      {u.name}
                    </td>

                    {/* Role */}
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{
                        display: "inline-block", padding: "3px 10px", borderRadius: 20,
                        fontSize: 11.5, fontWeight: 700,
                        background: rc.bg, color: rc.text,
                        textTransform: "capitalize",
                      }}>
                        {u.role}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                        <StatusDot status={s} size={8} />
                        <span style={{ fontSize: 13, color: "#374151" }}>{STATUS_MAP[s] || s}</span>
                      </span>
                    </td>

                    {/* Must Reset */}
                    <td style={{ padding: "13px 16px" }}>
                      <span style={{
                        display: "inline-block", padding: "3px 10px", borderRadius: 20,
                        fontSize: 11.5, fontWeight: 700,
                        background: u.mustReset ? "#fef3c7" : "#f0fdf4",
                        color: u.mustReset ? "#b45309" : "#15803d",
                      }}>
                        {u.mustReset ? "Yes" : "No"}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ padding: "13px 16px" }}>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button onClick={() => resetPassword(u.userId)} style={resetBtn}>
                          Reset Password
                        </button>
                        <button onClick={() => deleteUser(u.userId)} style={deleteBtn}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const resetBtn = {
  padding: "6px 12px",
  background: "#2563eb", color: "#fff",
  border: "none", borderRadius: 7,
  cursor: "pointer", fontSize: 12.5, fontWeight: 600,
  whiteSpace: "nowrap",
};

const deleteBtn = {
  padding: "6px 12px",
  background: "#dc2626", color: "#fff",
  border: "none", borderRadius: 7,
  cursor: "pointer", fontSize: 12.5, fontWeight: 600,
};
