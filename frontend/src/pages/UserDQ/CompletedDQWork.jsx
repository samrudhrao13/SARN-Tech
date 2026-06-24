import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../config/apiClient";

export default function CompletedDQWork() {
  const navigate = useNavigate();
  const user   = JSON.parse(localStorage.getItem("sarnUser") || "null");
  const userId = user?.userId;

  const [tasks, setTasks]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [sheetFilter, setSheetFilter] = useState("");
  const [search, setSearch]       = useState("");

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    setLoading(true);
    api.get("/user/completed-dq-tasks", { params: { userId } })
      .then(res => setTasks(res.data.ok ? res.data.tasks || [] : []))
      .catch(() => setTasks([]))
      .finally(() => setLoading(false));
  }, [userId]);

  const filtered = tasks.filter(t => {
    const sheetOk  = !sheetFilter || t.sheet === sheetFilter;
    const searchOk = !search || String(t.repoId).toLowerCase().includes(search.toLowerCase());
    return sheetOk && searchOk;
  });

  return (
    <>
      <h1 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 700, color: "#0f172a" }}>Completed DQ Work</h1>

      <div style={{ display: "flex", gap: 12, marginBottom: 16, alignItems: "center", flexWrap: "wrap" }}>
        <select style={inp} value={sheetFilter} onChange={e => setSheetFilter(e.target.value)}>
          <option value="">All Sheets</option>
          {[...new Set(tasks.map(t => t.sheet))].map(s => <option key={s} value={s}>{s}</option>)}
        </select>

        <input
          placeholder="Search Repo ID"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={inp}
        />

        <button style={clearBtn} onClick={() => { setSheetFilter(""); setSearch(""); }}>
          Clear Filters
        </button>

        <span style={{ marginLeft: "auto", fontSize: 13, color: "#64748b" }}>
          {filtered.length} record{filtered.length !== 1 ? "s" : ""}
        </span>
      </div>

      {loading && <p>Loading...</p>}
      {!loading && filtered.length === 0 && (
        <p style={{ color: "#64748b" }}>No completed DQ tasks found.</p>
      )}

      {!loading && filtered.length > 0 && (
        <table style={table}>
          <thead>
            <tr>
              <th style={th}>Sheet</th>
              <th style={th}>Repo ID</th>
              <th style={th}>Status</th>
              <th style={th}>Date Verified</th>
              <th style={th}>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((t, i) => (
              <tr key={`${t.sheet}_${t.repoId}`} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                <td style={td}>{t.sheet}</td>
                <td style={td}>{t.repoId}</td>
                <td style={td}>
                  <span style={completedBadge}>completed</span>
                </td>
                <td style={td}>{t.dateVerified || "-"}</td>
                <td style={td}>
                  <button
                    onClick={() => navigate(`/user/dq/work/${encodeURIComponent(t.repoId)}?sheet=${encodeURIComponent(t.sheet)}`)}
                    style={viewBtn}
                  >
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

const inp           = { padding: "8px 12px", borderRadius: 6, border: "1.5px solid #94a3b8", fontSize: 13, color: "#0f172a" };
const clearBtn      = { padding: "8px 14px", background: "#ef4444", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 };
const viewBtn       = { padding: "6px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12 };
const completedBadge = { background: "#16a34a", color: "#fff", padding: "3px 10px", borderRadius: 6, fontWeight: 700, fontSize: 12 };
const table         = { width: "100%", borderCollapse: "collapse", marginTop: 4 };
const th            = { padding: 10, background: "#0f172a", color: "#fff", border: "1px solid #1e293b", textAlign: "left", fontSize: 13, fontWeight: 600 };
const td            = { padding: 10, border: "1px solid #e5e7eb", fontSize: 13 };
