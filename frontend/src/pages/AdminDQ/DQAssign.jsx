import React, { useEffect, useState } from "react";
import api from "../../config/apiClient";

const PAGE_SIZE  = 100;
const FORCE_FLAG = "__FORCE_BILLED__";

export default function DQAssign() {
  const [sheets, setSheets]     = useState([]);
  const [sheet, setSheet]       = useState("");
  const [users, setUsers]       = useState([]);
  const [assignUser, setAssignUser] = useState("");

  const [repos, setRepos]   = useState([]);
  const [selected, setSelected] = useState([]);
  const [page, setPage]     = useState(1);
  const [total, setTotal]   = useState(0);
  const [msg, setMsg]       = useState("");

  const [reassignRepo, setReassignRepo]     = useState(null);
  const [reassignUser, setReassignUser]     = useState("");
  const [reassignReason, setReassignReason] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /* ── Load users ── */
  useEffect(() => {
    api.get("/users").then(res => {
      if (res.data.ok) setUsers(res.data.users.filter(u => u.role === "user"));
    });
  }, []);

  /* ── Load sheets ── */
  useEffect(() => {
    api.get("/dq/sheets").then(res => {
      if (res.data.ok) setSheets(res.data.sheets || []);
    });
  }, []);

  /* ── Load list ── */
  useEffect(() => {
    if (!sheet) return;
    setMsg("Loading...");
    setSelected([]);
    api.get("/dq/list", { params: { sheet, page, pageSize: PAGE_SIZE } })
      .then(res => {
        if (res.data.ok) {
          setRepos(res.data.rows || []);
          setTotal(res.data.total || 0);
          setMsg("");
        } else {
          setRepos([]);
          setMsg("Failed to load");
        }
      });
  }, [sheet, page]);

  /* ── Selection ── */
  const toggle             = id => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const selectAllUnassigned = () => setSelected(repos.filter(r => !r.locked).map(r => r.repoId));
  const clearSelection     = () => setSelected([]);
  const unassignedCount    = repos.filter(r => !r.locked).length;

  /* ── Assign ── */
  const assign = async () => {
    if (!assignUser || selected.length === 0) { setMsg("Select user & repos"); return; }
    setMsg("Assigning...");
    for (const repoId of selected) {
      await api.post("/dq/assign", { sheet, repoId, userId: assignUser });
    }
    setSelected([]);
    setMsg("Assignment completed");
  };

  /* ── Confirm reassign ── */
  const confirmReassign = async () => {
    if (!reassignUser) { alert("Select a user"); return; }
    await api.post("/dq/reassign", {
      sheet, repoId: reassignRepo.repoId, newUserId: reassignUser, reason: reassignReason,
    });
    setReassignRepo(null); setReassignUser(""); setReassignReason("");
    setMsg("Reassigned successfully");
  };

  /* ── Reset ── */
  const reset = () => {
    setSheet(""); setRepos([]); setSelected([]);
    setAssignUser(""); setPage(1); setTotal(0); setMsg("");
  };

  return (
    <>
      <h2 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
        Assign DQ Work
      </h2>

      {/* ── Control Card ── */}
      <div style={controlCard}>

        {/* Row 1: Dropdowns */}
        <div style={dropRow}>
          <DropGroup label="Business">
            <select value={sheet} onChange={e => { setSheet(e.target.value); setPage(1); }} style={dropSel}>
              <option value="">Select Business</option>
              {sheets.map(s => <option key={s}>{s}</option>)}
            </select>
          </DropGroup>

          <DropGroup label="Assign To">
            <select value={assignUser} onChange={e => setAssignUser(e.target.value)} style={dropSel}>
              <option value="">Select User</option>
              {users.map(u => <option key={u.userId} value={u.userId}>{u.userId}</option>)}
            </select>
          </DropGroup>
        </div>

        {/* Row 2: Action buttons */}
        <div style={actionRow}>
          <button onClick={selectAllUnassigned} style={secBtn}>
            Select All Unassigned ({unassignedCount})
          </button>
          <button onClick={clearSelection} style={secBtn}>Clear</button>
          <button onClick={reset}          style={secBtn}>↺ Reset</button>
          <button onClick={assign}         style={assignBtn}>
            Assign Selected{selected.length > 0 ? ` (${selected.length})` : ""}
          </button>
        </div>

      </div>

      {/* Message */}
      {msg && <div style={msgBox}>{msg}</div>}

      {/* Stats */}
      {total > 0 && (
        <div style={statsBar}>
          <Chip label={`Total: ${total} records`}       color="blue"   />
          <Chip label={`Unassigned: ${unassignedCount}`} color="amber"  />
          <Chip label={`Selected: ${selected.length}`}  color="purple" />
          <Chip label={`Page ${page} of ${totalPages}`} color="gray"   />
        </div>
      )}

      {/* Table */}
      <div style={tableWrap}>
        {repos.length === 0 ? (
          <div style={emptyState}>
            {!sheet ? "Select a business to load records" : "No records found."}
          </div>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 540 }}>
              <thead>
                <tr style={{ background: "#0f172a", color: "#fff", position: "sticky", top: 0, zIndex: 2 }}>
                  <th style={th}>#</th>
                  <th style={th}>Action</th>
                  <th style={th}>Repo ID</th>
                  <th style={th}>Stage</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {repos.map((r, i) => {
                  const isForce = r.assignedTo === FORCE_FLAG;
                  return (
                    <tr key={r.repoId} style={{ background: i % 2 === 0 ? "#f8fafc" : "#fff" }}>
                      <td style={{ ...td, color: "#94a3b8", fontSize: 11, textAlign: "center" }}>
                        {(page - 1) * PAGE_SIZE + i + 1}
                      </td>

                      <td style={{ ...td, textAlign: "center" }}>
                        {!r.locked ? (
                          <input
                            type="checkbox"
                            checked={selected.includes(r.repoId)}
                            onChange={() => toggle(r.repoId)}
                            style={{ cursor: "pointer", width: 15, height: 15 }}
                          />
                        ) : !isForce ? (
                          <button style={reassignBtnStyle} onClick={() => setReassignRepo(r)}>
                            Reassign
                          </button>
                        ) : (
                          <span style={{ fontSize: 16 }}>🔒</span>
                        )}
                      </td>

                      <td style={{ ...td, fontWeight: 600 }}>{r.repoId}</td>

                      <td style={td}>
                        <span style={stageBadgeStyle(r.stage)}>{r.stage || "-"}</span>
                      </td>

                      <td style={td}>
                        {isForce ? (
                          <span style={forceBadge}>Force Billed</span>
                        ) : r.locked ? (
                          <span style={assignedBadge}>Assigned — {r.assignedTo}</span>
                        ) : (
                          <span style={pendingBadge}>Unassigned</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={pageBar}>
                <button disabled={page === 1}          onClick={() => setPage(p => p - 1)} style={pgBtn(page === 1)}>◀ Prev</button>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Page {page} of {totalPages} &nbsp;·&nbsp; {total} records</span>
                <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} style={pgBtn(page === totalPages)}>Next ▶</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Reassign Modal ── */}
      {reassignRepo && (
        <div style={modalBackdrop} onClick={() => setReassignRepo(null)}>
          <div style={modalCard} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              Reassign Repo
            </h3>
            <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, lineHeight: 1.8 }}>
              <div><b>Repo ID:</b> {reassignRepo.repoId}</div>
              <div><b>Currently Assigned:</b> {reassignRepo.assignedTo}</div>
              <div><b>Stage:</b> {reassignRepo.stage}</div>
            </div>
            <select
              value={reassignUser}
              onChange={e => setReassignUser(e.target.value)}
              style={{ ...dropSel, width: "100%", marginBottom: 10, boxSizing: "border-box" }}
            >
              <option value="">Select New User</option>
              {users.map(u => <option key={u.userId} value={u.userId}>{u.userId}</option>)}
            </select>
            <textarea
              placeholder="Reason (e.g. Holiday / Emergency)"
              value={reassignReason}
              onChange={e => setReassignReason(e.target.value)}
              rows={3}
              style={{
                width: "100%", padding: "8px 10px", borderRadius: 8,
                border: "1px solid #cbd5e1", fontSize: 13, resize: "vertical",
                boxSizing: "border-box", marginBottom: 14,
              }}
            />
            <div style={{ display: "flex", gap: 10 }}>
              <button style={primaryBtn} onClick={confirmReassign} disabled={!reassignUser}>
                Confirm Reassign
              </button>
              <button style={secBtn} onClick={() => setReassignRepo(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ── Subcomponents ── */

function DropGroup({ label, children }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 200px", minWidth: 0, maxWidth: 320 }}>
      <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.05em" }}>
        {label}
      </span>
      {children}
    </div>
  );
}

function Chip({ label, color }) {
  const map = {
    blue:   { bg: "#dbeafe", fg: "#1d4ed8" },
    amber:  { bg: "#fef3c7", fg: "#92400e" },
    purple: { bg: "#ede9fe", fg: "#7c3aed" },
    gray:   { bg: "#f1f5f9", fg: "#475569" },
  };
  const s = map[color] || map.gray;
  return (
    <span style={{ padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 600, background: s.bg, color: s.fg }}>
      {label}
    </span>
  );
}

function stageBadgeStyle(stage) {
  const colors = { transcription: "#0f766e", search: "#2563eb", supersede: "#7c3aed" };
  const c = colors[stage] || "#64748b";
  return { display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: c + "20", color: c };
}

/* ── Styles ── */
const controlCard     = { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "16px 20px", marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" };
const dropRow         = { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 };
const dropSel         = { padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: 13, width: "100%", boxSizing: "border-box" };
const actionRow       = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };
const primaryBtn      = { padding: "8px 18px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" };
const secBtn          = { padding: "8px 14px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontWeight: 600, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" };
const assignBtn       = { padding: "8px 18px", borderRadius: 8, border: "none", background: "#16a34a", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" };
const msgBox          = { padding: "10px 16px", background: "#eff6ff", color: "#1d4ed8", borderRadius: 8, fontWeight: 600, marginBottom: 12, fontSize: 13 };
const statsBar        = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 };
const tableWrap       = { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflowX: "auto" };
const th              = { padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" };
const td              = { padding: "9px 14px", borderBottom: "1px solid #f1f5f9", fontSize: 13, verticalAlign: "middle" };
const reassignBtnStyle = { padding: "4px 10px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700 };
const assignedBadge   = { display: "inline-block", padding: "3px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600, background: "#dcfce7", color: "#166534" };
const pendingBadge    = { display: "inline-block", padding: "3px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600, background: "#fef3c7", color: "#92400e" };
const forceBadge      = { display: "inline-block", padding: "3px 8px", borderRadius: 4, fontSize: 12, fontWeight: 600, background: "#fee2e2", color: "#991b1b" };
const pageBar         = { display: "flex", gap: 12, alignItems: "center", padding: "12px 16px", borderTop: "1px solid #f1f5f9" };
const pgBtn           = (dis) => ({ padding: "6px 14px", borderRadius: 6, border: "1px solid #cbd5e1", background: dis ? "#f1f5f9" : "#fff", color: dis ? "#94a3b8" : "#0f172a", fontWeight: 600, cursor: dis ? "not-allowed" : "pointer" });
const emptyState      = { padding: 48, textAlign: "center", color: "#94a3b8", fontSize: 14 };
const modalBackdrop   = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 };
const modalCard       = { background: "#fff", padding: "24px", borderRadius: 14, width: 440, boxShadow: "0 20px 50px rgba(0,0,0,0.2)" };
