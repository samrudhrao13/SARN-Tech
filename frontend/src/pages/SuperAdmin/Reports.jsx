import React, { useState } from "react";
import api from "../../config/apiClient";

const BACKEND = import.meta.env.VITE_API_URL || "https://sarn-backend-862276535294.asia-south1.run.app";

export default function SuperAdminReports() {
  const [period, setPeriod]   = useState("week");
  const [sds, setSds]         = useState(null);
  const [dq, setDq]           = useState(null);
  const [batch, setBatch]     = useState(null);
  const [loading, setLoading] = useState(false);
  const [dlLoading, setDlLoading] = useState(false);
  const [error, setError]     = useState("");

  async function loadReport() {
    setLoading(true);
    setError("");
    try {
      const [r1, r2, r3] = await Promise.all([
        api.get("/admin/sds/reports-data",   { params: { period } }),
        api.get("/admin/dq/reports-data",    { params: { period } }),
        api.get("/admin/batch/reports-data", { params: { period } }),
      ]);
      setSds(r1.data.ok   ? r1.data : null);
      setDq(r2.data.ok    ? r2.data : null);
      setBatch(r3.data.ok ? r3.data : null);
      if (!r1.data.ok && !r2.data.ok && !r3.data.ok) setError("Failed to load report data");
    } catch {
      setError("Backend connection failed");
    }
    setLoading(false);
  }

  function downloadPDF() {
    setDlLoading(true);
    const url = `${BACKEND}/admin/report/superadmin-pdf?period=${period}`;
    const a = document.createElement("a");
    a.href = url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.click();
    setTimeout(() => setDlLoading(false), 2000);
  }

  /* ── derived counts ── */
  const sdsT  = sds?.totals  || {};
  const dqT   = dq?.totals   || {};
  const batchT = batch?.totals || {};

  const sdsStages = [
    { label: "Search",        e: sdsT.searchE        || 0, ml: sdsT.searchML        || 0 },
    { label: "Supersede",     e: sdsT.supersedeE     || 0, ml: sdsT.supersedeML     || 0 },
    { label: "Transcription", e: sdsT.transcriptionE || 0, ml: sdsT.transcriptionML || 0 },
    { label: "Billing",       e: sdsT.billingE       || 0, ml: sdsT.billingML       || 0 },
  ];
  const sdsTotalE  = sdsStages.reduce((s, r) => s + r.e,  0);
  const sdsTotalML = sdsStages.reduce((s, r) => s + r.ml, 0);

  /* ── merge user rows ── */
  const allUserIds = new Set([
    ...(sds?.users  || []).map(u => u.userId),
    ...(dq?.users   || []).map(u => u.userId),
    ...(batch?.users|| []).map(u => u.userId),
  ]);
  const sdsMap   = Object.fromEntries((sds?.users   || []).map(u => [u.userId, u]));
  const dqMap    = Object.fromEntries((dq?.users    || []).map(u => [u.userId, u]));
  const batchMap = Object.fromEntries((batch?.users || []).map(u => [u.userId, u]));

  const mergedUsers = [...allUserIds].map(uid => {
    const s  = sdsMap[uid]   || {};
    const d  = dqMap[uid]    || {};
    const b  = batchMap[uid] || {};
    const name = s.name || d.name || b.name || uid;
    const sdsTotal   = (s.total || 0);
    const dqTotal    = (d.totalCompleted || 0);
    const batchTotal = (b.totalCompleted || 0);
    return {
      uid, name,
      sdsSearch:  (s.searchE || 0) + (s.searchML || 0),
      sdsSupersede: (s.supersedeE || 0) + (s.supersedeML || 0),
      sdsTrans:   (s.transcriptionE || 0) + (s.transcriptionML || 0),
      sdsBilling: (s.billingE || 0) + (s.billingML || 0),
      sdsTotal, dqTotal, batchTotal,
      grand: sdsTotal + dqTotal + batchTotal,
    };
  }).sort((a, b) => b.grand - a.grand);

  const periodLabel = { today: "Today (IST)", week: "Last 7 Days", month: "This Month" }[period];

  return (
    <>
      <h2 style={{ margin: "0 0 6px", fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
        Executive Reports
      </h2>
      <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 13 }}>
        Consolidated workflow stage counts across SDS, DQ and Batch for the selected period.
      </p>

      {/* ── Control Card ── */}
      <div style={controlCard}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div>
            <div style={label}>Period</div>
            <select value={period} onChange={e => setPeriod(e.target.value)} style={sel}>
              <option value="today">Today</option>
              <option value="week">Last 7 Days</option>
              <option value="month">This Month</option>
            </select>
          </div>
          <button onClick={loadReport} disabled={loading} style={primaryBtn}>
            {loading ? "Loading..." : "Load Report"}
          </button>
          <button onClick={downloadPDF} disabled={dlLoading} style={exportBtn}>
            {dlLoading ? "Opening..." : "⬇ Download PDF"}
          </button>
        </div>
      </div>

      {error && <p style={{ color: "#dc2626", fontWeight: 600, marginBottom: 12 }}>{error}</p>}

      {(sds || dq || batch) && (
        <>
          <div style={periodBadge}>{periodLabel}</div>

          {/* ── Top Summary Cards ── */}
          <div style={cardRow}>
            <SummaryCard
              title="SDS Workflow"
              color="#2563eb"
              rows={[
                { label: "Total Assigned", value: sdsT.totalAssigned || 0 },
                { label: "Total Completed", value: sdsT.total || 0 },
              ]}
            />
            <SummaryCard
              title="DQ Workflow"
              color="#7c3aed"
              rows={[
                { label: "Total Assigned", value: dqT.totalAssigned || 0 },
                { label: "Total Completed", value: dqT.totalCompleted || 0 },
              ]}
            />
            <SummaryCard
              title="Batch Workflow"
              color="#0891b2"
              rows={[
                { label: "Total Assigned", value: batchT.totalAssigned || 0 },
                { label: "Total Completed", value: batchT.totalCompleted || 0 },
              ]}
            />
            <SummaryCard
              title="Grand Total"
              color="#16a34a"
              rows={[
                { label: "All Assigned", value: (sdsT.totalAssigned||0) + (dqT.totalAssigned||0) + (batchT.totalAssigned||0) },
                { label: "All Completed", value: (sdsT.total||0) + (dqT.totalCompleted||0) + (batchT.totalCompleted||0) },
              ]}
            />
          </div>

          {/* ── SDS Stage Breakdown ── */}
          {sds && (
            <div style={section}>
              <SectionTitle>SDS Workflow — Stage Breakdown</SectionTitle>
              <div style={tableWrap}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
                  <thead>
                    <tr style={{ background: "#0f172a", color: "#fff" }}>
                      <th style={th}>Stage</th>
                      <th style={{ ...th, textAlign: "center" }}>English</th>
                      <th style={{ ...th, textAlign: "center" }}>Multilingual</th>
                      <th style={{ ...th, textAlign: "center" }}>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sdsStages.map((row, i) => (
                      <tr key={row.label} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff" }}>
                        <td style={{ ...td, fontWeight: 600 }}>
                          <span style={stageDot(row.label)} /> {row.label}
                        </td>
                        <td style={{ ...td, textAlign: "center" }}>{row.e}</td>
                        <td style={{ ...td, textAlign: "center" }}>{row.ml}</td>
                        <td style={{ ...td, textAlign: "center", fontWeight: 700 }}>{row.e + row.ml}</td>
                      </tr>
                    ))}
                    <tr style={{ background: "#0f172a22", fontWeight: 700 }}>
                      <td style={{ ...td, fontWeight: 700 }}>Total</td>
                      <td style={{ ...td, textAlign: "center", fontWeight: 700 }}>{sdsTotalE}</td>
                      <td style={{ ...td, textAlign: "center", fontWeight: 700 }}>{sdsTotalML}</td>
                      <td style={{ ...td, textAlign: "center", fontWeight: 700 }}>{sdsTotalE + sdsTotalML}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── DQ Summary ── */}
          {dq && (
            <div style={section}>
              <SectionTitle>DQ Workflow — Summary</SectionTitle>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Chip label={`Assigned: ${dqT.totalAssigned || 0}`}   color="blue"   />
                <Chip label={`Completed: ${dqT.totalCompleted || 0}`} color="green"  />
                <Chip label={`Pending: ${(dqT.totalAssigned||0) - (dqT.totalCompleted||0)}`} color="amber" />
              </div>
            </div>
          )}

          {/* ── Batch Summary ── */}
          {batch && (
            <div style={section}>
              <SectionTitle>Batch Workflow — Summary</SectionTitle>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <Chip label={`Assigned: ${batchT.totalAssigned || 0}`}   color="blue"   />
                <Chip label={`Completed: ${batchT.totalCompleted || 0}`} color="green"  />
                <Chip label={`Pending: ${(batchT.totalAssigned||0) - (batchT.totalCompleted||0)}`} color="amber" />
              </div>
            </div>
          )}

          {/* ── Combined User Table ── */}
          {mergedUsers.length > 0 && (
            <div style={section}>
              <SectionTitle>User-wise Breakdown</SectionTitle>
              <div style={{ ...tableWrap, maxHeight: "calc(100vh - 200px)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 800 }}>
                  <thead>
                    <tr style={{ background: "#0f172a", color: "#fff", position: "sticky", top: 0, zIndex: 2 }}>
                      <th style={th}>#</th>
                      <th style={th}>User</th>
                      <th style={{ ...th, textAlign: "center" }}>SDS Search</th>
                      <th style={{ ...th, textAlign: "center" }}>SDS Supersede</th>
                      <th style={{ ...th, textAlign: "center" }}>SDS Trans.</th>
                      <th style={{ ...th, textAlign: "center" }}>SDS Billing</th>
                      <th style={{ ...th, textAlign: "center" }}>DQ</th>
                      <th style={{ ...th, textAlign: "center" }}>Batch</th>
                      <th style={{ ...th, textAlign: "center" }}>Grand Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mergedUsers.map((u, i) => (
                      <tr key={u.uid} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff" }}>
                        <td style={{ ...td, color: "#94a3b8", fontSize: 11, textAlign: "center", width: 40 }}>{i + 1}</td>
                        <td style={{ ...td, fontWeight: 600 }}>{u.name}<br /><span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 400 }}>{u.uid}</span></td>
                        <td style={{ ...td, textAlign: "center" }}>{u.sdsSearch  || "-"}</td>
                        <td style={{ ...td, textAlign: "center" }}>{u.sdsSupersede || "-"}</td>
                        <td style={{ ...td, textAlign: "center" }}>{u.sdsTrans  || "-"}</td>
                        <td style={{ ...td, textAlign: "center" }}>{u.sdsBilling || "-"}</td>
                        <td style={{ ...td, textAlign: "center" }}>{u.dqTotal   || "-"}</td>
                        <td style={{ ...td, textAlign: "center" }}>{u.batchTotal|| "-"}</td>
                        <td style={{ ...td, textAlign: "center", fontWeight: 700, color: "#0f172a" }}>{u.grand}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {!sds && !dq && !batch && !loading && (
        <div style={{ padding: "48px 0", textAlign: "center", color: "#94a3b8", fontSize: 14 }}>
          Select a period and click <b>Load Report</b> to view consolidated counts.
        </div>
      )}
    </>
  );
}

/* ── Sub-components ── */

function SummaryCard({ title, color, rows }) {
  return (
    <div style={{ flex: "1 1 180px", minWidth: 0, background: "#fff", border: "1px solid #e2e8f0", borderRadius: 12, padding: "16px 20px", borderTop: `4px solid ${color}` }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 12 }}>{title}</div>
      {rows.map(r => (
        <div key={r.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: "#64748b" }}>{r.label}</span>
          <span style={{ fontSize: 22, fontWeight: 800, color }}>{r.value.toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function SectionTitle({ children }) {
  return <h3 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 700, color: "#0f172a", textTransform: "uppercase", letterSpacing: "0.05em" }}>{children}</h3>;
}

function Chip({ label, color }) {
  const map = {
    blue:  { bg: "#dbeafe", fg: "#1d4ed8" },
    green: { bg: "#dcfce7", fg: "#166534" },
    amber: { bg: "#fef3c7", fg: "#92400e" },
    gray:  { bg: "#f1f5f9", fg: "#475569" },
  };
  const s = map[color] || map.gray;
  return (
    <span style={{ padding: "6px 16px", borderRadius: 999, fontSize: 13, fontWeight: 700, background: s.bg, color: s.fg }}>
      {label}
    </span>
  );
}

function stageDot(stage) {
  const colors = { Search: "#2563eb", Supersede: "#7c3aed", Transcription: "#0f766e", Billing: "#dc2626" };
  return { display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: colors[stage] || "#94a3b8", marginRight: 6 };
}

/* ── Styles ── */
const controlCard = { background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, padding: "16px 20px", marginBottom: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" };
const label       = { fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 };
const sel         = { padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: 13 };
const primaryBtn  = { padding: "8px 20px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 };
const exportBtn   = { padding: "8px 20px", borderRadius: 8, border: "none", background: "#0f172a", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13 };
const periodBadge = { display: "inline-block", padding: "4px 14px", borderRadius: 999, background: "#eff6ff", color: "#2563eb", fontWeight: 700, fontSize: 12, marginBottom: 16 };
const cardRow     = { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 20 };
const section     = { marginBottom: 20 };
const tableWrap   = { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflowX: "auto", overflowY: "auto" };
const th          = { padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" };
const td          = { padding: "9px 14px", borderBottom: "1px solid #f1f5f9", fontSize: 13, verticalAlign: "middle" };
