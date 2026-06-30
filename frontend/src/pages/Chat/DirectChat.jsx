import React, { useState, useEffect, useRef, useCallback } from "react";
import api from "../../config/apiClient";

const POLL_MS = 4000;
const MAX_CHARS = 2000;

const STATUS_META = {
  available:   { color: "#22c55e", label: "Available" },
  "in-call":   { color: "#3b82f6", label: "In Call" },
  presenting:  { color: "#8b5cf6", label: "Presenting" },
  away:        { color: "#f59e0b", label: "Away" },
  busy:        { color: "#ef4444", label: "Busy" },
  dnd:         { color: "#991b1b", label: "Do Not Disturb" },
  offline:     { color: "#94a3b8", label: "Offline" },
};

function statusDot(status, size = 10) {
  const meta = STATUS_META[status] || STATUS_META.offline;
  return (
    <span style={{
      display: "inline-block", width: size, height: size, borderRadius: "50%",
      background: meta.color, flexShrink: 0,
      boxShadow: status !== "offline" ? `0 0 0 2px white, 0 0 0 3px ${meta.color}` : "none",
    }} title={meta.label} />
  );
}

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

function roleBadge(role) {
  const map = {
    superadmin: { label: "Super Admin", bg: "#ede9fe", color: "#7c3aed" },
    admin:      { label: "Admin",       bg: "#dbeafe", color: "#1d4ed8" },
    user:       { label: "User",        bg: "#dcfce7", color: "#166534" },
  };
  const r = map[role] || map.user;
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 99, background: r.bg, color: r.color }}>
      {r.label}
    </span>
  );
}

function convId(a, b) { return [a, b].sort().join("___"); }

