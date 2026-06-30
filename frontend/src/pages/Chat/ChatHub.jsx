import React, { useState, useEffect, useRef, useCallback } from "react";
import api from "../../config/apiClient";

/* ── Constants ── */
const POLL_MS     = 4000;
const USERS_MS    = 8000;
const MAX_CHARS   = 2000;
const TEAM_ID     = "__TEAM__";

/* ── Status meta ── */
const STATUS_META = {
  available:   { color: "#22c55e", label: "Available" },
  "in-call":   { color: "#3b82f6", label: "In Call" },
  presenting:  { color: "#8b5cf6", label: "Presenting" },
  away:        { color: "#f59e0b", label: "Away" },
  busy:        { color: "#ef4444", label: "Busy" },
  dnd:         { color: "#991b1b", label: "DnD" },
  offline:     { color: "#94a3b8", label: "Offline" },
};

/* ── Helpers ── */
function getInitials(name = "") {
  return name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() || "?";
}
function avatarColor(id = "") {
  const c = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981","#ef4444","#06b6d4","#f97316"];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return c[Math.abs(h) % c.length];
}
function timeAgo(ms) {
  if (!ms) return "";
  const d = Date.now() - ms;
  const m = Math.floor(d / 60000);
  if (m < 1)  return "now";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}
function convId(a, b) { return [a, b].sort().join("___"); }

/* ── localStorage unread tracking ── */
function getLastRead() {
  try { return JSON.parse(localStorage.getItem("chatLastRead") || "{}"); } catch { return {}; }
}
function markRead(id) {
  const r = getLastRead(); r[id] = Date.now();
  localStorage.setItem("chatLastRead", JSON.stringify(r));
}

/* ── Browser notification ── */
function requestNotifPermission() {
  if (typeof Notification !== "undefined" && Notification.permission === "default") {
    Notification.requestPermission();
  }
}
function pushNotif(title, body) {
  if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
    new Notification(title, { body: body.slice(0, 100), icon: "/Sarn_final_logo1.png" });
  }
}


/* ── Role badge ── */
function RoleBadge({ role }) {
  const map = {
    superadmin: { label: "Super Admin", bg: "#ede9fe", color: "#7c3aed" },
    admin:      { label: "Admin",       bg: "#dbeafe", color: "#1d4ed8" },
    user:       { label: "User",        bg: "#dcfce7", color: "#166534" },
  };
  const r = map[role] || map.user;
  return <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 99, background: r.bg, color: r.color }}>{r.label}</span>;
}

