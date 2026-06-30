import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import api from "../config/apiClient";

const ChatContext = createContext({ unreadCount: 0 });
export const useChatContext = () => useContext(ChatContext);

const POLL_MS  = 8000;
const TEAM_ID  = "__TEAM__";
let _tid = 0;

/* ── helpers ── */
function getLastRead() {
  try { return JSON.parse(localStorage.getItem("chatLastRead") || "{}"); } catch { return {}; }
}
function getUser() {
  try { return JSON.parse(localStorage.getItem("sarnUser") || "null"); } catch { return null; }
}
function msgPath() {
  const role = (getUser()?.role || "").toLowerCase();
  if (role === "superadmin") return "/super-admin/messages";
  if (role === "admin")      return "/admin/messages";
  return "/user/messages";
}
function avatarBg(id = "") {
  const c = ["#3b82f6","#8b5cf6","#ec4899","#f59e0b","#10b981","#ef4444","#06b6d4","#f97316"];
  let h = 0;
  for (let i = 0; i < id.length; i++) h = id.charCodeAt(i) + ((h << 5) - h);
  return c[Math.abs(h) % c.length];
}
function initials(name = "") {
  return name.split(" ").map(p => p[0]).join("").slice(0, 2).toUpperCase() || "?";
}

/* ── inject slide animation once ── */
if (!document.getElementById("chat-toast-kf")) {
  const s = document.createElement("style");
  s.id = "chat-toast-kf";
  s.textContent = `
    @keyframes chatSlideIn {
      from { transform: translateX(115%); opacity: 0; }
      to   { transform: translateX(0);    opacity: 1; }
    }
  `;
  document.head.appendChild(s);
}

/* ════════════════════════════════════════════════════════════ */
export function ChatProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [toasts, setToasts]           = useState([]);
  const prevRef   = useRef({});   // lastAt per convId seen in previous poll
  const firstRef  = useRef(true); // skip toasts on first poll (avoid flooding old msgs)

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const pushToast = useCallback((toast) => {
    const id = ++_tid;
    setToasts(prev => {
      // Replace existing card for same conv rather than stack duplicate
      if (prev.find(t => t.convId === toast.convId)) {
        return prev.map(t => t.convId === toast.convId ? { ...toast, id: t.id } : t);
      }
      return [...prev.slice(-3), { ...toast, id }]; // cap at 4 toasts
    });
    setTimeout(() => dismiss(id), 6000);
  }, [dismiss]);

  const poll = useCallback(async () => {
    const user = getUser();
    if (!user?.userId) return;
    const myId    = user.userId;
    const lastRead = getLastRead();
    const isFirst  = firstRef.current;
    firstRef.current = false;

    // Don't show toasts if user is already on the messages page
    const onMsgs = window.location.pathname.includes("/messages");

    try {
      const [convsRes, teamRes] = await Promise.all([
        api.get("/chat/dm/conversations"),
        api.get("/chat/team/meta"),
      ]);

      let total = 0;

      /* ── Team chat ── */
      const tm = teamRes.data?.meta;
      if (tm?.lastAt && tm.lastSenderId !== myId) {
        const lr = lastRead[TEAM_ID] || 0;
        if (tm.lastAt > lr) total++;

        const prev = prevRef.current[TEAM_ID] || 0;
        if (!isFirst && !onMsgs && tm.lastAt > prev && tm.lastAt > lr) {
          pushToast({
            convId:     TEAM_ID,
            title:      "Team Chat",
            senderName: tm.lastSenderName || "Someone",
            senderId:   tm.lastSenderId   || "",
            body:       tm.lastMsg        || "New message",
          });
        }
        prevRef.current[TEAM_ID] = tm.lastAt;
      }

      /* ── DMs ── */
      for (const cv of (convsRes.data?.conversations || [])) {
        if (!cv.lastAt || cv.lastSenderId === myId) continue;
        const otherId = (cv.participants || []).find(p => p !== myId);
        if (!otherId) continue;
        const lr = lastRead[otherId] || 0;
        if (cv.lastAt > lr) total++;

        const prev = prevRef.current[otherId] || 0;
        if (!isFirst && !onMsgs && cv.lastAt > prev && cv.lastAt > lr) {
          pushToast({
            convId:     otherId,
            title:      cv.lastSenderName || otherId,
            senderName: cv.lastSenderName || otherId,
            senderId:   cv.lastSenderId   || otherId,
            body:       cv.lastMsg        || "New message",
          });
        }
        prevRef.current[otherId] = cv.lastAt;
      }

      setUnreadCount(total);
    } catch {}
  }, [pushToast]);

  useEffect(() => {
    poll();
    const t = setInterval(poll, POLL_MS);
    return () => clearInterval(t);
  }, [poll]);

  return (
    <ChatContext.Provider value={{ unreadCount, dismiss }}>
      {children}
      <ChatToasts toasts={toasts} dismiss={dismiss} />
    </ChatContext.Provider>
  );
}

