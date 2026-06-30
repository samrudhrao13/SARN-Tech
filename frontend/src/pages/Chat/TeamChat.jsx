import React, { useState, useEffect, useRef, useCallback } from "react";
import api from "../../config/apiClient";

const POLL_MS = 4000;
const MAX_CHARS = 2000;

function getInitials(name = "") {
  return name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() || "?";
}

function avatarColor(userId = "") {
  const colors = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981","#ef4444","#06b6d4","#f97316"];
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = userId.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function timeAgo(ms) {
  const diff = Date.now() - ms;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function expiresIn(ms) {
  const diff = ms - Date.now();
  if (diff <= 0) return "expired";
  const hrs = Math.floor(diff / 3600000);
  const mins = Math.floor((diff % 3600000) / 60000);
  if (hrs > 0) return `${hrs}h ${mins}m left`;
  return `${mins}m left`;
}

function roleBadge(role) {
  const map = {
    superadmin: { label: "Super Admin", bg: "#ede9fe", color: "#7c3aed" },
    admin:      { label: "Admin",       bg: "#dbeafe", color: "#1d4ed8" },
    user:       { label: "User",        bg: "#dcfce7", color: "#166534" },
  };
  const r = map[role] || map.user;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 99, background: r.bg, color: r.color, marginLeft: 6 }}>
      {r.label}
    </span>
  );
}

