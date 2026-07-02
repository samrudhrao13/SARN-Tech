import React, { useEffect, useRef, useState } from "react";
import api from "../../config/apiClient";

export default function BatchUpload() {
  const [sheet, setSheet] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null); // { type: "success"|"error"|"info", text }
  const [sheets, setSheets] = useState([]);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef();

  useEffect(() => { loadSheets(); }, []);

  async function loadSheets() {
    try {
      const res = await api.get("/batch/sheets");
      if (res.data.ok) setSheets(res.data.sheets || []);
    } catch {}
  }

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

  async function uploadFile() {
    if (!sheet.trim()) return setMsg({ type: "error", text: "Sheet name is required." });
    if (!dueDate) return setMsg({ type: "error", text: "Due date is required." });
    if (!file) return setMsg({ type: "error", text: "Please select an Excel file." });

    try {
      setLoading(true);
      setMsg({ type: "info", text: "Uploading…" });

      const formData = new FormData();
      formData.append("sheet", sheet);
      formData.append("dueDate", dueDate);
      formData.append("file", file);

      const res = await api.post("/batch/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data.ok) {
        setMsg({ type: "success", text: `Upload successful — ${res.data.count} records imported.` });
        setFile(null);
        loadSheets();
      } else {
        setMsg({ type: "error", text: res.data.error || "Upload failed." });
      }
    } catch {
      setMsg({ type: "error", text: "Upload failed. Please try again." });
    } finally {
      setLoading(false);
    }
  }

  const columns = [
    "Chemical Name", "Manufacturer Name", "Revision Date", "Site Approval Status",
    "Site Name", "Site SDS #", "Manufacturer Country", "Language", "Verified Date",
    "PDF Uploaded?", "Status (PDF QC Status)", "Repository No.", "Product Code",
    "PDF File Name", "QC Complete By", "Search Verification Action",
    "Email Address / Website", "Search Completed By", "Comments",
  ];

  const msgColors = {
    success: { bg: "#f0fdf4", border: "#86efac", text: "#16a34a" },
    error:   { bg: "#fef2f2", border: "#fca5a5", text: "#dc2626" },
    info:    { bg: "#eff6ff", border: "#93c5fd", text: "#2563eb" },
  };

  return (
    <div style={{ padding: "28px 32px", maxWidth: 900, margin: "0 auto" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: "#0f172a", margin: 0 }}>
          Batch Upload
        </h1>
        <p style={{ color: "#64748b", fontSize: 14, margin: "6px 0 0" }}>
          Upload an Excel file to create a new batch business in the system.
        </p>
      </div>

      {/* ── Upload Card ── */}
      <div style={card}>
        <div style={cardHeader}>
          <span style={{ fontSize: 18 }}>📤</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>Upload New Batch</span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
          {/* Business Name */}
          <div style={fieldWrap}>
            <label style={label}>Business Name <span style={{ color: "#ef4444" }}>*</span></label>
            <input
              type="text"
              placeholder="e.g. APRIL_2025"
              value={sheet}
              onChange={e => setSheet(e.target.value.toUpperCase())}
              style={input}
            />
            <span style={hint}>Business name stored in uppercase</span>
          </div>

          {/* Due Date */}
          <div style={fieldWrap}>
            <label style={label}>Due Date <span style={{ color: "#ef4444" }}>*</span></label>
            <input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              style={input}
            />
            <span style={hint}>Deadline for this business</span>
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
          <div style={{ fontSize: 32, marginBottom: 8 }}>
            {file ? "✅" : "📂"}
          </div>
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
            padding: "10px 14px",
            borderRadius: 8,
            background: msgColors[msg.type].bg,
            border: `1px solid ${msgColors[msg.type].border}`,
            color: msgColors[msg.type].text,
            fontSize: 13.5,
            fontWeight: 500,
            marginBottom: 16,
          }}>
            {msg.text}
          </div>
        )}

        {/* Upload Button */}
        <button
          onClick={uploadFile}
          disabled={loading}
          style={{
            width: "100%",
            padding: "11px 0",
            background: loading ? "#93c5fd" : "#2563eb",
            border: "none",
            borderRadius: 8,
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.15s",
          }}
        >
          {loading ? "Uploading…" : "Upload Batch"}
        </button>
      </div>

      {/* ── Existing Sheets ── */}
      <div style={{ ...card, marginTop: 24 }}>
        <div style={cardHeader}>
          <span style={{ fontSize: 18 }}>📋</span>
          <span style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>
            Available Businesses
          </span>
          <span style={{
            marginLeft: "auto", background: "#eff6ff", color: "#2563eb",
            fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "2px 10px",
            border: "1px solid #bfdbfe",
          }}>
            {sheets.length} business{sheets.length !== 1 ? "es" : ""}
          </span>
        </div>

        {sheets.length === 0 ? (
          <div style={{ textAlign: "center", padding: "32px 0", color: "#94a3b8", fontSize: 14 }}>
            No businesses uploaded yet.
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
            {sheets.map((s, i) => (
              <div key={s} style={{
                background: "#f1f5f9", border: "1px solid #e2e8f0",
                borderRadius: 8, padding: "6px 14px",
                display: "flex", alignItems: "center", gap: 8,
              }}>
                <span style={{ color: "#94a3b8", fontSize: 11, fontWeight: 700 }}>#{i + 1}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: "#334155" }}>{s}</span>
              </div>
            ))}
          </div>
        )}
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
            {columns.length} columns
          </span>
        </div>
        <p style={{ color: "#64748b", fontSize: 13, margin: "0 0 14px" }}>
          Your Excel file must include these column headers exactly as listed.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {columns.map((col, i) => (
            <div key={col} style={{
              background: "#f8fafc", border: "1px solid #e2e8f0",
              borderRadius: 6, padding: "5px 12px",
              fontSize: 12.5, color: "#374151", fontWeight: 500,
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <span style={{ color: "#2563eb", fontWeight: 700, fontSize: 11 }}>{i + 1}</span>
              {col}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}

/* ── Shared styles ── */
const card = {
  background: "#fff",
  borderRadius: 12,
  padding: "20px 24px",
  boxShadow: "0 2px 10px rgba(0,0,0,0.07)",
  border: "1px solid #f1f5f9",
};

const cardHeader = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  marginBottom: 18,
  paddingBottom: 14,
  borderBottom: "1px solid #f1f5f9",
};

const fieldWrap = {
  display: "flex",
  flexDirection: "column",
  gap: 5,
};

const label = {
  fontSize: 13,
  fontWeight: 600,
  color: "#374151",
};

const hint = {
  fontSize: 11.5,
  color: "#94a3b8",
};

const input = {
  padding: "9px 12px",
  borderRadius: 8,
  border: "1px solid #cbd5e1",
  fontSize: 13.5,
  color: "#0f172a",
  outline: "none",
  background: "#f8fafc",
};
