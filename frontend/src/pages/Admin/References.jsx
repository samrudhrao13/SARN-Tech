import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../layouts/AdminLayout";
import api from "../../config/apiClient";

const PAGE_SIZE = 100;

const fix = (s) =>
  String(s || "").trim().toUpperCase().replace(/\s+/g, "_");

export default function References() {
  const navigate = useNavigate();

  const [company] = useState("SARN");
  const [sheets, setSheets] = useState([]);
  const [sheet, setSheet] = useState("");
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [stats, setStats] = useState(null);
  const [userId, setUserId] = useState("");
  const [reportRows, setReportRows] = useState([]);
  const [reportTotal, setReportTotal] = useState(0);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showChart, setShowChart] = useState(false);

  /* ---------------- LOAD SDS SHEETS ---------------- */
  useEffect(() => {
    api.get("/sds/sheets").then((res) => {
      if (res.data.ok && Array.isArray(res.data.sheets)) {
        setSheets(res.data.sheets);
      }
    });
  }, []);

  /* ---------------- LOAD REFERENCES ---------------- */
  async function loadReferences(selectedSheet, p = 1) {
    if (!selectedSheet) return;

    setLoading(true);
    setError("");

    try {
      const res = await api.get("/sds/list", {
        params: {
          sheet: fix(selectedSheet),
          page: p,
          pageSize: PAGE_SIZE,
        },
      });

      const data = res.data;

      if (!data.ok) {
        setRows([]);
        setTotal(0);
        setError(data.error || "Failed to load references");
      } else {
        setRows(data.rows || []);
        setTotal(data.total || 0);
        setPage(p);
      }
    } catch {
      setError("Backend connection failed");
    }

    setLoading(false);
  }

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* ---------------- WORKFLOW STATUS ---------------- */
  function getWorkflowStatus(ref) {
    const s = ref.search?.status || "pending";
    const sp = ref.supersede?.status || "waiting";
    const t = ref.transcription?.status || "waiting";
    const b = ref.billing?.status || "waiting";

    if (s === "pending") return { text: "Not Started", color: "#e5e7eb" };
    if (s === "completed" && sp === "waiting")
      return { text: "Awaiting Supersede", color: "#fde68a" };
    if (sp === "completed" && t === "waiting")
      return { text: "Awaiting Transcription", color: "#c7d2fe" };
    if (t === "completed" && b === "waiting")
      return { text: "Awaiting Billing", color: "#fca5a5" };
    if (b === "completed")
      return { text: "Completed", color: "#4ade80" };

    return { text: "In Progress", color: "#e5e7eb" };
  }
