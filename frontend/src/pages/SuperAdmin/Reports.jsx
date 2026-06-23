import React, { useState } from "react";

const BACKEND = import.meta.env.VITE_API_URL || "https://sarn-backend-862276535294.asia-south1.run.app";

export default function SuperAdminReports() {
  const [loading, setLoading] = useState(null);

  function download(period) {
    setLoading(period);
    const url = `${BACKEND}/admin/report/superadmin-pdf?period=${period}`;
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.click();
    setTimeout(() => setLoading(null), 2000);
  }

  return (
    <div style={{ padding: 40, maxWidth: 700 }}>
      <h1 style={{ fontSize: 26, fontWeight: 700, color: "#0f172a", marginBottom: 6 }}>
        Executive Reports
      </h1>
      <p style={{ color: "#64748b", fontSize: 14, marginBottom: 36 }}>
        Download a high-level summary of team performance and business-wise activity.
        Reports include task type breakdown and counts — no individual record details.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {[
          { period: "today", label: "Today's Report",   desc: "Activity for today (IST)",       color: "#2563eb" },
          { period: "week",  label: "Weekly Report",    desc: "Last 7 days of activity",        color: "#7c3aed" },
          { period: "month", label: "Monthly Report",   desc: "Activity for the current month", color: "#0891b2" },
        ].map(({ period, label, desc, color }) => (
          <div
            key={period}
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
              padding: "18px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            }}
          >
            <div>
              <div style={{ fontWeight: 600, fontSize: 15, color: "#0f172a" }}>{label}</div>
              <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 3 }}>{desc}</div>
            </div>
            <button
              onClick={() => download(period)}
              disabled={loading === period}
              style={{
                background: loading === period ? "#94a3b8" : color,
                color: "#fff", border: "none", borderRadius: 8,
                padding: "10px 20px", fontWeight: 600, fontSize: 14,
                cursor: loading === period ? "not-allowed" : "pointer",
                transition: "background 0.2s",
              }}
            >
              {loading === period ? "Opening..." : "Download PDF"}
            </button>
          </div>
        ))}
      </div>

      <div style={{
        marginTop: 40, background: "#f8fafc", borderRadius: 10,
        border: "1px solid #e2e8f0", padding: "18px 24px",
      }}>
        <div style={{ fontWeight: 600, fontSize: 14, color: "#0f172a", marginBottom: 8 }}>
          Report Contents
        </div>
        <ul style={{ margin: 0, padding: "0 0 0 18px", color: "#475569", fontSize: 13, lineHeight: 2 }}>
          <li>Team Performance — employee name, tasks assigned, tasks completed, task types performed, date</li>
          <li>Business-wise Activity — business name, records assigned, completed, and pending</li>
          <li>Overall totals — aggregate counts across all employees and businesses</li>
        </ul>
      </div>
    </div>
  );
}