/* ════════════════════ Toast UI ════════════════════ */

function ChatToasts({ toasts, dismiss }) {
  if (!toasts.length) return null;
  return (
    <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, display: "flex", flexDirection: "column-reverse", gap: 10 }}>
      {toasts.map(t => <ToastCard key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />)}
    </div>
  );
}

function ToastCard({ toast, onDismiss }) {
  const isTeam = toast.convId === TEAM_ID;

  function handleClick() {
    onDismiss();
    window.location.href = msgPath();
  }

  return (
    <div
      onClick={handleClick}
      style={{
        width: 320,
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
        borderRadius: 14,
        boxShadow: "0 10px 36px rgba(0,0,0,0.45)",
        border: "1px solid rgba(59,130,246,0.3)",
        overflow: "hidden",
        cursor: "pointer",
        animation: "chatSlideIn 0.35s cubic-bezier(0.34,1.3,0.64,1) forwards",
      }}
    >
      {/* colour bar */}
      <div style={{ height: 3, background: isTeam ? "linear-gradient(90deg,#2563eb,#7c3aed)" : `linear-gradient(90deg,${avatarBg(toast.senderId)},#2563eb)` }} />

      <div style={{ padding: "11px 13px", display: "flex", gap: 11, alignItems: "flex-start" }}>

        {/* Avatar */}
        <div style={{
          flexShrink: 0, width: 40, height: 40, borderRadius: "50%",
          background: isTeam ? "linear-gradient(135deg,#1e3a5f,#2563eb)" : avatarBg(toast.senderId),
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: isTeam ? 20 : 15, fontWeight: 700, color: "#fff",
        }}>
          {isTeam ? "💬" : initials(toast.senderName)}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          {/* header row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
            <span style={{ fontSize: 13, fontWeight: 800, color: "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              {toast.title}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              <span style={{ fontSize: 10, color: "#60a5fa", fontWeight: 700, background: "rgba(37,99,235,0.15)", padding: "1px 6px", borderRadius: 6 }}>
                NEW
              </span>
              <button
                onClick={e => { e.stopPropagation(); onDismiss(); }}
                style={{ background: "rgba(255,255,255,0.08)", border: "none", borderRadius: 5, color: "#94a3b8", fontSize: 14, cursor: "pointer", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", padding: 0, lineHeight: 1 }}
              >
                ×
              </button>
            </div>
          </div>

          {/* sender subtitle for DMs */}
          {!isTeam && (
            <div style={{ fontSize: 11, color: "#60a5fa", marginTop: 1 }}>{toast.senderName}</div>
          )}

          {/* message preview */}
          <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.72)", marginTop: 5, lineHeight: 1.4, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {toast.body}
          </div>

          <div style={{ fontSize: 10, color: "#475569", marginTop: 7 }}>Tap to open Messages</div>
        </div>
      </div>
    </div>
  );
}