/* ═══════════════════════════════════════════════════════════ */
export default function ChatHub() {
  const me = (() => { try { return JSON.parse(localStorage.getItem("sarnUser") || "{}"); } catch { return {}; } })();
  const myId   = me.userId || "";
  const myRole = (me.role || "").toLowerCase();
  const canDeleteAny = ["admin","superadmin"].includes(myRole);

  /* ── state ── */
  const [users, setUsers]             = useState([]);       // all other users with status
  const [conversations, setConvs]     = useState([]);       // DM conversation docs
  const [teamMeta, setTeamMeta]       = useState(null);     // team chat last message
  const [activeId, setActiveId]       = useState(null);     // TEAM_ID or userId
  const [messages, setMessages]       = useState([]);
  const [text, setText]               = useState("");
  const [sending, setSending]         = useState(false);
  const [search, setSearch]           = useState("");
  const [filter, setFilter]           = useState("all");    // "all" | "unread"
  const [hoverId, setHoverId]         = useState(null);
  const [deleting, setDeleting]       = useState(null);
  const lastSeenMsgRef = useRef({});                        // track last notified ts per conv (ref avoids stale closure)

  const bottomRef   = useRef(null);
  const textareaRef = useRef(null);
  const pollRef     = useRef(null);

  /* ── request notification permission on mount ── */
  useEffect(() => { requestNotifPermission(); }, []);

  /* ── fetch users + conversation list ── */
  const fetchMeta = useCallback(async () => {
    try {
      const [usersRes, convsRes, teamRes] = await Promise.all([
        api.get("/chat/dm/users"),
        api.get("/chat/dm/conversations"),
        api.get("/chat/team/meta"),
      ]);
      if (usersRes.data.ok)  setUsers(usersRes.data.users || []);
      if (convsRes.data.ok)  setConvs(convsRes.data.conversations || []);
      if (teamRes.data.ok)   setTeamMeta(teamRes.data.meta);
    } catch {}
  }, []);

  useEffect(() => {
    fetchMeta();
    const t = setInterval(fetchMeta, USERS_MS);
    return () => clearInterval(t);
  }, [fetchMeta]);

  /* ── fetch messages for active conversation ── */
  const fetchMessages = useCallback(async (id) => {
    if (!id) return;
    try {
      let res;
      if (id === TEAM_ID) {
        res = await api.get("/chat/messages");
      } else {
        res = await api.get(`/chat/dm/${id}/messages`);
      }
      if (!res.data.ok) return;
      const msgs = res.data.messages || [];
      setMessages(msgs);

      // notification: find messages newer than lastSeenMsg not sent by me
      const lastSeen = lastSeenMsgRef.current[id] || 0;
      const newOnes  = msgs.filter(m => m.timestamp > lastSeen && m.senderId !== myId);
      if (newOnes.length > 0) {
        const newest = newOnes[newOnes.length - 1];
        if (document.hidden) {
          const title = id === TEAM_ID ? "Team Chat" : newest.senderName;
          pushNotif(title, newest.text);
        }
        lastSeenMsgRef.current = { ...lastSeenMsgRef.current, [id]: newest.timestamp };
      }
    } catch {}
  }, [myId]);

  useEffect(() => {
    clearInterval(pollRef.current);
    setMessages([]);
    if (!activeId) return;
    markRead(activeId);
    fetchMessages(activeId);
    pollRef.current = setInterval(() => fetchMessages(activeId), POLL_MS);
    return () => clearInterval(pollRef.current);
  }, [activeId]); // eslint-disable-line

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  /* ── poll for unread counts on inactive conversations ── */
  useEffect(() => {
    const t = setInterval(async () => {
      if (!activeId) return;
      // silently re-fetch meta to update unread indicators in list
      fetchMeta();
    }, POLL_MS * 2);
    return () => clearInterval(t);
  }, [activeId, fetchMeta]);

  /* ── send ── */
  async function send() {
    const trimmed = text.trim();
    if (!trimmed || sending || !activeId) return;
    setSending(true);
    try {
      if (activeId === TEAM_ID) {
        await api.post("/chat/send", { text: trimmed });
      } else {
        await api.post(`/chat/dm/${activeId}/send`, { text: trimmed });
      }
      setText("");
      await fetchMessages(activeId);
      await fetchMeta();
    } catch {}
    setSending(false);
    textareaRef.current?.focus();
  }

  async function deleteMsg(msgId) {
    setDeleting(msgId);
    try {
      if (activeId === TEAM_ID) {
        await api.delete(`/chat/message/${msgId}`);
      } else {
        const cId = convId(myId, activeId);
        await api.delete(`/chat/dm/message/${cId}/${msgId}`);
      }
      setMessages(prev => prev.filter(m => m.id !== msgId));
    } catch {}
    setDeleting(null);
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  }

  function openConv(id) {
    setActiveId(id);
    markRead(id);
    setText("");
  }

  /* ── build conversation list ── */
  const lastRead = getLastRead();
  const userMap  = Object.fromEntries(users.map(u => [u.userId, u]));

  // Compute unread for team chat
  const teamLastRead = lastRead[TEAM_ID] || 0;
  const teamUnread   = teamMeta?.lastAt && teamMeta.lastAt > teamLastRead && teamMeta.lastSenderId !== myId ? 1 : 0;

  // Build DM conversation rows
  const dmRows = conversations.map(cv => {
    const otherId = (cv.participants || []).find(p => p !== myId);
    const other   = userMap[otherId] || { userId: otherId, name: otherId, role: "user", status: "offline" };
    const convLastRead = lastRead[otherId] || 0;
    const unread = cv.lastAt && cv.lastAt > convLastRead && cv.lastSenderId !== myId ? 1 : 0;
    return { ...cv, other, unread };
  }).sort((a, b) => (b.lastAt || 0) - (a.lastAt || 0));

  // Apply search + filter
  const teamVisible = !search || "team chat".includes(search.toLowerCase());
  const filteredDms = dmRows.filter(r => {
    if (filter === "unread" && !r.unread) return false;
    if (search && !r.other.name.toLowerCase().includes(search.toLowerCase()) && !r.other.userId.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // Users with NO conversation yet (not in dmRows)
  const dmPartnerIds = new Set(dmRows.map(r => r.other?.userId));
  const freshUsers   = users.filter(u => !dmPartnerIds.has(u.userId) && (!search || u.name.toLowerCase().includes(search.toLowerCase()) || u.userId.toLowerCase().includes(search.toLowerCase())));

  const totalUnread  = (filter !== "unread" ? teamUnread : 0) + dmRows.reduce((a, r) => a + r.unread, 0);

  /* ── active partner info ── */
  const activePartner = activeId && activeId !== TEAM_ID ? (userMap[activeId] || { userId: activeId, name: activeId, role: "user", status: "offline" }) : null;
  const activeMeta    = activePartner ? (STATUS_META[activePartner.status] || STATUS_META.offline) : null;

  /* ════════════════════ RENDER ════════════════════ */
  return (
    <div style={wrap}>

      {/* ══ LEFT: conversation list ══ */}
      <div style={leftPanel}>

        {/* Header */}
        <div style={leftHeader}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 17, fontWeight: 800, color: "#0f172a" }}>Messages</div>
            {totalUnread > 0 && (
              <div style={totalBadge}>{totalUnread > 99 ? "99+" : totalUnread}</div>
            )}
          </div>

          {/* Search */}
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search people or chats..."
            style={searchBox}
          />

          {/* Filter tabs */}
          <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
            {["all","unread"].map(f => (
              <button key={f} onClick={() => setFilter(f)} style={{
                flex: 1, padding: "5px 0", borderRadius: 8, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 700,
                background: filter === f ? "#2563eb" : "#f1f5f9",
                color: filter === f ? "#fff" : "#64748b",
              }}>
                {f === "all" ? "All" : `Unread${dmRows.reduce((a,r)=>a+r.unread,0)+teamUnread > 0 ? ` (${dmRows.reduce((a,r)=>a+r.unread,0)+teamUnread})` : ""}`}
              </button>
            ))}
          </div>
        </div>

        {/* Conversation rows */}
        <div style={{ flex: 1, overflowY: "auto" }}>

          {/* Team Chat — pinned at top */}
          {(filter === "all" || teamUnread > 0) && teamVisible && (
            <ConvRow
              id={TEAM_ID}
              active={activeId === TEAM_ID}
              avatarEl={<div style={{ width: 44, height: 44, borderRadius: "50%", background: "linear-gradient(135deg,#1e3a5f,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, flexShrink: 0 }}>💬</div>}
              name="Team Chat"
              sub="All members"
              lastMsg={teamMeta?.lastMsg}
              lastMsgSender={teamMeta?.lastSenderId === myId ? "You" : teamMeta?.lastSenderName}
              time={teamMeta?.lastAt}
              unread={teamUnread}
              pinned
              onClick={() => openConv(TEAM_ID)}
            />
          )}

          {/* Divider if there are DMs */}
          {(filteredDms.length > 0 || freshUsers.length > 0) && (
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", padding: "8px 14px 4px", textTransform: "uppercase", letterSpacing: 1 }}>
              Direct Messages
            </div>
          )}

          {/* Existing DM conversations */}
          {filteredDms.map(r => {
            const meta = STATUS_META[r.other?.status] || STATUS_META.offline;
            return (
              <ConvRow
                key={r.id}
                id={r.other?.userId}
                active={activeId === r.other?.userId}
                avatarEl={
                  <div style={{ position: "relative" }}>
                    <div style={{ width: 44, height: 44, borderRadius: "50%", background: avatarColor(r.other?.userId), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                      {getInitials(r.other?.name)}
                    </div>
                    <div style={{ position: "absolute", bottom: 1, right: 1, width: 11, height: 11, borderRadius: "50%", background: meta.color, border: "2px solid #fff" }} />
                  </div>
                }
                name={r.other?.name || r.other?.userId}
                sub={<><span style={{ color: meta.color, fontWeight: 600 }}>{meta.label}</span> · <RoleBadge role={r.other?.role} /></>}
                lastMsg={r.lastMsg}
                lastMsgSender={r.lastSenderId === myId ? "You" : null}
                time={r.lastAt}
                unread={r.unread}
                onClick={() => openConv(r.other?.userId)}
              />
            );
          })}

          {/* New users (no conversation yet) */}
          {freshUsers.length > 0 && filter !== "unread" && (
            <>
              <div style={{ fontSize: 10, fontWeight: 700, color: "#cbd5e1", padding: "8px 14px 4px", textTransform: "uppercase", letterSpacing: 1 }}>
                Start a conversation
              </div>
              {freshUsers.map(u => {
                const meta = STATUS_META[u.status] || STATUS_META.offline;
                return (
                  <ConvRow
                    key={u.userId}
                    id={u.userId}
                    active={activeId === u.userId}
                    avatarEl={
                      <div style={{ position: "relative" }}>
                        <div style={{ width: 44, height: 44, borderRadius: "50%", background: avatarColor(u.userId), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                          {getInitials(u.name)}
                        </div>
                        <div style={{ position: "absolute", bottom: 1, right: 1, width: 11, height: 11, borderRadius: "50%", background: meta.color, border: "2px solid #fff" }} />
                      </div>
                    }
                    name={u.name}
                    sub={<><span style={{ color: meta.color, fontWeight: 600 }}>{meta.label}</span> · <RoleBadge role={u.role} /></>}
                    lastMsg={null}
                    time={null}
                    unread={0}
                    onClick={() => openConv(u.userId)}
                  />
                );
              })}
            </>
          )}

          {filteredDms.length === 0 && freshUsers.length === 0 && !teamVisible && (
            <div style={{ padding: 24, textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No conversations found</div>
          )}
        </div>
      </div>

      {/* ══ RIGHT: chat window ══ */}
      <div style={rightPanel}>
        {!activeId ? (
          <div style={emptyState}>
            <div style={{ fontSize: 52 }}>💬</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: "#475569", marginTop: 14 }}>Select a chat to open</div>
            <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 6 }}>Team chat or direct message — all in one place</div>
          </div>
        ) : (
          <>
            {/* ── Chat header ── */}
            <div style={chatHeader}>
              <button onClick={() => setActiveId(null)} style={backBtn} title="Back to list">
                ←
              </button>
              {activeId === TEAM_ID ? (
                <>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "linear-gradient(135deg,#1e3a5f,#2563eb)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>💬</div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>Team Chat</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>Visible to all members · auto-deletes in 48h</div>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ position: "relative" }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: avatarColor(activeId), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#fff" }}>
                      {getInitials(activePartner?.name || activeId)}
                    </div>
                    {activeMeta && <div style={{ position: "absolute", bottom: 1, right: 1, width: 11, height: 11, borderRadius: "50%", background: activeMeta.color, border: "2px solid #1e3a5f" }} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: "#fff" }}>{activePartner?.name || activeId}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                      {activeMeta && <div style={{ width: 7, height: 7, borderRadius: "50%", background: activeMeta.color }} />}
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>{activeMeta?.label}</span>
                      <span style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>· {activeId}</span>
                    </div>
                  </div>
                </>
              )}
              <div style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 99, background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.35)", color: "#fbbf24" }}>
                ⏱ 48h TTL
              </div>
            </div>

            {/* ── Messages area ── */}
            <div style={msgArea}>
              {messages.length === 0 ? (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94a3b8" }}>
                  <div style={{ fontSize: 36, marginBottom: 10 }}>👋</div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>
                    {activeId === TEAM_ID ? "No messages yet in Team Chat" : `Start a conversation with ${activePartner?.name}`}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 4 }}>Messages disappear after 48 hours</div>
                </div>
              ) : (
                <>
                  {messages.map((msg, idx) => {
                    const isMine  = msg.senderId === myId;
                    const showAvt = idx === 0 || messages[idx - 1]?.senderId !== msg.senderId;
                    return (
                      <div
                        key={msg.id}
                        style={{ display: "flex", flexDirection: isMine ? "row-reverse" : "row", alignItems: "flex-end", gap: 8, marginBottom: 8, paddingLeft: isMine ? 60 : 0, paddingRight: isMine ? 0 : 60 }}
                        onMouseEnter={() => setHoverId(msg.id)}
                        onMouseLeave={() => setHoverId(null)}
                      >
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: avatarColor(msg.senderId), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0, visibility: showAvt ? "visible" : "hidden" }}>
                          {getInitials(msg.senderName)}
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", alignItems: isMine ? "flex-end" : "flex-start", maxWidth: "100%" }}>
                          {showAvt && (
                            <div style={{ fontSize: 11, color: "#64748b", marginBottom: 3, display: "flex", alignItems: "center", gap: 5, flexDirection: isMine ? "row-reverse" : "row" }}>
                              <span style={{ fontWeight: 700, color: isMine ? "#2563eb" : "#0f172a" }}>{isMine ? "You" : msg.senderName}</span>
                              {activeId === TEAM_ID && <RoleBadge role={msg.role} />}
                            </div>
                          )}
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexDirection: isMine ? "row-reverse" : "row" }}>
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

            {/* ── Input ── */}
            <div style={inputBar}>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: avatarColor(myId), display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#fff", flexShrink: 0 }}>
                  {getInitials(me.name || myId)}
                </div>
                <div style={{ flex: 1, position: "relative" }}>
                  <textarea
                    ref={textareaRef}
                    value={text}
                    onChange={e => setText(e.target.value.slice(0, MAX_CHARS))}
                    onKeyDown={handleKey}
                    placeholder={activeId === TEAM_ID ? "Message everyone… (Enter to send)" : `Message ${activePartner?.name || ""}…`}
                    rows={1}
                    style={textarea}
                    onInput={e => { e.target.style.height = "auto"; e.target.style.height = Math.min(e.target.scrollHeight, 110) + "px"; }}
                  />
                  <div style={{ position: "absolute", bottom: 7, right: 10, display: "flex", alignItems: "center", gap: 8 }}>
                    {text.length > MAX_CHARS * 0.85 && <span style={{ fontSize: 10, color: "#ef4444" }}>{MAX_CHARS - text.length}</span>}
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
                      {sending
                        ? <span style={{ fontSize: 11, color: "#94a3b8" }}>…</span>
                        : <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M22 2L11 13" stroke="white" strokeWidth="2.5" strokeLinecap="round"/><path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      }
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

/* ══ ConvRow sub-component ══ */
function ConvRow({ id, active, avatarEl, name, sub, lastMsg, lastMsgSender, time, unread, pinned, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: 11,
        padding: "10px 14px", cursor: "pointer",
        background: active ? "linear-gradient(135deg,#eff6ff,#dbeafe)" : "transparent",
        borderLeft: active ? "3px solid #2563eb" : "3px solid transparent",
        borderBottom: "1px solid #f8fafc",
        transition: "background 0.1s",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = "#f8fafc"; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      {avatarEl}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 4 }}>
          <span style={{ fontSize: 13.5, fontWeight: unread ? 800 : 600, color: active ? "#1d4ed8" : "#0f172a", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {name}
            {pinned && <span style={{ fontSize: 10, marginLeft: 6, background: "#dbeafe", color: "#1d4ed8", padding: "1px 5px", borderRadius: 4, fontWeight: 700 }}>GROUP</span>}
          </span>
          <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
            {time && <span style={{ fontSize: 10.5, color: unread ? "#2563eb" : "#94a3b8", fontWeight: unread ? 700 : 400 }}>{timeAgo(time)}</span>}
            {unread > 0 && <div style={{ minWidth: 18, height: 18, borderRadius: 99, background: "#2563eb", color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>{unread > 9 ? "9+" : unread}</div>}
          </div>
        </div>
        <div style={{ fontSize: 11.5, color: "#64748b", marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          {typeof sub === "string" ? sub : sub}
        </div>
        {lastMsg && (
          <div style={{ fontSize: 12, color: unread ? "#0f172a" : "#94a3b8", fontWeight: unread ? 600 : 400, marginTop: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {lastMsgSender ? <span style={{ color: "#2563eb" }}>{lastMsgSender}: </span> : null}{lastMsg}
          </div>
        )}
      </div>
    </div>
  );
}

/* ══ Styles ══ */
const wrap = { display: "flex", height: "calc(100vh - 88px)", background: "#fff", borderRadius: 16, overflow: "hidden", border: "1px solid #e2e8f0", boxShadow: "0 4px 24px rgba(0,0,0,0.06)" };
const leftPanel   = { width: 300, borderRight: "1px solid #f1f5f9", display: "flex", flexDirection: "column", background: "#fff", flexShrink: 0 };
const leftHeader  = { padding: "16px 14px 10px", borderBottom: "1px solid #f1f5f9", flexShrink: 0 };
const totalBadge  = { minWidth: 22, height: 22, borderRadius: 99, background: "#ef4444", color: "#fff", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 5px" };
const searchBox   = { width: "100%", marginTop: 10, padding: "8px 12px", borderRadius: 10, border: "1.5px solid #e2e8f0", background: "#f8fafc", fontSize: 13, outline: "none", boxSizing: "border-box", color: "#0f172a" };
const rightPanel  = { flex: 1, display: "flex", flexDirection: "column", background: "#f8fafc", minWidth: 0 };
const emptyState  = { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#64748b", padding: 40 };
const chatHeader  = { background: "linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)", padding: "14px 18px", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 };
const backBtn     = { background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#fff", fontSize: 16, fontWeight: 700, width: 34, height: 34, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };
const msgArea     = { flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column" };
const inputBar    = { background: "#fff", borderTop: "1px solid #e2e8f0", padding: "12px 16px 14px", flexShrink: 0 };
const textarea    = { width: "100%", padding: "9px 72px 9px 12px", border: "1.5px solid #e2e8f0", borderRadius: 12, fontSize: 13.5, fontFamily: "inherit", color: "#0f172a", background: "#f8fafc", outline: "none", resize: "none", boxSizing: "border-box", lineHeight: 1.5, minHeight: 42, maxHeight: 110, overflowY: "auto", transition: "border-color 0.15s" };
