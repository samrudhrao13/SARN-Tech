// src/components/AdminSidebar.jsx
import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../config/apiClient";
import { useChatContext } from "../context/ChatContext";

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useChatContext();

  const process = location.pathname.startsWith("/admin/dq")
    ? "DATA_QUEUE"
    : location.pathname.startsWith("/admin/batch")
    ? "BATCH"
    : "SDS";

  function switchProcess(mode) {
    localStorage.setItem("workflowProcess", mode);
    if (mode === "SDS")        navigate("/admin/dashboard");
    else if (mode === "DATA_QUEUE") navigate("/admin/dq/dashboard");
    else if (mode === "BATCH") navigate("/admin/batch/dashboard");
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

      <div style={roleChip}>Admin</div>

      {/* ── Process Switch ── */}
      <div style={switchRow}>
        <button onClick={() => switchProcess("SDS")}        style={processBtn(process === "SDS")}>SDS</button>
        <button onClick={() => switchProcess("DATA_QUEUE")} style={processBtn(process === "DATA_QUEUE")}>Data Q</button>
        <button onClick={() => switchProcess("BATCH")}      style={processBtn(process === "BATCH")}>Batch</button>
      </div>

      {/* ── Menu ── */}
      <nav style={nav}>
        {process === "SDS" && (
          <>
            <NavBtn label="Dashboard"        path="/admin/dashboard"     active={isActive("/admin/dashboard")} />
            <NavBtn label="Upload Business"    path="/admin/upload"        active={isActive("/admin/upload")} />
            <NavBtn label="References"       path="/admin/references"    active={isActive("/admin/references")} />
            <NavBtn label="Assign Users"     path="/admin/assign"        active={isActive("/admin/assign")} />
            <NavBtn label="Workflow Control" path="/admin/workflow"      active={isActive("/admin/workflow")} />
            <NavBtn label="Database"         path="/admin/database"      active={isActive("/admin/database")} />
            <NavBtn label="Billing"          path="/admin/sds/billing"   active={isActive("/admin/sds/billing")} />
            <NavBtn label="Reports"          path="/admin/sds/reports"   active={isActive("/admin/sds/reports")} />
            <NavBtn label="SDS Scanner"      path="/admin/sds/scanner"   active={isActive("/admin/sds/scanner")} />
            <NavBtn label="💬 Messages"          path="/admin/messages"      active={isActive("/admin/messages")} badge={unreadCount} />
          </>
        )}
        {process === "DATA_QUEUE" && (
          <>
            <NavBtn label="DQ Dashboard"     path="/admin/dq/dashboard"  active={isActive("/admin/dq/dashboard")} />
            <NavBtn label="Upload File"      path="/admin/dq/upload"     active={isActive("/admin/dq/upload")} />
            <NavBtn label="DQ List"          path="/admin/dq/list"       active={isActive("/admin/dq/list")} />
            <NavBtn label="Assign Users"     path="/admin/dq/assign"     active={isActive("/admin/dq/assign")} />
            <NavBtn label="Workflow Control" path="/admin/dq/workflow"   active={isActive("/admin/dq/workflow")} />
            <NavBtn label="Database"         path="/admin/dq/database"   active={isActive("/admin/dq/database")} />
            <NavBtn label="Billing"          path="/admin/dq/billing"    active={isActive("/admin/dq/billing")} />
            <NavBtn label="Reports"          path="/admin/dq/reports"    active={isActive("/admin/dq/reports")} />
            <NavBtn label="💬 Messages"          path="/admin/messages"      active={isActive("/admin/messages")} badge={unreadCount} />
          </>
        )}
        {process === "BATCH" && (
          <>
            <NavBtn label="Batch Dashboard"  path="/admin/batch/dashboard" active={isActive("/admin/batch/dashboard")} />
            <NavBtn label="Upload Batch"     path="/admin/batch/upload"    active={isActive("/admin/batch/upload")} />
            <NavBtn label="Assign Users"     path="/admin/batch/assign"    active={isActive("/admin/batch/assign")} />
            <NavBtn label="Workflow Control" path="/admin/batch/workflow"  active={isActive("/admin/batch/workflow")} />
            <NavBtn label="Database"         path="/admin/batch/database"  active={isActive("/admin/batch/database")} />
            <NavBtn label="Billing"          path="/admin/batch/billing"   active={isActive("/admin/batch/billing")} />
            <NavBtn label="Reports"          path="/admin/batch/report"    active={isActive("/admin/batch/report")} />
            <NavBtn label="💬 Messages"      path="/admin/messages"        active={isActive("/admin/messages")} badge={unreadCount} />
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

function LogoutBtn() {
  const navigate = useNavigate();
  async function handleLogout() {
    try {
      const user = JSON.parse(localStorage.getItem("sarnUser"));
      if (user?.userId) await api.post("/auth/logout", { userId: user.userId });
    } catch {}
    localStorage.clear();
    navigate("/login");
  }
  return (
    <button onClick={handleLogout} style={logoutBtn}>Logout</button>
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
};

const divider = {
  height: 1,
  background: "rgba(255,255,255,0.07)",
  margin: "4px 0 10px",
  flexShrink: 0,
};

const roleChip = {
  display: "inline-block",
  background: "rgba(59,130,246,0.2)",
  border: "1px solid rgba(59,130,246,0.35)",
  color: "#93c5fd",
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
  flex: 1,
};

const processBtn = (active) => ({
  flex: 1,
  background: active ? "#3b82f6" : "#1e293b",
  padding: "6px 4px",
  borderRadius: 6,
  border: "none",
  color: "white",
  cursor: "pointer",
  fontSize: 12,
  fontWeight: active ? 700 : 400,
});

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