export default function DirectChat() {
  const me = (() => { try { return JSON.parse(localStorage.getItem("sarnUser") || "{}"); } catch { return {}; } })();
  const myId   = me.userId || "";
  const myRole = (me.role || "").toLowerCase();
  const canDeleteAny = myRole === "admin" || myRole === "superadmin";

  const [users, setUsers]         = useState([]);
  const [partner, setPartner]     = useState(null);
  const [messages, setMessages]   = useState([]);
  const [text, setText]           = useState("");
  const [sending, setSending]     = useState(false);
  const [search, setSearch]       = useState("");
  const [hoverId, setHoverId]     = useState(null);
  const [deleting, setDeleting]   = useState(null);

  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);
  const pollRef     = useRef(null);

  /* ── Load user list (poll every 10s for status updates) ── */
  const fetchUsers = useCallback(async () => {
    try {
      const res = await api.get("/chat/dm/users");
      if (res.data.ok) setUsers(res.data.users || []);
    } catch {}
  }, []);

  useEffect(() => {
    fetchUsers();
    const t = setInterval(fetchUsers, 10000);
    return () => clearInterval(t);
  }, [fetchUsers]);

  /* ── Load messages for active conversation ── */
  const fetchMessages = useCallback(async (partnerId) => {
    if (!partnerId) return;
    try {
      const res = await api.get(`/chat/dm/${partnerId}/messages`);
      if (res.data.ok) setMessages(res.data.messages || []);
    } catch {}
  }, []);

  useEffect(() => {
    clearInterval(pollRef.current);
    setMessages([]);
    if (!partner) return;
    fetchMessages(partner.userId);
    pollRef.current = setInterval(() => fetchMessages(partner.userId), POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [partner, fetchMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── Send ── */
  async function send() {
    const trimmed = text.trim();
    if (!trimmed || sending || !partner) return;
    setSending(true);
    try {
      await api.post(`/chat/dm/${partner.userId}/send`, { text: trimmed });
      setText("");
      await fetchMessages(partner.userId);
    } catch {}
    setSending(false);
    textareaRef.current?.focus();
  }

  async function deleteMsg(msgId) {
    if (!partner) return;
    setDeleting(msgId);
    try {
      const cId = convId(myId, partner.userId);
      await api.delete(`/chat/dm/message/${cId}/${msgId}`);
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch {}
    setDeleting(null);
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  const filtered = users.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.userId.toLowerCase().includes(search.toLowerCase())
  );

  const partnerMeta = partner ? (STATUS_META[partner.status] || STATUS_META.offline) : null;

  return (
    <div style={wrap}>

      {/* ── Left: user list ── */}
      <div style={sidebar}>
        <div style={sidebarHeader}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#0f172a" }}>Direct Messages</div>
          <div style={{ fontSize: 11, color: "#64748b" }}>{users.length} people</div>
        </div>

        {/* Search */}
        <div style={{ padding: "0 12px 10px" }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search people..."
            style={searchInput}
          />
        </div>

        {/* User list */}
        <div style={{ flex: 1, overflowY: "auto" }}>
          {filtered.length === 0 && (
            <div style={{ padding: "20px 16px", color: "#94a3b8", fontSize: 13, textAlign: "center" }}>No users found</div>
          )}
          {filtered.map(u => {
            const isActive = partner?.userId === u.userId;
            const meta = STATUS_META[u.status] || STATUS_META.offline;
            return (
              <div
                key={u.userId}
                onClick={() => { setPartner(u); setText(""); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "10px 14px", cursor: "pointer",
                  background: isActive ? "linear-gradient(135deg,#eff6ff,#dbeafe)" : "transparent",
                  borderLeft: isActive ? "3px solid #2563eb" : "3px solid transparent",
                  borderBottom: "1px solid #f1f5f9",
                  transition: "background 0.12s",
                }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = "#f8fafc"; }}
                onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = "transparent"; }}
              >
                {/* Avatar with status dot */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{ width: 38, height: 38, borderRadius: "50%", background: avatarColor(u.userId), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#fff" }}>
                    {getInitials(u.name)}
                  </div>
                  <div style={{ position: "absolute", bottom: 0, right: 0, width: 11, height: 11, borderRadius: "50%", background: meta.color, border: "2px solid #fff" }} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: isActive ? "#1d4ed8" : "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {u.name}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 600, color: meta.color }}>{meta.label}</span>
                    <span style={{ fontSize: 10, color: "#cbd5e1" }}>·</span>
                    {roleBadge(u.role)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Right: chat window ── */}
      <div style={chatPanel}>
        {!partner ? (
          <div style={noChatState}>
            <div style={{ fontSize: 52, marginBottom: 14 }}>💬</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#475569" }}>Select a person to start chatting</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>Messages are private and auto-deleted after 48 hours</div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div style={chatHeader}>
              <div style={{ position: "relative", flexShrink: 0 }}>
                <div style={{ width: 42, height: 42, borderRadius: "50%", background: avatarColor(partner.userId), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff" }}>
                  {getInitials(partner.name)}
                </div>
                <div style={{ position: "absolute", bottom: 1, right: 1, width: 11, height: 11, borderRadius: "50%", background: partnerMeta.color, border: "2px solid #fff" }} />
              </div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: "#fff" }}>{partner.name}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                  <div style={{ width: 7, height: 7, borderRadius: "50%", background: partnerMeta.color }} />
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.7)" }}>{partnerMeta.label}</span>
                  <span style={{ fontSize: 12, color: "rgba(255,255,255,0.4)" }}>·</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "rgba(255,255,255,0.65)" }}>{partner.userId}</span>
                </div>
              </div>
              <div style={{ marginLeft: "auto" }}>
                <div style={ttlBadge}>⏱ 48h TTL</div>
              </div>
            </div>

            {/* Messages */}
            <div style={msgArea}>
              {messages.length === 0 ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>👋</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>Start a conversation with {partner.name}</div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Messages disappear after 48 hours</div>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => {
                    const isMine = msg.senderId === myId;
                    const showName = idx === 0 || messages[idx - 1]?.senderId !== msg.senderId;
                    return (
                      <div
                        key={msg.id}
                        style={{ display: "flex", flexDirection: isMine ? "row-reverse" : "row", alignItems: "flex-end", gap: 8, marginBottom: 8, paddingLeft: isMine ? 60 : 0, paddingRight: isMine ? 0 : 60 }}
                        onMouseEnter={() => setHoverId(msg.id)}
                        onMouseLeave={() => setHoverId(null)}
                      >
                        <div style={{ width: 34, height: 34, borderRadius: "50%", background: avatarColor(msg.senderId), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0, visibility: showName ? "visible" : "hidden" }}>
                          {getInitials(msg.senderName)}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", maxWidth: "100%" }}>
                          {showName && (
                            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3, display: "flex", alignItems: "center", gap: 5, flexDirection: isMine ? "row-reverse" : "row" }}>
                              <span style={{ fontWeight: 700, color: isMine ? "#2563eb" : "#0f172a" }}>{isMine ? "You" : msg.senderName}</span>
                            </div>
                          )}
                          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 6, flexDirection: isMine ? "row-reverse" : "row" }}>
                            <div style={{
                              background: isMine ? "linear-gradient(135deg,#2563eb,#3b82f6)" : "#fff",
                              color: isMine ? "#fff" : "#0f172a",
                              padding: "9px 13px", fontSize: 13.5, lineHeight: 1.5,
                              borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                              boxShadow: isMine ? "0 3px 10px rgba(37,99,235,0.3)" : "0 2px 6px rgba(0,0,0,0.07)",
                              border: isMine ? "none" : "1px solid #f1f5f9",
                              wordBreak: "break-word", whiteSpace: "pre-wrap",
                            }}>
                              {msg.text}
                            </div>
                            {(isMine || canDeleteAny) && hoverId === msg.id && (
                              <button onClick={() => deleteMsg(msg.id)} disabled={deleting === msg.id} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444", fontSize: 13, padding: "3px 5px", borderRadius: 5, opacity: 0.7 }}>
                                {deleting === msg.id ? "…" : "🗑"}
                              </button>
                            )}
                          </div>
                          <div style={{ fontSize: 10.5, color: "#94a3b8", marginTop: 3 }}>{timeAgo(msg.timestamp)}</div>
                        </div>
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </>
              )}
            </div>

            {/* Input */}
            <div style={inputArea}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: avatarColor(myId), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                  {getInitials(me.name || myId)}
                </div>
                <div style={{ flex: 1, position: "relative" }}>
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
                    onKeyDown={handleKey}
                    placeholder={`Message ${partner.name}… (Enter to send)`}
                    rows={1}
                    style={textarea}
                    onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 110) + "px"; }}
                  />
                  <div style={{ position: "absolute", bottom: 7, right: 10, display: "flex", alignItems: "center", gap: 8 }}>
                    {text.length > MAX_CHARS * 0.85 && (
                      <span style={{ fontSize: 10, color: "#ef4444" }}>{MAX_CHARS - text.length}</span>
                    )}
                    <button
                      onClick={send}
                      disabled={!text.trim() || sending}
                      style={{
                        background: text.trim() ? "linear-gradient(135deg,#2563eb,#3b82f6)" : "#e2e8f0",
                        border: "none", borderRadius: 9, width: 34, height: 34,
                        cursor: text.trim() ? "pointer" : "not-allowed",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        boxShadow: text.trim() ? "0 2px 8px rgba(37,99,235,0.3)" : "none",
                        transition: "all 0.15s",
                      }}
                    >
                      {sending ? (
                        <span style={{ fontSize: 11, color: "#94a3b8" }}>…</span>
                      ) : (
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                          <path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                          <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ── Styles ── */

const wrap = {
  display: "flex",
  height: "calc(100vh - 88px)",
  background: "#fff",
  borderRadius: 16,
  overflow: "hidden",
  border: "1px solid #e2e8f0",
  boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
};

const sidebar = {
  width: 280,
  borderRight: "1px solid #f1f5f9",
  display: "flex",
  flexDirection: "column",
  background: "#fff",
  flexShrink: 0,
};

const sidebarHeader = {
  padding: "18px 14px 10px",
  borderBottom: "1px solid #f1f5f9",
};

const searchInput = {
  width: "100%", padding: "8px 12px", borderRadius: 10,
  border: "1.5px solid #e2e8f0", background: "#f8fafc",
  fontSize: 13, outline: "none", boxSizing: "border-box",
  color: "#0f172a",
};

const chatPanel = {
  flex: 1, display: "flex", flexDirection: "column",
  background: "#f8fafc", minWidth: 0,
};

const chatHeader = {
  background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)",
  padding: "16px 20px",
  display: "flex", alignItems: "center", gap: 14,
  flexShrink: 0,
};

const ttlBadge = {
  background: "rgba(245,158,11,0.15)",
  border: "1px solid rgba(245,158,11,0.35)",
  color: "#fbbf24", fontSize: 11, fontWeight: 700,
  padding: "4px 10px", borderRadius: 99,
};

const msgArea = {
  flex: 1, overflowY: "auto",
  padding: "16px 20px",
  display: "flex", flexDirection: "column",
};

const noChatState = {
  flex: 1, display: "flex", flexDirection: "column",
  alignItems: "center", justifyContent: "center",
  color: "#64748b", padding: 40,
};

const inputArea = {
  background: "#fff",
  borderTop: "1px solid #e2e8f0",
  padding: "12px 16px 14px",
  flexShrink: 0,
};

const textarea = {
  width: "100%", padding: "9px 72px 9px 12px",
  border: "1.5px solid #e2e8f0", borderRadius: 12,
  fontSize: 13.5, fontFamily: "inherit",
  color: "#0f172a", background: "#f8fafc",
  outline: "none", resize: "none",
  boxSizing: "border-box", lineHeight: 1.5,
  minHeight: 42, maxHeight: 110,
  overflowY: "auto", transition: "border-color 0.15s",
};
