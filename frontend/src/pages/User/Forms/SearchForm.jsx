import React, { useState } from "react";
import api from "../../../config/apiClient";

const LANGUAGES = [
  "English",
  "French",
  "Spanish",
  "German",
  "Korean",
  "Chinese Simplified",
  "Chinese",
  "Portuguese",
  "Portuguese Portugal",
  "Italian",
  "Danish",
  "Czech",
  "Lithuanian",
  "Hungarian",
  "Norwegian",
  "Slovenian",
  "Thai",
  "Espanol",
  "Deutsch",
  "Others",
];

const SEARCH_COMMENTS = [
  "SDS through websearch",
  "Sent form request",
  "Sent mail request",
];

const SEARCH_COMMENTS_1 = [
  "Received SDS through mail request/weblink",
  "No revision in existing SDS",
];

const SEARCH_COMMENTS_2 = [
  "Yes",
  "No",
  "No update in revision date",
  "Discontinued",
  "Discontinued with an updated SDS",
  "Obsolete",
  "Exempted",
  "Article",
  "No general SDS (Discontinued)",
  "On hold after QC",
  "Error in link",
  "No contact details to send mail",
  "Need authorization or Customer's name",
  "Mismatch in SDS",
  "Non-English SDS",
  "PDF not available",
  "Not an SDS",
  "No matching records found",
  "Incomplete PDF",
  "Test file",
  "Archived",
];

