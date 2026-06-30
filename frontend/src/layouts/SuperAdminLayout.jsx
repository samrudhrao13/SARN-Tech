// src/layouts/SuperAdminLayout.jsx
import React from "react";
import SuperAdminSidebar from "../components/SuperAdminSidebar";
import CallNotificationOverlay from "../components/CallNotificationOverlay";

export default function SuperAdminLayout({ children }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <SuperAdminSidebar />

      <div
        style={{
          marginLeft: 230,
          flex: 1,
          padding: "28px 30px 40px 40px",
          background: "#f8f9fc",
          boxSizing: "border-box",
          minHeight: "100vh",
          overflowY: "auto",
        }}
      >
        {children}
      </div>

      <CallNotificationOverlay />
    </div>
  );
}
