import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../config/apiClient";

const normalizeSheet = (s) => String(s || "").trim().toUpperCase().replace(/\s+/g, "_");
const normalizeStage = (stage) => (!stage || stage === "pending" ? "search" : stage);

export default function CompletedSDSWork() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("sarnUser") || "null");
  const userId = user?.userId;

  const [tasks, setTasks]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [stageFilter, setStageFilter]   = useState("");
  const [sheetFilter, setSheetFilter]   = useState("");

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    api.get("/user/completed-sds-tasks", { params: { userId } })
      .then(res => {
        const raw = res.data.ok ? res.data.tasks || [] : [];
        raw.sort((a, b) => {
          const ta = a.completedAt?._seconds ?? a.completedAt ?? 0;
          const tb = b.completedAt?._seconds ?? b.completedAt ?? 0;
          return tb - ta;
        });
        setTasks(raw);
      })
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [userId]);

  const filtered = tasks.filter(t => {
    const stageOk = !stageFilter || (t.stage || t.currentStage) === stageFilter;
    const sheetOk = !sheetFilter || t.sheet === sheetFilter;
    return stageOk && sheetOk;
  });

  return (
    <>
      <h1 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Completed SDS Work</h1>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <select style={filterInput} value={sheetFilter} onChange={e => setSheetFilter(e.target.value)}>
          <option value="">All Sheets</option>
          {[...new Set(tasks.map(t => t.sheet))].map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <select style={filterInput} value={stageFilter} onChange={e => setStageFilter(e.target.value)}>
          <option value="">All Stages</option>
          <option value="search">Search</option>
          <option value="supersede">Supersede</option>
          <option value="transcription">Transcription</option>
        </select>

        <button style={clearBtn} onClick={() => { setSheetFilter(""); setStageFilter(""); }}>
          Clear Filters
        </button>
      </div>

      {loading && <p>Loading...</p>}
      {!loading && filtered.length === 0 && <p style={{ color: "#64748b" }}>No completed tasks found.</p>}

      {!loading && filtered.length > 0 && (
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Reference ID</th>
              <th style={th}>Company</th>
              <th style={th}>Sheet</th>
              <th style={th}>Stage</th>
              <th style={th}>Status</th>
              <th style={th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                <td style={td}>{t.referenceId}</td>
                <td style={td}>{t.company || "SARN"}</td>
                <td style={td}>{normalizeSheet(t.sheet)}</td>
                <td style={td}><StageBadge stage={normalizeStage(t.stage || t.currentStage)} /></td>
                <td style={td}><StatusBadge status={t.status} /></td>
                <td style={td}>
                  <button style={btn} onClick={() => navigate(`/user/work/${normalizeSheet(t.sheet)}/${encodeURIComponent(String(t.referenceId))}`)}>
                    View
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function StageBadge({ stage }) {
  const colors = { search: "#c7d2fe", supersede: "#fde68a", transcription: "#fbcfe8", billing: "#93c5fd" };
  return <span style={{ background: colors[stage] || "#e5e7eb", padding: "4px 12px", borderRadius: 6, fontWeight: 700, fontSize: 12, textTransform: "uppercase" }}>{stage}</span>;
}

function StatusBadge({ status }) {
  return <span style={{ background: "#16a34a", color: "#fff", padding: "4px 12px", borderRadius: 6, fontWeight: 700, fontSize: 12 }}>{status || "completed"}</span>;
}

const table      = { width: "100%", borderCollapse: "collapse", marginTop: 4 };
const th         = { padding: 10, background: "#0f172a", color: "#fff", border: "1px solid #1e293b", textAlign: "left", fontSize: 13, fontWeight: 600 };
const td         = { padding: 10, border: "1px solid #e5e7eb", fontSize: 13 };
const btn        = { padding: "6px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 };
const filterInput = { padding: "8px 12px", border: "1.5px solid #94a3b8", borderRadius: 6, fontSize: 13, color: "#0f172a" };
const clearBtn   = { padding: "8px 14px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 };
