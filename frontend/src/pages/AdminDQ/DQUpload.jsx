import React, { useRef, useState } from "react";
import api from "../../config/apiClient";

export default function DQUpload() {
  const [sheet, setSheet] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null); // { type: "success"|"error"|"warning"|"info", text }
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  function onDrop(e) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped && (dropped.name.endsWith(".xlsx") || dropped.name.endsWith(".xls"))) {
      setFile(dropped);
    } else {
      setMsg({ type: "error", text: "Only .xlsx or .xls files are accepted." });
    }
  }

  async function submitUpload() {
    if (!sheet.trim()) return setMsg({ type: "error", text: "Sheet name is required." });
    if (!dueDate) return setMsg({ type: "error", text: "Due date is required." });
    if (!file) return setMsg({ type: "error", text: "Please select an Excel file." });

    setLoading(true);
    setMsg({ type: "info", text: "Uploading…" });

    const fd = new FormData();
    fd.append("sheet", sheet.trim());
    fd.append("dueDate", dueDate);
    fd.append("file", file);

    try {
      const res = await api.post("/dq/upload", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const json = res.data;

      if (!json.ok) {
        setMsg({ type: "error", text: `Upload failed: ${json.error || "Unknown error"}` });
      } else {
        setMsg({ type: "success", text: `Upload successful — ${json.added} DQ records imported.` });
        setFile(null);
        setSheet("");
      }
    } catch {
      setMsg({ type: "error", text: "Server error during upload. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  const dqColumns = [
    "SDS #", "Chemical Product / Cost Apportionment", "Manufacturer",
    "Revision Date", "Language", "SDS Status", "Last Updated Date",
    "Days in Queue", "Sites In Use", "Supersede",
  ];

  const msgColors = {
    success: { bg: "#f0fdf4", border: "#86efac", text: "#16a34a" },
    error:   { bg: "#fef2f2", border: "#fca5a5", text: "#dc2626" },
    warning: { bg: "#fffbeb", border: "#fcd34d", text: "#92400e" },
    info:    { bg: "#eff6ff", border: "#93c5fd", text: "#2563eb" },
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0 }}>
          Upload DQ Excel
        </h1>
        <p style={{ color: "#64748b", fontSize: 14, margin: "6px 0 0" }}>
          Upload an Excel file to create a new Data Queue business in the system.
        </p>
      </div>

      {/* ── Upload Card ── */}
      <div style={card}>
        <div style={cardHeader}>
          <span style={{ fontSize: 18 }}>📤</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>Upload New DQ Business</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          {/* Sheet Name */}
          <div style={fieldWrap}>
            <label style={labelStyle}>DQ Business Name <span style={{ color: "#ef4444" }}>*</span></label>
            <input
              type="text"
              placeholder="e.g. DQ_MASTER_JAN"
              value={sheet}
              onChange={e => setSheet(e.target.value)}
              style={inputStyle}
            />
            <span style={hint}>Used to group all records in this upload</span>
          </div>

          {/* Due Date */}
          <div style={fieldWrap}>
            <label style={labelStyle}>Due Date <span style={{ color: "#ef4444" }}>*</span></label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              style={inputStyle}
            />
            <span style={hint}>Deadline for this DQ business</span>
          </div>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragging ? "#3b82f6" : file ? "#22c55e" : "#cbd5e1"}`,
            borderRadius: 10,
            background: dragging ? "#eff6ff" : file ? "#f0fdf4" : "#f8fafc",
            padding: "28px 20px",
            textAlign: "center",
            cursor: "pointer",
            transition: "all 0.2s",
            marginBottom: 18,
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: "none" }}
            onChange={e => setFile(e.target.files?.[0] || null)}
          />
          <div style={{ fontSize: 32, marginBottom: 8 }}>{file ? "✅" : "📂"}</div>
          {file ? (
            <>
              <div style={{ fontWeight: 700, color: "#16a34a", fontSize: 14 }}>{file.name}</div>
              <div style={{ color: "#64748b", fontSize: 12, marginTop: 4 }}>
                {(file.size / 1024).toFixed(1)} KB · Click to change
              </div>
            </>
          ) : (
            <>
              <div style={{ fontWeight: 600, color: "#334155", fontSize: 14 }}>
                Drop Excel file here or click to browse
              </div>
              <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 4 }}>
                Supports .xlsx and .xls formats
              </div>
            </>
          )}
        </div>

        {/* Message */}
        {msg && (
          <div style={{
            padding: "10px 14px", borderRadius: 8,
            background: msgColors[msg.type].bg,
            border: `1px solid ${msgColors[msg.type].border}`,
            color: msgColors[msg.type].text,
            fontSize: 13.5, fontWeight: 500, marginBottom: 16,
          }}>
            {msg.text}
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={submitUpload}
          disabled={loading}
          style={{
            width: "100%", padding: "11px 0",
            background: loading ? "#93c5fd" : "#2563eb",
            border: "none", borderRadius: 8, color: "#fff",
            fontSize: 15, fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.15s",
          }}
        >
          {loading ? "Uploading…" : "Upload DQ Excel"}
        </button>
      </div>

      {/* ── Required Columns ── */}
      <div style={{ ...card, marginTop: 24 }}>
        <div style={cardHeader}>
          <span style={{ fontSize: 18 }}>📄</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>Required Excel Columns</span>
          <span style={{
            marginLeft: "auto", background: "#fef9c3", color: "#854d0e",
            fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "2px 10px",
            border: "1px solid #fde68a",
          }}>
            {dqColumns.length} columns
          </span>
        </div>
        <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 14px" }}>
          Your Excel file must include these column headers. <strong>SDS #</strong> is the primary key — rows without it are skipped.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {dqColumns.map((col, i) => (
            <div key={col} style={{
              background: i === 0 ? "#eff6ff" : "#f8fafc",
              border: `1px solid ${i === 0 ? "#bfdbfe" : "#e2e8f0"}`,
              borderRadius: 6, padding: "5px 12px",
              fontSize: 12.5, color: i === 0 ? "#1d4ed8" : "#374151",
              fontWeight: i === 0 ? 700 : 500,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ color: "#2563eb", fontWeight: 700, fontSize: 11 }}>{i + 1}</span>
              {col}
              {i === 0 && <span style={{ fontSize: 10, color: "#2563eb", fontWeight: 800 }}>KEY</span>}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

const card = {
  background: "#fff", borderRadius: 12,
  padding: "20px 24px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
  border: "1px solid #f1f5f9",
};
const cardHeader = {
  display: "flex", alignItems: "center", gap: 10,
  marginBottom: 18, paddingBottom: 14,
  borderBottom: "1px solid #f1f5f9",
};
const fieldWrap = { display: "flex", flexDirection: "column", gap: 5 };
const labelStyle = { fontSize: 13, fontWeight: 600, color: "#374151" };
const hint = { fontSize: 11.5, color: "#94a3b8" };
const inputStyle = {
  padding: "9px 12px", borderRadius: 8,
  border: "1px solid #cbd5e1", fontSize: 13.5,
  color: "#0f172a", outline: "none", background: "#f8fafc",
};
