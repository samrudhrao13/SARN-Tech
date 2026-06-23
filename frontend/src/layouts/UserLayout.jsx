import React from "react";
import UserSidebar from "../components/UserSidebar";
import ChatBot from "../components/ChatBot";

export default function UserLayout({ children }) {
  return (
    <div style={{ display: "flex" }}>
      <UserSidebar />

      <div style={{ marginLeft: 160, padding: 20, width: "100%" }}>
        {children}
      </div>

      <ChatBot />
    </div>
  );
}