export default function SearchForm({ sheet, refId, userId, searchData, onDone }) {
  const [loading, setLoading]               = useState(false);
  const [notPublishable, setNotPublishable]  = useState(searchData?.notPublishable || false);
  const [comments2, setComments2]            = useState(searchData?.comments2 || "");
  const [status, setStatus]                  = useState(searchData?.status || "");
  const [statusUpdated, setStatusUpdated]    = useState(false);
  const [language, setLanguage]              = useState(searchData?.language || "English");
  const [languageOther, setLanguageOther]    = useState(
    searchData?.language?.startsWith("Others: ")
      ? searchData.language.replace("Others: ", "")
      : ""
  );
  const [showSubmitModal, setShowSubmitModal]     = useState(false);
  const [showUncheckWarning, setShowUncheckWarning] = useState(false);

  const isMultilingual = language !== "English";
  const displayLanguage = language === "Others" && languageOther ? `Others: ${languageOther}` : language;

  const goesToSupersede = comments2 === "Yes";

  /* ── Comment 2 change handler ── */
  function handleComments2Change(val) {
    setComments2(val);
    if (val === "Yes") {
      setNotPublishable(false);
    } else if (val !== "") {
      setNotPublishable(true);
    }
  }

  /* ── Non-publishable uncheck handler ── */
  function handleNotPublishableChange(checked) {
    if (!checked && notPublishable) {
      setShowUncheckWarning(true);
    } else {
      setNotPublishable(checked);
    }
  }

  /* ── Confirm uncheck warning → reset Comment 2 to Yes ── */
  function confirmUncheck() {
    setNotPublishable(false);
    setComments2("Yes");
    setShowUncheckWarning(false);
  }

  /* ── collect form fields ── */
  function gatherFields() {
    const form = document.getElementById("sds-search-form");
    const fd   = new FormData(form);
    return {
      searchType:          fd.get("searchType")          || "",
      comments1:           fd.get("comments1")           || "",
      comments2,
      websearch1:          fd.get("websearch1")          || "",
      websearch2:          fd.get("websearch2")          || "",
      websearch3:          fd.get("websearch3")          || "",
      mailId:              fd.get("mailId")              || "",
      remarks:             fd.get("remarks")             || "",
      supersedeObservation:fd.get("supersedeObservation")|| "",
      startDate:           fd.get("startDate")           || "",
      endDate:             fd.get("endDate")             || "",
      notPublishableReason:fd.get("notPublishableReason")|| "",
    };
  }

  /* ── Update Status ── */
  const handleStatusUpdate = async (e) => {
    e?.preventDefault();
    if (!status) { alert("Please select a status"); return; }
    try {
      const fields = gatherFields();
      const res = await api.post("/sds/workflow/update-status", {
        sheet, refId, userId, status,
        language, languageOther,
        notPublishable: String(notPublishable),
        ...fields,
      });
      if (!res.data.ok) { alert("Failed to update status"); return; }
      setStatusUpdated(true);
      alert("✅ Status updated successfully");
    } catch (err) {
      console.error(err);
      alert("❌ Error updating status");
    }
  };

  /* ── Submit button clicked → show confirmation modal ── */
  function handleSubmitClick(e) {
    e.preventDefault();
    if (!userId) { alert("Session expired. Please login again."); return; }
    setShowSubmitModal(true);
  }

  /* ── Actual submit after modal Proceed ── */
  async function proceedSubmit() {
    setShowSubmitModal(false);
    const fields = gatherFields();
    const fd = new FormData();
    Object.entries({ sheet, refId, userId, language, languageOther,
                     notPublishable: String(notPublishable), ...fields }).forEach(([k,v]) => fd.append(k, v));
    const pdfInput = document.querySelector('input[name="pdf"]');
    if (pdfInput?.files?.[0]) fd.append("pdf", pdfInput.files[0]);
    try {
      setLoading(true);
      const res = await api.post("/sds/workflow/search", fd);
      if (!res.data.ok) { alert(res.data.error || "Submit failed"); return; }
      alert("✅ Search submitted successfully");
      onDone && onDone();
    } catch (err) {
      console.error(err);
      alert("❌ Submit failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={card}>
      {/* ── Header ── */}
      <div style={header}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "#93c5fd", textTransform: "uppercase", marginBottom: 4 }}>
            Workflow Stage
          </div>
          <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#fff" }}>🔍 Search Stage</h2>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: "#93c5fd", marginBottom: 4 }}>Ref ID</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#fff", fontFamily: "monospace" }}>{refId}</div>
        </div>
      </div>

      <form id="sds-search-form" onSubmit={e => e.preventDefault()} style={{ padding: "20px 24px 24px" }}>

        {/* ── Section: Language Detection ── */}
        <SectionLabel icon="🌐" title="Language Detection" />
        <div style={sectionBox}>
          <div style={grid2}>
            <div style={field}>
              <FieldLabel>SDS Language</FieldLabel>
              <select
                value={language}
                onChange={e => { setLanguage(e.target.value); if (e.target.value !== "Others") setLanguageOther(""); }}
                style={sel}
              >
                {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>

            {language === "Others" && (
              <div style={field}>
                <FieldLabel>Specify Language</FieldLabel>
                <input
                  type="text"
                  placeholder="Enter language name"
                  value={languageOther}
                  onChange={e => setLanguageOther(e.target.value)}
                  style={inp}
                />
              </div>
            )}

            <div style={{ display: "flex", alignItems: "flex-end", paddingBottom: 2 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 999, fontWeight: 700, fontSize: 12,
                background: isMultilingual ? "#fef3c7" : "#dcfce7",
                color: isMultilingual ? "#92400e" : "#166534",
                border: `1px solid ${isMultilingual ? "#fbbf24" : "#86efac"}`,
              }}>
                <span style={{ fontSize: 14 }}>{isMultilingual ? "🌍" : "🇬🇧"}</span>
                {isMultilingual ? `Multilingual — ${displayLanguage}` : "English"}
              </div>
            </div>
          </div>
        </div>

        {/* ── Section: Search Details ── */}
        <SectionLabel icon="📋" title="Search Details" />
        <div style={sectionBox}>
          <div style={grid3}>
            <div style={field}>
              <FieldLabel>Search Comments</FieldLabel>
              <select name="searchType" defaultValue={searchData?.searchType || ""} style={sel}>
                <option value="" disabled>Select</option>
                {SEARCH_COMMENTS.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div style={field}>
              <FieldLabel>Search Comments 1</FieldLabel>
              <select name="comments1" defaultValue={searchData?.comments1 || ""} style={sel}>
                <option value="" disabled>Select</option>
                {SEARCH_COMMENTS_1.map(v => <option key={v}>{v}</option>)}
              </select>
            </div>
            <div style={field}>
              <FieldLabel>Search Comments 2</FieldLabel>
              <select
                value={comments2}
                onChange={e => handleComments2Change(e.target.value)}
                style={sel}
              >
                <option value="" disabled>Select</option>
                {SEARCH_COMMENTS_2.map(v => <option key={v}>{v}</option>)}
              </select>
              {comments2 && (
                <div style={{
                  marginTop: 6, display: "inline-flex", alignItems: "center", gap: 5,
                  fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 99,
                  background: goesToSupersede ? "#ede9fe" : "#fef3c7",
                  color: goesToSupersede ? "#6d28d9" : "#92400e",
                  border: `1px solid ${goesToSupersede ? "#c4b5fd" : "#fbbf24"}`,
                  alignSelf: "flex-start",
                }}>
                  {goesToSupersede ? "→ Supersede" : "→ Transcription (skips Supersede)"}
                </div>
              )}
            </div>
          </div>

          <div style={{ ...grid3, marginTop: 12 }}>
            <div style={field}>
              <FieldLabel>Websearch Link 1</FieldLabel>
              <input name="websearch1" placeholder="https://" defaultValue={searchData?.websearch1 || ""} style={inp} />
            </div>
            <div style={field}>
              <FieldLabel>Websearch Link 2</FieldLabel>
              <input name="websearch2" placeholder="https://" defaultValue={searchData?.websearch2 || ""} style={inp} />
            </div>
            <div style={field}>
              <FieldLabel>Websearch Link 3</FieldLabel>
              <input name="websearch3" placeholder="https://" defaultValue={searchData?.websearch3 || ""} style={inp} />
            </div>
          </div>

          <div style={{ ...grid2, marginTop: 12 }}>
            <div style={field}>
              <FieldLabel>Mail ID / Source</FieldLabel>
              <input name="mailId" placeholder="Enter email or source" defaultValue={searchData?.mailId || ""} style={inp} />
            </div>
            <div />
          </div>
        </div>

        {/* ── Section: Dates & Notes ── */}
        <SectionLabel icon="📅" title="Dates & Notes" />
        <div style={sectionBox}>
          <div style={grid2}>
            <div style={field}>
              <FieldLabel>Start Date</FieldLabel>
              <input type="date" name="startDate" defaultValue={searchData?.startDate || ""} style={inp} />
            </div>
            <div style={field}>
              <FieldLabel>End Date</FieldLabel>
              <input type="date" name="endDate" defaultValue={searchData?.endDate || ""} style={inp} />
            </div>
            <div style={{ ...field, gridColumn: "span 2" }}>
              <FieldLabel>Remarks</FieldLabel>
              <textarea name="remarks" defaultValue={searchData?.remarks || ""} rows={3} style={ta} />
            </div>
            <div style={{ ...field, gridColumn: "span 2" }}>
              <FieldLabel>Supersede Observation</FieldLabel>
              <textarea name="supersedeObservation" defaultValue={searchData?.supersedeObservation || ""} rows={3} style={ta} />
            </div>
          </div>
        </div>

        {/* ── Section: Status ── */}
        <SectionLabel icon="📌" title="Status Update" />
        <div style={sectionBox}>
          <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div style={{ flex: "1 1 200px" }}>
              <FieldLabel>Current Status</FieldLabel>
              <select value={status} onChange={e => { setStatus(e.target.value); setStatusUpdated(false); }} style={sel}>
                <option value="" disabled>Select Status</option>
                <option value="File available">File available</option>
                <option value="No file Found">No file Found</option>
                <option value="Waiting Response">Waiting Response</option>
              </select>
            </div>
            <button type="button" onClick={handleStatusUpdate} disabled={!status} style={updateBtn}>
              Update Status
            </button>
            {statusUpdated && (
              <span style={{ fontSize: 12, color: "#16a34a", fontWeight: 700 }}>✓ Saved</span>
            )}
          </div>
        </div>

        {/* ── Section: Not Publishable ── */}
        <div style={{ ...sectionBox, background: notPublishable ? "#fef2f2" : "#f8fafc", borderColor: notPublishable ? "#fca5a5" : "#e2e8f0", opacity: goesToSupersede ? 0.45 : 1, transition: "opacity 0.2s" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: goesToSupersede ? "not-allowed" : "pointer" }}>
            <input
              type="checkbox"
              checked={notPublishable}
              disabled={goesToSupersede}
              onChange={e => handleNotPublishableChange(e.target.checked)}
              style={{ width: 16, height: 16, cursor: goesToSupersede ? "not-allowed" : "pointer" }}
            />
            <span style={{ fontWeight: 700, fontSize: 14, color: notPublishable ? "#dc2626" : "#0f172a" }}>
              Not Publishable
            </span>
            {goesToSupersede && (
              <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>
                (not applicable when Comment 2 is "Yes")
              </span>
            )}
          </label>
          <p style={{ margin: "6px 0 0 26px", fontSize: 12, color: "#475569" }}>
            If checked, this record will skip Supersede and go directly to Transcription.
          </p>
          {notPublishable && (
            <div style={{ marginTop: 10 }}>
              <FieldLabel>Reason for Not Publishable</FieldLabel>
              <textarea
                name="notPublishableReason"
                placeholder="Enter reason"
                defaultValue={searchData?.notPublishableReason || ""}
                rows={2}
                required
                style={ta}
              />
            </div>
          )}
        </div>

        {/* ── Section: PDF Upload ── */}
        <SectionLabel icon="📎" title="PDF Upload" />
        <div style={{ ...sectionBox, display: "flex", alignItems: "center", gap: 16 }}>
          <label style={{
            display: "flex", alignItems: "center", gap: 10, padding: "10px 20px",
            borderRadius: 8, border: "2px dashed #cbd5e1", background: "#f8fafc",
            cursor: "pointer", flex: 1, color: "#475569", fontSize: 13, fontWeight: 600,
          }}>
            <span style={{ fontSize: 20 }}>📄</span>
            <span>Click to upload PDF (optional)</span>
            <input type="file" name="pdf" accept="application/pdf" style={{ display: "none" }} />
          </label>
        </div>

        {/* ── Submit ── */}
        <div style={{ marginTop: 20, display: "flex", gap: 12, alignItems: "center" }}>
          <button
            type="button"
            onClick={handleSubmitClick}
            disabled={loading || !statusUpdated || status === "Waiting Response"}
            style={{
              padding: "12px 32px", borderRadius: 10, border: "none",
              background: (loading || !statusUpdated || status === "Waiting Response") ? "#94a3b8" : "#2563eb",
              color: "#fff", fontWeight: 800, fontSize: 15, cursor: (loading || !statusUpdated || status === "Waiting Response") ? "not-allowed" : "pointer",
              boxShadow: "0 4px 14px rgba(37,99,235,0.35)",
            }}
          >
            {loading ? "Submitting..." : "✓ Submit Search"}
          </button>
          {!statusUpdated && (
            <span style={{ fontSize: 12, color: "#f59e0b", fontWeight: 600 }}>
              ⚠ Update Status first to enable submit
            </span>
          )}
        </div>

      </form>

      {/* ── Submit Confirmation Modal ── */}
      {showSubmitModal && (
        <div style={modalBackdrop} onClick={() => setShowSubmitModal(false)}>
          <div style={modalCard} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>
              {goesToSupersede ? "🔄" : "⚡"}
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
              Confirm Submission
            </div>
            <div style={{
              padding: "14px 16px", borderRadius: 10, marginBottom: 18,
              background: goesToSupersede ? "#f5f3ff" : "#fffbeb",
              border: `1px solid ${goesToSupersede ? "#c4b5fd" : "#fbbf24"}`,
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: goesToSupersede ? "#6d28d9" : "#92400e", marginBottom: 4 }}>
                {goesToSupersede ? "→ Next Stage: Supersede" : "→ Next Stage: Transcription"}
              </div>
              <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.6 }}>
                {goesToSupersede
                  ? "Comment 2 is \"Yes\" — this record will proceed to the Supersede stage after search."
                  : "Comment 2 indicates a non-publishable outcome — this record will skip Supersede and go directly to Transcription."}
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={proceedSubmit}
                style={{ flex: 1, padding: "11px", borderRadius: 9, border: "none", background: "#2563eb", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
              >
                Proceed
              </button>
              <button
                onClick={() => setShowSubmitModal(false)}
                style={{ flex: 1, padding: "11px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", color: "#0f172a", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Uncheck Warning Modal ── */}
      {showUncheckWarning && (
        <div style={modalBackdrop} onClick={() => setShowUncheckWarning(false)}>
          <div style={modalCard} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a", marginBottom: 8 }}>
              Remove Non-Publishable?
            </div>
            <div style={{
              padding: "14px 16px", borderRadius: 10, marginBottom: 18,
              background: "#fef2f2", border: "1px solid #fca5a5",
            }}>
              <div style={{ fontSize: 13, color: "#b91c1c", lineHeight: 1.6 }}>
                Unchecking <strong>Non-Publishable</strong> will automatically reset <strong>Comment 2 to "Yes"</strong> and route this record to <strong>Supersede</strong> instead of Transcription.
              </div>
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={confirmUncheck}
                style={{ flex: 1, padding: "11px", borderRadius: 9, border: "none", background: "#dc2626", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer" }}
              >
                Yes, Continue
              </button>
              <button
                onClick={() => setShowUncheckWarning(false)}
                style={{ flex: 1, padding: "11px", borderRadius: 9, border: "1.5px solid #e2e8f0", background: "#fff", color: "#0f172a", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

/* ── Sub-components ── */
function SectionLabel({ icon, title }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "18px 0 8px", fontSize: 12, fontWeight: 700, color: "#2563eb", textTransform: "uppercase", letterSpacing: "0.06em" }}>
      <span>{icon}</span>
      <span>{title}</span>
      <div style={{ flex: 1, height: 1, background: "#e2e8f0", marginLeft: 6 }} />
    </div>
  );
}

function FieldLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 700, color: "#1e293b", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 5 }}>{children}</div>;
}

/* ── Styles ── */
const card       = { background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", boxShadow: "0 4px 20px rgba(0,0,0,0.08)", overflow: "hidden" };
const header     = { background: "linear-gradient(135deg, #1e40af 0%, #2563eb 60%, #3b82f6 100%)", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" };
const sectionBox = { background: "#f8fafc", borderRadius: 10, border: "1.5px solid #cbd5e1", padding: "14px 16px", marginBottom: 4 };
const grid2      = { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "12px 16px" };
const grid3      = { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px 16px" };
const field      = { display: "flex", flexDirection: "column" };
const sel        = { padding: "8px 10px", borderRadius: 8, border: "2px solid #94a3b8", background: "#fff", fontSize: 13, color: "#0f172a", width: "100%", boxSizing: "border-box", outline: "none" };
const inp        = { padding: "8px 10px", borderRadius: 8, border: "2px solid #94a3b8", background: "#fff", fontSize: 13, color: "#0f172a", width: "100%", boxSizing: "border-box", outline: "none" };
const ta         = { padding: "8px 10px", borderRadius: 8, border: "2px solid #94a3b8", background: "#fff", fontSize: 13, color: "#0f172a", width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" };
const updateBtn    = { padding: "9px 20px", borderRadius: 8, border: "none", background: "#0f172a", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer", whiteSpace: "nowrap" };
const modalBackdrop = { position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 999 };
const modalCard     = { background: "#fff", borderRadius: 16, padding: "28px 28px 24px", width: 420, boxShadow: "0 20px 60px rgba(0,0,0,0.2)", textAlign: "center" };