export default function TeamChat() {
  const [messages, setMessages]   = useState([]);
  const [text, setText]           = useState("");
  const [sending, setSending]     = useState(false);
  const [error, setError]         = useState("");
  const [hoverId, setHoverId]     = useState(null);
  const [deleting, setDeleting]   = useState(null);
  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);
  const intervalRef = useRef(null);

  const me = (() => { try { return JSON.parse(localStorage.getItem("sarnUser") || "{}"); } catch { return {}; } })();
  const myId   = me.userId || "";
  const myRole = (me.role || "").toLowerCase();
  const canDeleteAny = myRole === "admin" || myRole === "superadmin";

  const fetchMessages = useCallback(async () => {
    try {
      const res = await api.get("/chat/messages");
      if (res.data.ok) setMessages(res.data.messages || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchMessages();
    intervalRef.current = setInterval(fetchMessages, POLL_MS);
    return () => clearInterval(intervalRef.current);
  }, [fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send() {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    setSending(true);
    setError("");
    try {
      const res = await api.post("/chat/send", { text: trimmed });
      if (res.data.ok) {
        setText("");
        await fetchMessages();
      } else {
        setError(res.data.error || "Failed to send");
      }
    } catch {
      setError("Network error");
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  async function deleteMsg(id) {
    setDeleting(id);
    try {
      await api.delete(`/chat/message/${id}`);
      setMessages(prev => prev.filter(m => m.id !== id));
    } catch {}
    setDeleting(null);
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  return (
    <div style={wrap}>
      {/* ── Header ── */}
      <div style={header}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={headerIcon}>💬</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "#fff", lineHeight: 1 }}>Team Chat</div>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 3 }}>
              {messages.length} message{messages.length !== 1 ? "s" : ""} · messages auto-delete after 48 hours
            </div>
          </div>
        </div>
        <div style={ttlBadge}>⏱ 48h TTL</div>
      </div>

      {/* ── Messages ── */}
      <div style={msgArea}>
        {messages.length === 0 ? (
          <div style={empty}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>💬</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: "#64748b" }}>No messages yet</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>Be the first to say something to your team</div>
          </div>
        ) : (
          <>
            {messages.map((msg, idx) => {
              const isMine = msg.senderId === myId;
              const showAvatar = idx === 0 || messages[idx - 1]?.senderId !== msg.senderId;
              return (
                <div
                  key={msg.id}
                  style={{ display: "flex", flexDirection: isMine ? "row-reverse" : "row", alignItems: "flex-end", gap: 10, marginBottom: 10, paddingLeft: isMine ? 60 : 0, paddingRight: isMine ? 0 : 60 }}
                  onMouseEnter={() => setHoverId(msg.id)}
                  onMouseLeave={() => setHoverId(null)}
                >
                  {/* Avatar */}
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: avatarColor(msg.senderId), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0, visibility: showAvatar ? "visible" : "hidden" }}>
                    {getInitials(msg.senderName)}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", maxWidth: "100%" }}>
                    {/* Name + role */}
                    {showAvatar && (
                      <div style={{ fontSize: 11.5, color: "#64748b", marginBottom: 3, display: "flex", alignItems: "center", flexDirection: isMine ? "row-reverse" : "row" }}>
                        <span style={{ fontWeight: 700, color: isMine ? "#2563eb" : "#0f172a" }}>{isMine ? "You" : msg.senderName}</span>
                        {roleBadge(msg.role)}
                      </div>
                    )}

                    {/* Bubble */}
                    <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 6, flexDirection: isMine ? "row-reverse" : "row" }}>
                      <div style={{
                        background: isMine ? "linear-gradient(135deg,#2563eb,#3b82f6)" : "#fff",
                        color: isMine ? "#fff" : "#0f172a",
                        padding: "10px 14px",
                        borderRadius: isMine ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        fontSize: 14,
                        lineHeight: 1.5,
                        boxShadow: isMine ? "0 4px 12px rgba(37,99,235,0.3)" : "0 2px 8px rgba(0,0,0,0.08)",
                        wordBreak: "break-word",
                        border: isMine ? "none" : "1px solid #f1f5f9",
                        whiteSpace: "pre-wrap",
                      }}>
                        {msg.text}
                      </div>

                      {/* Delete button */}
                      {(isMine || canDeleteAny) && hoverId === msg.id && (
                        <button
                          onClick={() => deleteMsg(msg.id)}
                          disabled={deleting === msg.id}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 14, padding: "4px 6px", borderRadius: 6, opacity: 0.7 }}
                          title="Delete message"
                        >
                          {deleting === msg.id ? "…" : "🗑"}
                        </button>
                      )}
                    </div>

                    {/* Time + expires */}
                    <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 4, display: "flex", gap: 8 }}>
                      <span>{timeAgo(msg.timestamp)}</span>
                      {hoverId === msg.id && msg.expiresAt && (
                        <span style={{ color: "#f59e0b" }}>· {expiresIn(msg.expiresAt)}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* ── Input ── */}
      <div style={inputArea}>
        {error && <div style={errorBar}>{error}</div>}
        <div style={inputRow}>
          <div style={{ width: 36, height: 36, borderRadius: "50%", background: avatarColor(myId), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
            {getInitials(me.name || myId)}
          </div>
          <div style={inputWrap}>
            <textarea
              ref={textareaRef}
              value={text}
              onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
              onKeyDown={handleKey}
              placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
              rows={1}
              style={textarea}
              onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"; }}
            />
            <div style={{ position: "absolute", bottom: 8, right: 12, display: "flex", alignItems: "center", gap: 10 }}>
              {text.length > 0 && (
                <span style={{ fontSize: 10.5, color: text.length > MAX_CHARS * 0.9 ? "#ef4444" : "#94a3b8" }}>
                  {MAX_CHARS - text.length}
                </span>
              )}
              <button
                onClick={send}
                disabled={!text.trim() || sending}
                style={{
                  background: text.trim() ? "linear-gradient(135deg,#2563eb,#3b82f6)" : "#e2e8f0",
                  border: "none", borderRadius: 10, width: 36, height: 36,
                  cursor: text.trim() ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, transition: "all 0.15s",
                  boxShadow: text.trim() ? "0 2px 8px rgba(37,99,235,0.35)" : "none",
                }}
              >
                {sending ? (
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>…</span>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: "#cbd5e1", marginTop: 8, textAlign: "center" }}>
          Messages are visible to all team members and automatically deleted after 48 hours
        </div>
      </div>
    </div>
  );
}

/* ── Styles ── */

const wrap = {
  display: "flex", flexDirection: "column",
  height: "calc(100vh - 88px)",
  background: "#f8fafc",
  borderRadius: 16,
  overflow: "hidden",
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
};

const header = {
  background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
  padding: "20px 24px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  flexShrink: 0,
};

const headerIcon = {
  width: 48, height: 48, borderRadius: 14,
  background: "rgba(255,255,255,0.1)",
  display: "flex", alignItems: "center", justifyContent: "center",
  fontSize: 22,
  backdropFilter: "blur(8px)",
  border: "1px solid rgba(255,255,255,0.12)",
};

const ttlBadge = {
  background: "rgba(245,158,11,0.15)",
  border: "1px solid rgba(245,158,11,0.35)",
  color: "#fbbf24",
  fontSize: 11, fontWeight: 700,
  padding: "5px 12px", borderRadius: 99,
  letterSpacing: 0.5,
};

const msgArea = {
  flex: 1, overflowY: "auto",
  padding: "20px 24px",
  display: "flex", flexDirection: "column",
};

const empty = {
  flex: 1, display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center",
  padding: 60, color: "#64748b",
};

const inputArea = {
  background: "#fff",
  borderTop: "1px solid #e2e8f0",
  padding: "14px 20px 16px",
  flexShrink: 0,
};

const errorBar = {
  background: "#fef2f2", border: "1px solid #fecaca",
  color: "#b91c1c", borderRadius: 8,
  padding: "8px 12px", fontSize: 13, marginBottom: 10,
};

const inputRow = {
  display: "flex", gap: 12, alignItems: "flex-end",
};

const inputWrap = {
  flex: 1, position: "relative",
};

const textarea = {
  width: "100%", padding: "10px 80px 10px 14px",
  border: "1.5px solid #e2e8f0", borderRadius: 14,
  fontSize: 14, fontFamily: "inherit",
  color: "#0f172a", background: "#f8fafc",
  outline: "none", resize: "none",
  boxSizing: "border-box", lineHeight: 1.5,
  transition: "border-color 0.15s",
  minHeight: 44, maxHeight: 120,
  overflowY: "auto",
};
