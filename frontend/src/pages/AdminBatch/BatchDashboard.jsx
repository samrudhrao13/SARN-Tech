import React from "react";
import { useNavigate } from "react-router-dom";

export default function BatchDashboard() {
  const navigate = useNavigate();

  return (
    <>
      <h1 style={{ marginBottom: 4, fontSize: 24, fontWeight: 700, color: "#0f172a" }}>Batch Dashboard</h1>
      <p style={{ marginBottom: 28, color: "#64748b", fontSize: 14 }}>
        Quick access to Batch workflow management and verification.
      </p>

      <div style={grid}>
        <ActionCard
          title="Upload Batch"
          desc="Upload Batch Excel files"
          icon="📤"
          color="#2563eb"
          shortcut="U"
          onClick={() => navigate("/admin/batch/upload")}
        />
        <ActionCard
          title="Assign Users"
          desc="Assign verification work to users"
          icon="👥"
          color="#7c3aed"
          shortcut="A"
          onClick={() => navigate("/admin/batch/assign")}
        />
        <ActionCard
          title="Workflow Control"
          desc="Track batch verification progress"
          icon="🔄"
          color="#0369a1"
          shortcut="W"
          onClick={() => navigate("/admin/batch/workflow")}
        />
        <ActionCard
          title="Batch Database"
          desc="View and export all batch records"
          icon="🗄️"
          color="#334155"
          shortcut="D"
          onClick={() => navigate("/admin/batch/database")}
        />
        <ActionCard
          title="Billing Queue"
          desc="Records ready for billing"
          icon="💰"
          color="#16a34a"
          shortcut="B"
          onClick={() => navigate("/admin/batch/billing")}
        />
        <ActionCard
          title="Reports"
          desc="Export and review batch records"
          icon="📊"
          color="#0f766e"
          shortcut="P"
          onClick={() => navigate("/admin/batch/report")}
        />
        <ActionCard
          title="Messages"
          desc="Team chat and direct messages"
          icon="💬"
          color="#0891b2"
          shortcut="M"
          onClick={() => navigate("/admin/messages")}
        />
      </div>
    </>
  );
}

function ActionCard({ title, desc, icon, color, shortcut, onClick }) {
  const [hovered, setHovered] = React.useState(false);
  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: "18px 20px",
        cursor: "pointer",
        display: "flex",
        gap: 14,
        alignItems: "center",
        borderLeft: `5px solid ${color}`,
        boxShadow: hovered
          ? "0 8px 24px rgba(0,0,0,0.13)"
          : "0 2px 8px rgba(0,0,0,0.07)",
        transform: hovered ? "translateY(-2px)" : "none",
        transition: "all 0.15s ease",
        position: "relative",
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: 10, display: "flex",
        alignItems: "center", justifyContent: "center",
        background: `${color}15`, fontSize: 22, flexShrink: 0,
      }}>
        {icon}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3 style={{ margin: "0 0 3px", fontSize: 14, fontWeight: 700, color: "#0f172a" }}>{title}</h3>
        <p style={{ margin: 0, color: "#64748b", fontSize: 12.5 }}>{desc}</p>
      </div>
      {shortcut && (
        <span style={{
          position: "absolute", top: 10, right: 12,
          fontSize: 10, fontWeight: 700, color: "#94a3b8",
          background: "#f1f5f9", border: "1px solid #e2e8f0",
          borderRadius: 4, padding: "1px 5px", letterSpacing: 0.5,
        }}>
          {shortcut}
        </span>
      )}
    </div>
  );
}

const grid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
  gap: 16,
};
