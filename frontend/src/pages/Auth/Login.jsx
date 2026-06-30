import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./login.css";
import api from "../../config/apiClient";

export default function Login() {
  const [userId, setUserId]     = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const navigate = useNavigate();

  async function handleLogin() {
    setError("");
    if (!userId || !password) { setError("Please enter your User ID and Password."); return; }

    setLoading(true);
    try {
      const res = await api.post("/auth/login", {
        userId: userId.trim().toUpperCase(),
        password,
      });

      if (!res.data.ok) { setError("Invalid User ID or Password."); return; }

      const user = res.data.user;
      localStorage.clear();
      const role = String(user.role).toLowerCase();
      localStorage.setItem("sarnUser",  JSON.stringify(user));
      localStorage.setItem("userRole",  role);
      localStorage.setItem("userId",    user.userId);
      localStorage.setItem("mustReset", user.mustReset ? "true" : "false");
      localStorage.setItem("authToken", res.data.token);

      if (user.mustReset) { navigate("/reset-password", { replace: true }); return; }

      if (role === "superadmin")   navigate("/super-admin",     { replace: true });
      else if (role === "admin")   navigate("/admin/dashboard", { replace: true });
      else                         navigate("/user/dashboard",  { replace: true });

    } catch {
      setError("Server not reachable. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const onKey = (e) => { if (e.key === "Enter") handleLogin(); };

  return (
    <div className="login-container">

      {/* Animated background */}
      <div className="login-bg">
        <div className="login-bg-blob" />
        <div className="login-grid" />
      </div>

      {/* ── LEFT BRANDING ── */}
      <div className="left-section">
        <div className="left-content">
          <div className="hero-logo-wrap">
            <div className="hero-logo-ring" />
            <div className="hero-logo-ring2" />
            <img src="/Sarn_final_logo1.png" alt="SARN Technologies" className="hero-logo-img"
                 onError={e => { e.target.style.display = "none"; }} />
          </div>

          <h2 className="brand-full-name">SARN <span>Technologies</span></h2>
          <p className="brand-tagline">Enterprise Compliance Platform</p>

          <div className="left-divider" />

          <p className="left-desc">
            SDS verification, workflow automation, and regulatory
            compliance — built for enterprise chemical data teams.
          </p>

          <div className="left-stats">
            <div className="stat-item">
              <span className="stat-num">99.9%</span>
              <span className="stat-label">Uptime</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-num">AI</span>
              <span className="stat-label">Powered</span>
            </div>
            <div className="stat-divider" />
            <div className="stat-item">
              <span className="stat-num">GHS</span>
              <span className="stat-label">Compliant</span>
            </div>
          </div>
        </div>
      </div>

      {/* ── RIGHT FORM ── */}
      <div className="right-section">
        <div className="login-card">

          <h2 className="card-title">Sign in</h2>
          <p className="card-subtitle">
            Enter your credentials to access your workspace.
          </p>

          <div className="input-group">
            <label className="input-label">User ID</label>
            <input
              type="text"
              placeholder="e.g. SARN0001"
              className="input-box"
              value={userId}
              onChange={e => setUserId(e.target.value)}
              onKeyDown={onKey}
              autoComplete="username"
              autoFocus
            />
          </div>

          <div className="input-group">
            <label className="input-label">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              className="input-box"
              value={password}
              onChange={e => setPassword(e.target.value)}
              onKeyDown={onKey}
              autoComplete="current-password"
            />
          </div>

          <button className="login-btn" onClick={handleLogin} disabled={loading}>
            {loading && <span className="btn-spinner" />}
            {loading ? "Signing in…" : "Sign in to SARN"}
          </button>

          {error && <p className="error-text">⚠ {error}</p>}

          <div className="card-footer">
            By signing in you agree to our Terms of Service &amp; Privacy Policy.<br />
            All activity is monitored for security compliance.
          </div>

        </div>
      </div>
    </div>
  );
}