async function loadProductivity() {
  if (!sheet || !fromDate || !toDate) {
    alert("Select sheet and date range");
    return;
  }

  try {
    const res = await api.get(
      "/admin/workflow/productivity",
      {
        params: {
          sheet: fix(sheet),
          fromDate,
          toDate,
        },
      }
    );

    if (res.data.ok) {
      setStats(res.data);
    }
  } catch (err) {
    console.error(err);
  }
}
async function loadProductivity() {
  if (!sheet || !fromDate || !toDate) {
    alert("Select Sheet, From Date and To Date");
    return;
  }

  try {
    const res = await api.get(
      "/admin/workflow/productivity",
      {
        params: {
          sheet: fix(sheet),
          fromDate,
          toDate,
        },
      }
    );

    if (res.data.ok) {
      setStats(res.data);
    }
  } catch (err) {
    console.error(err);
    alert("Failed to load report");
  }
}
  function openDetails(refId) {
    navigate("/admin/workflow-details", {
      state: {
        referenceId: refId,
        company,
        sheet: fix(sheet),
      },
    });
  }

  return (
    <AdminLayout>
      <h2>SDS Reference List</h2>

      {/* SHEET DROPDOWN */}
      <div
  style={{
    display: "flex",
    gap: 12,
    alignItems: "end",
    marginBottom: 15,
    flexWrap: "wrap",
  }}
>
        <label><b>Select SDS Sheet</b></label>
        <select
          value={sheet}
          onChange={(e) => {
            setSheet(e.target.value);
            loadReferences(e.target.value, 1);
          }}
          style={input}
        >
          <option value="">-- Select Sheet --</option>
          {sheets.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>
      <div>
  <label><b>From Date</b></label>
  <input
    type="date"
    value={fromDate}
    onChange={(e) => setFromDate(e.target.value)}
    style={input}
  />
</div>

<div>
  <label><b>To Date</b></label>
  <input
    type="date"
    value={toDate}
    onChange={(e) => setToDate(e.target.value)}
    style={input}
  />
</div>

<button
  onClick={loadProductivity}
  style={{
    padding: "10px 16px",
    height: 40,
  }}
>
  Load Report
</button>

<button
  onClick={() => {
    if (!stats) {
      alert("Load Report first");
      return;
    }
    setShowChart(prev => !prev);
  }}
  style={{
    padding: "10px 16px",
    height: 40,
    background: "#2563eb",
    color: "#fff",
    border: "none",
    borderRadius: 6,
    cursor: "pointer",
  }}
>
  Performance Report
</button>

      {loading && <p>Loading...</p>}
      {stats && (
  <div
    style={{
      display: "flex",
      gap: 20,
      marginBottom: 20,
      flexWrap: "wrap",
    }}
  >
    <div><b>Total Records:</b> {stats.summary.totalRecords}</div>

    <div><b>Assigned:</b> {stats.summary.assignedRecords}</div>

    <div><b>Completed:</b> {stats.summary.completedRecords}</div>

    <div><b>Head Count:</b> {stats.summary.headCount}</div>
  </div>
)}  
      {error && <p style={{ color: "red" }}>{error}</p>}

      {stats?.users?.length > 0 && (
  <>
    <h3>User Productivity</h3>

    <table style={table}>
      <thead>
        <tr>
          <th style={th}>User</th>
          <th style={th}>Assigned</th>
          <th style={th}>Completed</th>
          <th style={th}>Pending</th>
          <th style={th}>Completion %</th>
        </tr>
      </thead>

      <tbody>
        {stats.users.map((u) => (
          <tr key={u.userId}>
            <td style={td}>{u.userId}</td>
            <td style={td}>{u.assigned}</td>
            <td style={td}>{u.completed}</td>
            <td style={td}>{u.pending}</td>
            <td style={td}>
              {u.assigned
                ? (
                    (u.completed / u.assigned) *
                    100
                  ).toFixed(2)
                : 0}
              %
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    <br />

    {showChart && (
      <PieChart users={stats.users} />
    )}
  </>
)}

      {/* TABLE */}
      {rows.length > 0 && (
        <>
          <table style={table}>
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                <th style={th}>SL No</th>
                <th style={th}>Reference ID</th>
                <th style={th}>Business Entity</th>
                <th style={th}>Repository</th>
                <th style={th}>Workflow Status</th>
              </tr>
            </thead>

            <tbody>
              {rows.map((ref, index) => {
                const status = getWorkflowStatus(ref);
                const refId = ref.referenceId || ref.refId;

                return (
                  <tr
                    key={`${sheet}-${refId}`}
                    onClick={() => openDetails(refId)}
                    style={{ cursor: "pointer" }}
                  >
                    <td style={td}>
                      {(page - 1) * PAGE_SIZE + index + 1}
                    </td>
                    <td style={td}>{refId}</td>
                    <td style={td}>{ref.common?.businessEntity || "-"}</td>
                    <td style={td}>{ref.common?.repositoryNumber || "-"}</td>
                    <td style={td}>
                      <span
                        style={{
                          background: status.color,
                          padding: "4px 10px",
                          borderRadius: 6,
                          fontWeight: 600,
                          fontSize: 12,
                        }}
                      >
                        {status.text}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* PAGINATION */}
          <div style={{ marginTop: 12 }}>
            <button
              disabled={page === 1}
              onClick={() => loadReferences(sheet, page - 1)}
            >
              Prev
            </button>
            <span style={{ margin: "0 10px" }}>
              Page {page} / {totalPages}
            </span>
            <button
              disabled={page === totalPages}
              onClick={() => loadReferences(sheet, page + 1)}
            >
              Next
            </button>
          </div>
        </>
      )}

      {!loading && sheet && rows.length === 0 && !error && (
        <p>No references found for this sheet.</p>
      )}
    </AdminLayout>
  );
}

/* ---------------- PIE CHART ---------------- */

const COLORS = [
  "#2563eb", "#16a34a", "#dc2626", "#f59e0b",
  "#7c3aed", "#0891b2", "#db2777", "#65a30d",
];

function PieChart({ users }) {
  const data = users.filter(u => u.completed > 0);

  if (data.length === 0) {
    return <p style={{ color: "#64748b" }}>No completed records to display.</p>;
  }

  const total = data.reduce((sum, u) => sum + u.completed, 0);
  const cx = 180;
  const cy = 180;
  const r = 150;

  let startAngle = -Math.PI / 2;
  const slices = data.map((u, i) => {
    const angle = (u.completed / total) * 2 * Math.PI;
    const endAngle = startAngle + angle;
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const mid = startAngle + angle / 2;
    const lx = cx + (r * 0.65) * Math.cos(mid);
    const ly = cy + (r * 0.65) * Math.sin(mid);
    const large = angle > Math.PI ? 1 : 0;
    const path = `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`;
    const slice = { path, lx, ly, color: COLORS[i % COLORS.length], u, pct: ((u.completed / total) * 100).toFixed(1) };
    startAngle = endAngle;
    return slice;
  });

  return (
    <div style={{ marginTop: 24, marginBottom: 24 }}>
      <h3>Performance Report — Completed Work per User</h3>
      <div style={{ display: "flex", gap: 40, alignItems: "center", flexWrap: "wrap" }}>
        <svg width={360} height={360}>
          {slices.map((s, i) => (
            <g key={i}>
              <path d={s.path} fill={s.color} stroke="#fff" strokeWidth={2} />
              {parseFloat(s.pct) > 5 && (
                <text x={s.lx} y={s.ly} textAnchor="middle" dominantBaseline="middle"
                  fontSize={12} fontWeight={600} fill="#fff">
                  {s.pct}%
                </text>
              )}
            </g>
          ))}
        </svg>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {slices.map((s, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 16, height: 16, borderRadius: 3, background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 14 }}>
                <b>{s.u.userId}</b> — {s.u.completed} completed ({s.pct}%)
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------------- STYLES ---------------- */

const input = {
  display: "block",
  padding: "8px",
  marginTop: 6,
  width: 260,
};

const table = {
  width: "100%",
  borderCollapse: "collapse",
};

const th = {
  border: "1px solid #ddd",
  padding: 8,
  fontWeight: "bold",
};

const td = {
  border: "1px solid #ddd",
  padding: 8,
};
