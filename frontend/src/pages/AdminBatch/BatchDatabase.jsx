import React, { useEffect, useState } from "react";
import api from "../../config/apiClient";

const PAGE_SIZE = 100;
const LS_SHEET  = "sarn_batch_db_sheet";
const LS_STATUS = "sarn_batch_db_status";

export default function BatchDatabase() {
  const [sheets, setSheets]   = useState([]);
  const [sheet, setSheet]     = useState(() => localStorage.getItem(LS_SHEET) || "");
  const [rows, setRows]       = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(false);
  const [search, setSearch]   = useState("");
  const [statusF, setStatusF] = useState(() => localStorage.getItem(LS_STATUS) || "ALL");
  const [dupF, setDupF]       = useState("ALL");

  useEffect(() => {
    api.get("/batch/sheets").then(res => {
      if (res.data.ok) setSheets(res.data.sheets || []);
    });
  }, []);

  useEffect(() => {
    if (!sheet) { setRows([]); return; }
    setLoading(true);
    api.get("/admin/batch/list", { params: { sheet } })
      .then(res => {
        if (res.data.ok) setRows(res.data.rows || []);
        else setRows([]);
      })
      .catch(() => setRows([]))
      .finally(() => setLoading(false));
  }, [sheet]);

  useEffect(() => {
    let out = [...rows];
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      out = out.filter(r =>
        (r.newRepository || "").toLowerCase().includes(q) ||
        (r.chemicalName  || "").toLowerCase().includes(q) ||
        (r.manufacturerName || "").toLowerCase().includes(q)
      );
    }
    if (statusF !== "ALL") out = out.filter(r => (r.status || "ASSIGN_PENDING") === statusF);
    if (dupF === "DUP")    out = out.filter(r => r.duplicate);
    if (dupF === "NORMAL") out = out.filter(r => !r.duplicate);
    setFiltered(out);
    setPage(1);
  }, [rows, search, statusF, dupF]);

  const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paged       = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const exportExcel = () => {
    if (!sheet) return;
    window.open(`${api.defaults.baseURL}/admin/batch/export?sheet=${encodeURIComponent(sheet)}`, "_blank");
  };

  return (
    <>
      <h2 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
        Batch Database
      </h2>

      {/* ── Controls ── */}
      <div style={controlCard}>
        <div style={controlRow}>
          <select
            value={sheet}
            onChange={e => {
              setSheet(e.target.value);
              localStorage.setItem(LS_SHEET, e.target.value);
            }}
            style={sel}
          >
            <option value="">Select Business</option>
            {sheets.map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <input
            placeholder="Search repo / chemical / manufacturer…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...sel, flex: "1 1 240px" }}
          />

          <select
            value={statusF}
            onChange={e => {
              setStatusF(e.target.value);
              localStorage.setItem(LS_STATUS, e.target.value);
            }}
            style={sel}
          >
            <option value="ALL">All Status</option>
            <option value="ASSIGN_PENDING">Assign Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>

          <select value={dupF} onChange={e => setDupF(e.target.value)} style={sel}>
            <option value="ALL">All Records</option>
            <option value="NORMAL">Non-Duplicates</option>
            <option value="DUP">Duplicates Only</option>
          </select>

          <button
            onClick={exportExcel}
            disabled={!sheet}
            style={{ ...exportBtn, opacity: sheet ? 1 : 0.5, cursor: sheet ? "pointer" : "not-allowed" }}
          >
            ⬇ Export Excel
          </button>
        </div>
      </div>

      {/* ── Stats ── */}
      {rows.length > 0 && (
        <div style={statsBar}>
          <Chip label={`Total: ${rows.length}`}        color="blue"  />
          <Chip label={`Shown: ${filtered.length}`}    color="green" />
          <Chip label={`Page ${page}/${totalPages}`}   color="gray"  />
          {dupF === "DUP" && <Chip label="Duplicates only" color="orange" />}
        </div>
      )}

      {/* ── Table ── */}
      <div style={tableWrap}>
        {loading ? (
          <Empty>Loading records…</Empty>
        ) : !sheet ? (
          <Empty>Select a business above to view data.</Empty>
        ) : paged.length === 0 ? (
          <Empty>No records match the current filters.</Empty>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
              <thead>
                <tr style={{ background: "#0f172a", color: "#fff", position: "sticky", top: 0, zIndex: 2 }}>
                  {[
                    "#", "Repository", "Chemical Name", "Manufacturer", "Language",
                    "Revision Date", "Product Code", "Site Name", "Site SDS",
                    "PDF File", "Status", "Assigned To", "Duplicate",
                  ].map(h => <th key={h} style={th}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {paged.map((r, i) => (
                  <tr
                    key={r.recordId}
                    style={{ background: r.duplicate ? "#fff7ed" : i % 2 === 0 ? "#f8fafc" : "#fff" }}
                  >
                    <td style={{ ...td, color: "#94a3b8", textAlign: "center", width: 40 }}>
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </td>
                    <td style={{ ...td, fontWeight: 700, color: "#0f172a", whiteSpace: "nowrap" }}>
                      {r.newRepository || r.recordId}
                    </td>
                    <td style={ellTd} title={r.chemicalName}>{r.chemicalName || "-"}</td>
                    <td style={ellTd} title={r.manufacturerName}>{r.manufacturerName || "-"}</td>
                    <td style={td}>
                      {r.language
                        ? <span style={langPill(r.language)}>{r.language}</span>
                        : "-"}
                    </td>
                    <td style={{ ...td, whiteSpace: "nowrap" }}>{r.revisionDate || "-"}</td>
                    <td style={td}>{r.productCode || "-"}</td>
                    <td style={ellTd} title={r.siteName}>{r.siteName || "-"}</td>
                    <td style={td}>{r.siteSdsNumber || "-"}</td>
                    <td style={ellTd} title={r.pdfFileName}>{r.pdfFileName || "-"}</td>
                    <td style={td}><StatusBadge status={r.status} /></td>
                    <td style={td}>
                      {r.assignedTo
                        ? <span style={{ color: "#16a34a", fontWeight: 600 }}>{r.assignedTo}</span>
                        : <span style={{ color: "#94a3b8" }}>—</span>}
                    </td>
                    <td style={{ ...td, textAlign: "center" }}>
                      {r.duplicate
                        ? <span style={dupBadge}>DUP</span>
                        : <span style={{ color: "#94a3b8" }}>-</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div style={pageBar}>
                <button disabled={page === 1} onClick={() => setPage(p => p - 1)} style={pgBtn(page === 1)}>◀ Prev</button>
                <span style={{ fontWeight: 600, fontSize: 13 }}>
                  Page {page} of {totalPages} · {filtered.length} records
                </span>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={pgBtn(page === totalPages)}>Next ▶</button>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

/* ── Sub-components ── */

function StatusBadge({ status }) {
  const map = {
    ASSIGN_PENDING: { bg: "#fef3c7", fg: "#92400e", label: "Assign Pending" },
    IN_PROGRESS:    { bg: "#dbeafe", fg: "#1d4ed8", label: "In Progress" },
    COMPLETED:      { bg: "#dcfce7", fg: "#166534", label: "Completed" },
  };
  const s = map[status] || { bg: "#f1f5f9", fg: "#475569", label: status || "Unknown" };
  return (
    <span style={{ display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: s.bg, color: s.fg, whiteSpace: "nowrap" }}>
      {s.label}
    </span>
  );
}

function Chip({ label, color }) {
  const c = { blue: ["#dbeafe","#1d4ed8"], green: ["#dcfce7","#166534"], gray: ["#f1f5f9","#475569"], orange: ["#ffedd5","#9a3412"] };
  const [bg, fg] = c[color] || c.gray;
  return <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: bg, color: fg }}>{label}</span>;
}

function Empty({ children }) {
  return <div style={{ padding: 56, textAlign: "center", color: "#94a3b8", fontSize: 14 }}>{children}</div>;
}

function langPill(lang) {
  const ml = lang && lang.toLowerCase() !== "english";
  return { display: "inline-block", padding: "2px 7px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: ml ? "#ede9fe" : "#dbeafe", color: ml ? "#7c3aed" : "#1d4ed8" };
}

/* ── Styles ── */
const controlCard = { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "14px 18px", marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" };
const controlRow  = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };
const sel         = { padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: 13, minWidth: 170 };
const exportBtn   = { padding: "8px 18px", borderRadius: 8, border: "none", background: "linear-gradient(135deg,#2563eb,#1e40af)", color: "#fff", fontWeight: 700, fontSize: 13, whiteSpace: "nowrap" };
const statsBar    = { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 };
const tableWrap   = { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflowX: "auto", overflowY: "auto", maxHeight: "calc(100vh - 230px)" };
const th          = { padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" };
const td          = { padding: "8px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 12, verticalAlign: "middle" };
const ellTd       = { ...td, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" };
const dupBadge    = { padding: "2px 7px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" };
const pageBar     = { display: "flex", gap: 12, alignItems: "center", padding: "12px 16px", borderTop: "1px solid #f1f5f9" };
const pgBtn       = (dis) => ({ padding: "6px 14px", borderRadius: 6, border: "1px solid #cbd5e1", background: dis ? "#f1f5f9" : "#fff", color: dis ? "#94a3b8" : "#0f172a", fontWeight: 600, cursor: dis ? "not-allowed" : "pointer" });
