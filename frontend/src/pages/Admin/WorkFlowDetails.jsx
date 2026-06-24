import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import api from "../../config/apiClient";

function isPdfUrl(v) {
  return (
    typeof v === "string" &&
    (v.toLowerCase().endsWith(".pdf") || v.includes("alt=media"))
  );
}

function safeValue(v) {
  if (v === null || v === undefined) return "-";
  if (v?._seconds) return new Date(v._seconds * 1000).toLocaleString();
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

function format(str) {
  return str
    .replace(/([A-Z])/g, " $1")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/* ── PDF Viewer Modal ── */
function PdfModal({ url, onClose }) {
  if (!url) return null;
  return (
    <div
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 200, display: "flex", flexDirection: "column" }}
      onClick={onClose}
    >
      {/* Toolbar */}
      <div
        style={{ background: "#0f172a", padding: "10px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}
        onClick={e => e.stopPropagation()}
      >
        <span style={{ color: "#fff", fontWeight: 700, fontSize: 14 }}>PDF Viewer</span>
        <div style={{ display: "flex", gap: 10 }}>
          <a
            href={url}
            download
            style={{ padding: "7px 18px", borderRadius: 7, background: "#2563eb", color: "#fff", fontWeight: 700, fontSize: 13, textDecoration: "none" }}
          >
            ⬇ Download PDF
          </a>
          <button
            onClick={onClose}
            style={{ padding: "7px 14px", borderRadius: 7, border: "none", background: "#ef4444", color: "#fff", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
          >
            ✕ Close
          </button>
        </div>
      </div>
      {/* Iframe */}
      <div style={{ flex: 1, overflow: "hidden" }} onClick={e => e.stopPropagation()}>
        <iframe
          src={url}
          title="PDF Viewer"
          style={{ width: "100%", height: "100%", border: "none", background: "#525659" }}
        />
      </div>
    </div>
  );
}

/* ── KeyValueTable with PDF view button ── */
function KeyValueTable({ data, onViewPdf }) {
  if (!data) return <p>-</p>;
  return (
    <table style={tblStyle}>
      <tbody>
        {Object.entries(data).map(([k, v]) => (
          <tr key={k}>
            <td style={tdKey}>{format(k)}</td>
            <td style={tdVal}>
              {isPdfUrl(v) ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    onClick={() => onViewPdf(v)}
                    style={{ padding: "5px 14px", background: "#2563eb", color: "#fff", border: "none", borderRadius: 6, fontWeight: 700, fontSize: 12, cursor: "pointer" }}
                  >
                    👁 View PDF
                  </button>
                  <a
                    href={v}
                    download
                    style={{ padding: "5px 14px", background: "#0f172a", color: "#fff", borderRadius: 6, fontWeight: 700, fontSize: 12, textDecoration: "none" }}
                  >
                    ⬇ Download
                  </a>
                </div>
              ) : (
                safeValue(v)
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/* ── StageView ── */
function StageView({ title, data, onViewPdf }) {
  if (!data) {
    return (
      <Block title={title}>
        <StatusChip text="NOT STARTED" color="#e5e7eb" textColor="#475569" />
      </Block>
    );
  }
  if (data.status === "skipped") {
    return (
      <Block title={title}>
        <StatusChip text="SKIPPED" color="#fef3c7" textColor="#92400e" />
        <p><b>Reason:</b> {safeValue(data.reason)}</p>
        <p><b>User:</b> {safeValue(data.user)}</p>
      </Block>
    );
  }
  return (
    <Block title={title}>
      <KeyValueTable data={data} onViewPdf={onViewPdf} />
      <p style={{ marginTop: 10 }}><b>Completed By:</b> {safeValue(data.user)}</p>
    </Block>
  );
}

/* ── Block ── */
function Block({ title, children }) {
  return (
    <div style={card}>
      <h3 style={{ margin: "0 0 12px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>{title}</h3>
      {children}
    </div>
  );
}

/* ── StatusChip ── */
function StatusChip({ text, color, textColor }) {
  return (
    <span style={{ background: color, padding: "4px 12px", borderRadius: 12, fontWeight: 700, fontSize: 12, display: "inline-block", color: textColor || "#0f172a" }}>
      {text}
    </span>
  );
}

/* ── Main component ── */
export default function WorkflowDetails() {
  const navigate  = useNavigate();
  const { sheet, referenceId } = useParams();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [pdfUrl, setPdfUrl]   = useState(null);

  if (!sheet || !referenceId) {
    return <h2 style={{ color: "red" }}>Invalid URL. Open workflow from Admin panel.</h2>;
  }

  useEffect(() => {
    setLoading(true);
    api.get("/workflow/details", { params: { sheet, refId: referenceId } })
      .then(res => { if (res.data.ok) setData(res.data.workflow); else setData(null); })
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [sheet, referenceId]);

  if (loading) return <h2>Loading workflow...</h2>;
  if (!data)   return <h2 style={{ color: "red" }}>Workflow not found.</h2>;

  return (
    <>
      <PdfModal url={pdfUrl} onClose={() => setPdfUrl(null)} />

      <button onClick={() => navigate(-1)} style={backBtn}>← Back</button>

      <h1 style={{ margin: "10px 0 4px", fontSize: 20, fontWeight: 700, color: "#0f172a" }}>Workflow Details</h1>
      <p style={{ margin: "0 0 20px", color: "#64748b", fontSize: 13 }}>
        <b>Sheet:</b> {sheet} &nbsp;|&nbsp; <b>Reference:</b> {referenceId}
      </p>

      <Block title="Common Fields">
        <KeyValueTable
          onViewPdf={setPdfUrl}
          data={{
            ...data.common,
            newRepositoryNumber: data.supersede?.newRepositoryNumber || "",
            supersedeVerifiedDate: data.supersede?.verifiedDate || "",
            transcriptionVerifiedDate: data.transcription?.verifiedDate || "",
          }}
        />
      </Block>

      <StageView title="Search"        data={data.search}        onViewPdf={setPdfUrl} />
      <StageView title="Supersede"     data={data.supersede}     onViewPdf={setPdfUrl} />
      <StageView title="Transcription" data={data.transcription} onViewPdf={setPdfUrl} />

      <Block title="Billing">
        {data.billing?.status === "ready"
          ? <StatusChip text="READY FOR BILLING" color="#dcfce7" textColor="#166534" />
          : <StatusChip text="NOT READY"         color="#fef3c7" textColor="#92400e" />
        }
      </Block>
    </>
  );
}

/* ── Styles ── */
const card   = { background: "#fff", padding: 20, borderRadius: 10, marginBottom: 16, border: "1px solid #e2e8f0", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" };
const tblStyle = { width: "100%", borderCollapse: "collapse" };
const tdKey  = { width: "35%", padding: "8px 10px", border: "1px solid #e2e8f0", fontWeight: 600, background: "#f8fafc", fontSize: 13 };
const tdVal  = { padding: "8px 10px", border: "1px solid #e2e8f0", fontSize: 13 };
const backBtn = { marginBottom: 16, padding: "7px 16px", borderRadius: 8, border: "1px solid #cbd5e1", background: "#fff", color: "#0f172a", fontWeight: 600, cursor: "pointer", fontSize: 13 };
