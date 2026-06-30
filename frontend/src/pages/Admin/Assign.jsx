import React, { useEffect, useState } from "react";
import api from "../../config/apiClient";

const PAGE_SIZE = 100;

export default function AdminAssignSDS() {
  const [sheets, setSheets]           = useState([]);
  const [sheet, setSheet]             = useState("");
  const [stageFilter, setStageFilter] = useState("search");

  const [users, setUsers]             = useState([]);
  const [assignUser, setAssignUser]   = useState("");

  const [companies, setCompanies]     = useState([]);
  const [company, setCompany]         = useState("");

  const [manufacturers, setManufacturers]             = useState([]);
  const [repositoryNo, setRepositoryNo]               = useState("");
  const [searchRepo, setSearchRepo]                   = useState("");
  const [manufacturersSelected, setManufacturersSelected] = useState([]);
  const [showManuDropdown, setShowManuDropdown]       = useState(false);

  const [refs, setRefs]   = useState([]);
  const [page, setPage]   = useState(1);
  const [total, setTotal] = useState(0);

  const [selected, setSelected] = useState([]);
  const [msg, setMsg]           = useState("");

  const [reassignRef, setReassignRef]       = useState(null);
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
    api.get("/sds/sheets").then(res => {
      if (res.data.ok) setSheets(res.data.sheets || []);
    });
  }, []);

  /* ── Reset company/manu on sheet change ── */
  useEffect(() => {
    setCompany("");
    setManufacturersSelected([]);
  }, [sheet]);

  /* ── Load business entities ── */
  useEffect(() => {
    if (!sheet) { setCompanies([]); setCompany(""); return; }
    api.get("/admin/sds/manufacturers", { params: { sheet } })
      .then(res => setCompanies(res.data.manufacturers || []))
      .catch(() => setCompanies([]));
  }, [sheet]);

  /* ── Load manufacturer names ── */
  useEffect(() => {
    if (!sheet) { setManufacturers([]); setManufacturersSelected([]); return; }
    api.get("/admin/sds/manufacturer-names", { params: { sheet } })
      .then(res => setManufacturers(res.data.manufacturers || []))
      .catch(() => setManufacturers([]));
  }, [sheet]);

  /* ── Reset page on filter change ── */
  useEffect(() => { setPage(1); }, [sheet, stageFilter, company, manufacturersSelected]);

  /* ── Load references (debounced) ── */
  useEffect(() => {
    const timer = setTimeout(() => {
      if (!sheet && !repositoryNo) return;
      if (repositoryNo && repositoryNo.length < 5) return;

      setMsg("Loading...");
      setSelected([]);

      const params = { sheet, stage: stageFilter, page, pageSize: PAGE_SIZE };
      if (repositoryNo.trim())            params.repositoryNo  = repositoryNo.trim();
      if (company)                        params.company       = company;
      if (manufacturersSelected.length)   params.manufacturer  = manufacturersSelected;

      api.get("/admin/workflow/list", {
        params,
        paramsSerializer: p => {
          const s = new URLSearchParams();
          Object.entries(p).forEach(([k, v]) => {
            if (Array.isArray(v)) v.forEach(i => s.append(k, i));
            else if (v !== undefined) s.append(k, v);
          });
          return s.toString();
        },
      })
        .then(res => {
          if (res.data.ok) { setRefs(res.data.rows || []); setTotal(res.data.total || 0); setMsg(""); }
          else { setRefs([]); setMsg("Failed to load"); }
        })
        .catch(() => { setRefs([]); setMsg("Failed to load"); });
    }, 700);

    return () => clearTimeout(timer);
  }, [sheet, stageFilter, company, manufacturersSelected, page, repositoryNo]);

  /* ── Manufacturer multi-select ── */
  const toggleManufacturer = m =>
    setManufacturersSelected(prev =>
      prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]
    );

  /* ── Row selection ── */
  const toggle     = id => setSelected(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const validCount = refs.filter(r => !r.assignedTo && r.currentStage === stageFilter).length;
  const selectAll  = () =>
    setSelected(refs.filter(r => !r.assignedTo && r.currentStage === stageFilter).map(r => r.referenceId));

  /* ── Assign ── */
  const assignSelected = async () => {
    if (!sheet || !assignUser || selected.length === 0) {
      setMsg("Select sheet, user & references");
      return;
    }
    setMsg("Assigning...");
    await api.post("/admin/workflow/assign-bulk", {
      sheet, refIds: selected, stage: stageFilter, userId: assignUser,
    });
    setSelected([]);
    setMsg("Assignment complete");
  };

  /* ── Reassign ── */
  const confirmReassign = async () => {
    if (!reassignUser) { alert("Select user to reassign"); return; }
    await api.post("/sds/reassign", {
      sheet, refId: reassignRef.referenceId, newUserId: reassignUser, reason: reassignReason,
    });
    setReassignRef(null); setReassignUser(""); setReassignReason("");
    setMsg("Reassigned successfully");
  };

  /* ── Reset ── */
  const resetFilters = () => {
    setCompany(""); setManufacturersSelected([]);
    setSearchRepo(""); setRepositoryNo("");
    setShowManuDropdown(false);
  };

  return (
    <>
      <h2 style={{ margin: "0 0 16px", fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
        Assign SDS Workflow
      </h2>

      {/* ── Control Card ── */}
      <div style={controlCard}>

        {/* Row 1: 5 labeled dropdowns */}
        <div style={dropRow}>

          <DropGroup label="Sheet">
            <select value={sheet} onChange={e => setSheet(e.target.value)} style={dropSel}>
              <option value="">Select Sheet</option>
              {sheets.map(s => <option key={s}>{s}</option>)}
            </select>
          </DropGroup>

          <DropGroup label="Stage">
            <select value={stageFilter} onChange={e => setStageFilter(e.target.value)} style={dropSel}>
              <option value="search">Search</option>
              <option value="supersede">Supersede</option>
              <option value="transcription">Transcription</option>
            </select>
          </DropGroup>

          <DropGroup label="Assign To">
            <select value={assignUser} onChange={e => setAssignUser(e.target.value)} style={dropSel}>
              <option value="">Select User</option>
              {users.map(u => <option key={u.userId} value={u.userId}>{u.userId}</option>)}
            </select>
          </DropGroup>

          <DropGroup label="Business Entity">
            <select value={company} onChange={e => setCompany(e.target.value)} style={dropSel}>
              <option value="">All Entities</option>
              {companies.map(c => <option key={c}>{c}</option>)}
            </select>
          </DropGroup>

          <DropGroup label={manufacturersSelected.length ? `Manufacturer (${manufacturersSelected.length})` : "Manufacturer"}>
            <div style={{ position: "relative" }}>
              <button
                style={{
                  ...dropSel, cursor: "pointer", textAlign: "left",
                  color: manufacturersSelected.length ? "#1d4ed8" : "#64748b",
                  fontWeight: manufacturersSelected.length ? 600 : 400,
                }}
                onClick={() => setShowManuDropdown(p => !p)}
              >
                {manufacturersSelected.length === 0 ? "All Manufacturers" : `${manufacturersSelected.length} selected`}
                {" "}▾
              </button>

              {showManuDropdown && (
                <div style={manuPanel}>
                  <div style={{ padding: "7px 12px", borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                      {manufacturers.length} manufacturers
                    </span>
                    <button
                      style={{ fontSize: 12, color: "#dc2626", background: "none", border: "none", cursor: "pointer", fontWeight: 600 }}
                      onClick={() => setManufacturersSelected([])}
                    >
                      Clear all
                    </button>
                  </div>
                  {manufacturers.map(m => {
                    const checked = manufacturersSelected.includes(m);
                    return (
                      <div
                        key={m}
                        onClick={() => toggleManufacturer(m)}
                        style={{
                          padding: "7px 12px", fontSize: 13, cursor: "pointer",
                          display: "flex", alignItems: "center", gap: 8,
                          background: checked ? "#eff6ff" : "transparent",
                          color: checked ? "#1d4ed8" : "#0f172a",
                          fontWeight: checked ? 600 : 400,
                        }}
                      >
                        <span style={{
                          width: 14, height: 14, borderRadius: 3, flexShrink: 0,
                          border: `2px solid ${checked ? "#2563eb" : "#cbd5e1"}`,
                          background: checked ? "#2563eb" : "#fff",
                          display: "inline-flex", alignItems: "center", justifyContent: "center",
                        }}>
                          {checked && <span style={{ color: "#fff", fontSize: 9, lineHeight: 1 }}>✓</span>}
                        </span>
                        {m}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </DropGroup>

        </div>

        {/* Row 2: Search + action buttons */}
        <div style={actionRow}>
          <input
            type="text"
            placeholder="Search repository number…"
            value={searchRepo}
            onChange={e => setSearchRepo(e.target.value)}
            style={searchInput}
          />
          <button onClick={() => { setRepositoryNo(searchRepo.trim()); setPage(1); }} style={primaryBtn}>
            Search
          </button>
          <button onClick={resetFilters} style={secBtn}>↺ Reset</button>
          <button onClick={selectAll}    style={secBtn}>Select All ({validCount})</button>
          <button onClick={assignSelected} style={assignBtn}>
            Assign Selected{selected.length > 0 ? ` (${selected.length})` : ""}
          </button>
        </div>

      </div>

      {/* Message */}
      {msg && <div style={msgBox}>{msg}</div>}

      {/* Stats */}
      {total > 0 && (
        <div style={statsBar}>
          <Chip label={`Total: ${total} records`}      color="blue"   />
          <Chip label={`Selected: ${selected.length}`} color="purple" />
          <Chip label={`Page ${page} of ${totalPages}`} color="gray"  />
        </div>
      )}

      {/* Table */}
      <div style={tableWrap}>
        {refs.length === 0 ? (
          <div style={emptyState}>
            {!sheet ? "Select a sheet to load records" : "No records found for the current filters."}
          </div>
        ) : (
          <>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
              <thead>
                <tr style={{ background: "#0f172a", color: "#fff", position: "sticky", top: 0, zIndex: 2 }}>
                  <th style={th}>#</th>
                  <th style={th}>Action</th>
                  <th style={th}>Reference ID</th>
                  <th style={th}>Business Entity</th>
                  <th style={{ ...th, minWidth: 200 }}>Chemical Product</th>
                  {stageFilter === "transcription" && (
                    <>
                      <th style={th}>Comments 2</th>
                      <th style={th}>New Repo #</th>
                    </>
                  )}
                  <th style={th}>Stage</th>
                  <th style={th}>Status</th>
                </tr>
              </thead>
              <tbody>
                {refs.map((r, i) => (
                  <tr
                    key={r.referenceId}
                    style={{ background: r.duplicate ? "#fff7ed" : i % 2 === 0 ? "#f8fafc" : "#fff" }}
                  >
                    <td style={{ ...td, color: "#94a3b8", fontSize: 11, textAlign: "center" }}>
                      {(page - 1) * PAGE_SIZE + i + 1}
                    </td>

                    <td style={{ ...td, textAlign: "center" }}>
                      {!r.assignedTo ? (
                        <input
                          type="checkbox"
                          checked={selected.includes(r.referenceId)}
                          onChange={() => toggle(r.referenceId)}
                          style={{ cursor: "pointer", width: 15, height: 15 }}
                        />
                      ) : (
                        <button style={reassignBtnStyle} onClick={() => setReassignRef(r)}>
                          Reassign
                        </button>
                      )}
                    </td>

                    <td style={td}>
                      <span style={{ fontWeight: 600 }}>{r.referenceId}</span>
                      {r.duplicate && <span style={dupBadge}>DUP</span>}
                      {r.reassignHistory?.length > 0 && <span style={reassignedBadge}>REASSIGNED</span>}
                    </td>

                    <td style={td}>{r.businessEntity || "-"}</td>

                    <td
                      style={{ ...td, maxWidth: 220, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      title={r.chemicalProduct}
                    >
                      {r.chemicalProduct || "-"}
                    </td>

                    {stageFilter === "transcription" && (
                      <>
                        <td style={td}>{r.comments2 || "-"}</td>
                        <td style={td}>{r.newRepositoryNumber || "-"}</td>
                      </>
                    )}

                    <td style={td}>
                      <span style={stageBadge(r.currentStage)}>{r.currentStage}</span>
                    </td>

                    <td style={td}>
                      {r.assignedTo
                        ? <span style={{ color: "#16a34a", fontWeight: 600, fontSize: 12 }}>Assigned</span>
                        : <span style={{ color: "#f59e0b", fontWeight: 600, fontSize: 12 }}>Pending</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={pageBar}>
                <button disabled={page === 1}          onClick={() => setPage(p => Math.max(1, p - 1))}          style={pgBtn(page === 1)}>◀ Prev</button>
                <span style={{ fontWeight: 600, fontSize: 13 }}>Page {page} of {totalPages} &nbsp;·&nbsp; {total} records</span>
                <button disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))} style={pgBtn(page === totalPages)}>Next ▶</button>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Reassign Modal ── */}
      {reassignRef && (
        <div style={modalBackdrop} onClick={() => setReassignRef(null)}>
          <div style={modalCard} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: "0 0 14px", fontSize: 16, fontWeight: 700, color: "#0f172a" }}>
              Reassign Reference
            </h3>
            <div style={{ background: "#f8fafc", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 13, lineHeight: 1.8 }}>
              <div><b>Reference ID:</b> {reassignRef.referenceId}</div>
              <div><b>Currently Assigned:</b> {reassignRef.assignedTo}</div>
              <div><b>Stage:</b> {reassignRef.currentStage}</div>
            </div>
            <select
              value={reassignUser}
              onChange={e => setReassignUser(e.target.value)}
              style={{ ...dropSel, width: "100%", marginBottom: 10, boxSizing: "border-box" }}
            >
              <option value="">Select New User</option>
              {users.filter(u => u.userId !== reassignRef?.assignedTo).map(u => (
                <option key={u.userId} value={u.userId}>{u.userId}</option>
              ))}
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
              <button style={secBtn} onClick={() => setReassignRef(null)}>Cancel</button>
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
    <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 160px", minWidth: 0 }}>
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

function stageBadge(stage) {
  const colors = { search: "#2563eb", supersede: "#7c3aed", transcription: "#0f766e" };
  const c = colors[stage] || "#64748b";
  return { display: "inline-block", padding: "2px 8px", borderRadius: 4, fontSize: 11, fontWeight: 700, background: c + "20", color: c };
}

/* ── Styles ── */
const controlCard    = { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", padding: "16px 20px", marginBottom: 14, boxShadow: "0 2px 8px rgba(0,0,0,0.04)" };
const dropRow        = { display: "flex", gap: 12, flexWrap: "wrap", marginBottom: 14 };
const dropSel        = { padding: "8px 10px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: 13, width: "100%", boxSizing: "border-box" };
const actionRow      = { display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" };
const searchInput    = { padding: "8px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#f8fafc", fontSize: 13, flex: "1 1 220px", minWidth: 0 };
const primaryBtn     = { padding: "8px 18px", borderRadius: 8, border: "none", background: "#2563eb", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" };
const secBtn         = { padding: "8px 14px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontWeight: 600, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" };
const assignBtn      = { padding: "8px 18px", borderRadius: 8, border: "none", background: "#16a34a", color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" };
const msgBox         = { padding: "10px 16px", background: "#eff6ff", color: "#1d4ed8", borderRadius: 8, fontWeight: 600, marginBottom: 12, fontSize: 13 };
const statsBar       = { display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 12 };
const tableWrap      = { background: "#fff", borderRadius: 10, border: "1px solid #e2e8f0", overflowX: "auto" };
const th             = { padding: "10px 12px", textAlign: "left", fontWeight: 600, fontSize: 11, whiteSpace: "nowrap" };
const td             = { padding: "9px 12px", borderBottom: "1px solid #f1f5f9", fontSize: 13, verticalAlign: "middle" };
const dupBadge       = { marginLeft: 6, padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: "#fef2f2", color: "#dc2626", border: "1px solid #fecaca" };
const reassignedBadge = { marginLeft: 6, padding: "2px 6px", borderRadius: 4, fontSize: 10, fontWeight: 700, background: "#fefce8", color: "#92400e", border: "1px solid #fde68a" };
const reassignBtnStyle = { padding: "4px 10px", background: "#f59e0b", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 11, fontWeight: 700 };
const pageBar        = { display: "flex", gap: 12, alignItems: "center", padding: "12px 16px", borderTop: "1px solid #f1f5f9" };
const pgBtn          = (dis) => ({ padding: "6px 14px", borderRadius: 6, border: "1px solid #cbd5e1", background: dis ? "#f1f5f9" : "#fff", color: dis ? "#94a3b8" : "#0f172a", fontWeight: 600, cursor: dis ? "not-allowed" : "pointer" });
const emptyState     = { padding: 48, textAlign: "center", color: "#94a3b8", fontSize: 14 };
const manuPanel      = { position: "absolute", top: 40, left: 0, width: 340, maxHeight: 260, overflowY: "auto", background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10, boxShadow: "0 10px 30px rgba(0,0,0,0.12)", zIndex: 30 };
const modalBackdrop  = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 };
const modalCard      = { background: "#fff", padding: "24px", borderRadius: 14, width: 440, boxShadow: "0 20px 50px rgba(0,0,0,0.2)" };
