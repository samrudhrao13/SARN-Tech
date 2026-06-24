import React from "react";
import UserSidebar from "../components/UserSidebar";
import ChatBot from "../components/ChatBot";

export default function UserLayout({ children }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Fixed sidebar — taken out of flow, so a spacer holds its width */}
      <UserSidebar />
      <div style={{ width: "220px", minWidth: "220px", flexShrink: 0 }} />

      {/* Main content */}
      <div style={{
        flex: 1,
        minWidth: 0,
        padding: "20px 20px 20px 16px",
        minHeight: "100vh",
        background: "#f8fafc",
      }}>
        {children}
      </div>

      <ChatBot />
    </div>
  );
}
