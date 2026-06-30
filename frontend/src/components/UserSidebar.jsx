// src/components/UserSidebar.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../config/apiClient";
import StatusPicker from "./StatusPicker";
import { useChatContext } from "../context/ChatContext";

export default function UserSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useChatContext();

  const process = location.pathname.startsWith("/user/dq")
    ? "DQ"
    : location.pathname.startsWith("/user/batch")
    ? "BATCH"
    : "SDS";

  const isLocked =
    location.pathname.startsWith("/user/work/") ||
    location.pathname.startsWith("/user/dq/work/") ||
    location.pathname.startsWith("/user/batch/work/");

  function switchProcess(mode) {
    if (isLocked) return;
    if (mode === "SDS")   navigate("/user/assigned-sds");
    else if (mode === "DQ")    navigate("/user/dq/tasks");
    else if (mode === "BATCH") navigate("/user/batch/tasks");
  }

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <div style={sidebar}>
      {/* ── Brand ── */}
      <div style={brandWrap}>
        <img src="/Sarn_final_logo1.png" alt="SARN" style={logoImg}
             onError={e => { e.target.style.display = "none"; }} />
        <div style={{ lineHeight: 1.3 }}>
          <div style={brandName}>SARN</div>
          <div style={brandSub}>Technologies</div>
        </div>
      </div>

      <div style={divider} />

      <div style={roleChip}>User</div>

      {/* ── Status ── */}
      <StatusPicker />

      {/* ── Process Switch ── */}
      <div style={switchRow}>
        <ProcBtn label="SDS"    active={process === "SDS"}   locked={isLocked} onClick={() => switchProcess("SDS")} />
        <ProcBtn label="Data Q" active={process === "DQ"}    locked={isLocked} onClick={() => switchProcess("DQ")} />
        <ProcBtn label="Batch"  active={process === "BATCH"} locked={isLocked} onClick={() => switchProcess("BATCH")} />
      </div>

      {/* ── Menu ── */}
      <nav style={nav}>
        {process === "SDS" && (
          <>
            <NavBtn label="Assigned SDS Work"  path="/user/assigned-sds"  active={isActive("/user/assigned-sds")} />
            <NavBtn label="Completed Work"     path="/user/completed-sds" active={isActive("/user/completed-sds")} />
            <NavBtn label="Profile"            path="/user/profile"        active={isActive("/user/profile")} />
            <NavBtn label="💬 Messages"            path="/user/messages"           active={isActive("/user/messages")} badge={unreadCount} />
          </>
        )}
        {process === "DQ" && (
          <>
            <NavBtn label="Assigned DQ Work"   path="/user/dq/tasks"      active={isActive("/user/dq/tasks")} />
            <NavBtn label="Completed DQ Work"  path="/user/dq/completed"  active={isActive("/user/dq/completed")} />
            <NavBtn label="Profile"            path="/user/profile"        active={isActive("/user/profile")} />
            <NavBtn label="💬 Messages"            path="/user/messages"           active={isActive("/user/messages")} badge={unreadCount} />
          </>
        )}
        {process === "BATCH" && (
          <>
            <NavBtn label="Assigned Batch Work" path="/user/batch/tasks"     active={isActive("/user/batch/tasks")} />
            <NavBtn label="Completed Batch"     path="/user/batch/completed" active={isActive("/user/batch/completed")} />
            <NavBtn label="Profile"             path="/user/profile"         active={isActive("/user/profile")} />
            <NavBtn label="💬 Messages"            path="/user/messages"       active={isActive("/user/messages")} />
          </>
        )}
      </nav>

      <div style={{ flex: 1 }} />
      <LogoutBtn />
    </div>
  );
}

/* ── Sub-components ── */

