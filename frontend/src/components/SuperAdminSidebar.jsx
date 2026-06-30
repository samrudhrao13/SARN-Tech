import React from "react";
import { useChatContext } from "../context/ChatContext";

export default function SuperAdminSidebar() {
  const { unreadCount } = useChatContext();

  function handleLogout() {
    localStorage.clear();
    window.location.href = "/login";
  }

  const path = window.location.pathname;

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

      <div style={roleChip}>Super Admin</div>

      {/* ── Nav ── */}
      <nav style={nav}>
        <NavBtn label="Dashboard"       href="/super-admin"              active={path === "/super-admin"} />
        <NavBtn label="Manage Users"    href="/super-admin/users"        active={path.startsWith("/super-admin/users")} />
        <NavBtn label="Attendance"      href="/super-admin/attendance"   active={path.startsWith("/super-admin/attendance")} />
        <NavBtn label="Reports"         href="/super-admin/reports"      active={path.startsWith("/super-admin/reports")} />
        <NavBtn label="Notifications"   href="/super-admin/notifications" active={path.startsWith("/super-admin/notifications")} />
        <NavBtn label="💬 Messages"           href="/super-admin/messages"      active={path.startsWith("/super-admin/messages")} badge={unreadCount} />
      </nav>

      <div style={{ flex: 1 }} />

      <button onClick={handleLogout} style={logoutBtn}>Logout</button>
    </div>
  );
}

function NavBtn({ label, href, active, badge }) {
  return (
    <a href={href} style={{ textDecoration: "none" }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 12px",
        borderRadius: 8,
        marginBottom: 3,
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
        <span>{label}</span>
        {badge > 0 && (
          <span style={{ flexShrink: 0, minWidth: 18, height: 18, borderRadius: 99, background: "#ef4444", color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
            {badge > 99 ? "99+" : badge}
          </span>
        )}
      </div>
    </a>
  );
}

const sidebar = {
  width: 230,
  height: "100vh",
  background: "linear-gradient(180deg, #0a1628 0%, #0f172a 100%)",
  borderRight: "1px solid rgba(255,255,255,0.06)",
  color: "white",
  padding: "10px 14px",
  position: "fixed",
  left: 0,
  top: 0,
  display: "flex",
  flexDirection: "column",
  boxShadow: "4px 0 24px rgba(0,0,0,0.3)",
};

const brandWrap = {
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  gap: 10,
  padding: "0px 0px 0px",
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
};

const roleChip = {
  display: "inline-block",
  background: "rgba(99,102,241,0.2)",
  border: "1px solid rgba(99,102,241,0.35)",
  color: "#a5b4fc",
  fontSize: 10.5,
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: "uppercase",
  padding: "4px 10px",
  borderRadius: 20,
  marginBottom: 16,
  alignSelf: "flex-start",
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
};