function NavBtn({ label, path, active, badge }) {
  const navigate = useNavigate();
  return (
    <div
      onClick={() => navigate(path)}
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "9px 12px",
        borderRadius: 8,
        marginBottom: 2,
        background: active ? "rgba(59,130,246,0.18)" : "transparent",
        borderLeft: active ? "3px solid #3b82f6" : "3px solid transparent",
        color: active ? "#fff" : "rgba(255,255,255,0.65)",
        fontSize: 13.5,
        fontWeight: active ? 600 : 400,
        cursor: "pointer",
        transition: "all 0.15s",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.06)"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      {badge > 0 && (
        <span style={{ flexShrink: 0, minWidth: 18, height: 18, borderRadius: 99, background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px", marginLeft: 6 }}>
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </div>
  );
}

function ProcBtn({ label, active, locked, onClick }) {
  return (
    <button
      onClick={onClick}
      disabled={locked}
      style={{
        flex: 1,
        background: active ? "#3b82f6" : "#1e293b",
        padding: "6px 4px",
        borderRadius: 6,
        border: "none",
        color: "white",
        cursor: locked ? "not-allowed" : "pointer",
        fontSize: 12,
        fontWeight: active ? 700 : 400,
        opacity: locked ? 0.5 : 1,
      }}
    >
      {label}
    </button>
  );
}

function LogoutBtn() {
  const navigate = useNavigate();
  async function logout() {
    try {
      const user = JSON.parse(localStorage.getItem("sarnUser"));
      if (user?.userId) await api.post("/auth/logout", { userId: user.userId });
    } catch {}
    localStorage.removeItem("sarnUser");
    localStorage.removeItem("userRole");
    localStorage.removeItem("userId");
    localStorage.removeItem("mustReset");
    navigate("/login", { replace: true });
  }
  return (
    <button onClick={logout} style={logoutBtn}>Logout</button>
  );
}

/* ── Styles ── */

const sidebar = {
  width: 230,
  height: "100vh",
  background: "linear-gradient(180deg, #0a1628 0%, #0f172a 100%)",
  borderRight: "1px solid rgba(255,255,255,0.06)",
  color: "white",
  padding: "10px 14px",
  position: "fixed",
  top: 0,
  left: 0,
  display: "flex",
  flexDirection: "column",
  boxShadow: "4px 0 24px rgba(0,0,0,0.3)",
  overflowY: "auto",
};

const brandWrap = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  padding: "0px 0px 0px",
  flexShrink: 0,
};

const logoImg = {
  width: 90,
  height: 90,
  objectFit: "contain",
  filter: "drop-shadow(0 0 10px rgba(59,130,246,0.7))",
  flexShrink: 0,
};

const brandName = {
  fontSize: 18,
  fontWeight: 800,
  color: "#fff",
  lineHeight: 1.2,
  letterSpacing: 0.5,
};

const brandSub = {
  fontSize: 12,
  fontWeight: 500,
  color: "#60a5fa",
  letterSpacing: 0.3,
  marginTop: 2,
  flexShrink: 0,
};

const divider = {
  height: 1,
  background: "rgba(255,255,255,0.07)",
  margin: "4px 0 10px",
  flexShrink: 0,
};

const roleChip = {
  display: "inline-block",
  background: "rgba(34,197,94,0.15)",
  border: "1px solid rgba(34,197,94,0.3)",
  color: "#86efac",
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: "uppercase",
  padding: "4px 10px",
  borderRadius: 20,
  marginBottom: 12,
  alignSelf: "flex-start",
  flexShrink: 0,
};

const switchRow = {
  display: "flex",
  gap: 5,
  marginBottom: 12,
  flexShrink: 0,
};

const nav = {
  display: "flex",
  flexDirection: "column",
};

const logoutBtn = {
  padding: "10px 12px",
  background: "#dc2626",
  border: "none",
  borderRadius: 8,
  color: "#fff",
  cursor: "pointer",
  fontSize: 14,
  fontWeight: 700,
  textAlign: "left",
  width: "100%",
  flexShrink: 0,
};
