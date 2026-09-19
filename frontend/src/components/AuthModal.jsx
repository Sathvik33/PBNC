import React, { useState } from "react";
import { LogIn, UserPlus, Sparkles, AlertCircle } from "lucide-react";
import { api } from "../services/api";

export default function AuthModal({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isRegister) {
        await api.register(email, password);
      } else {
        await api.login(email, password);
      }
      onLoginSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "20px",
      background: "radial-gradient(ellipse at top, #1E1B4B 0%, #0B0F19 65%)"
    }}>
      <div style={{
        maxWidth: "420px",
        width: "100%",
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        padding: "36px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.6)",
        position: "relative"
      }} className="animate-fade">
        {/* Header */}
        <div style={{ textAlign: "center", marginBottom: "30px" }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "56px",
            height: "56px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
            boxShadow: "0 8px 16px var(--primary-glow)",
            marginBottom: "16px"
          }}>
            <Sparkles size={28} color="#FFFFFF" />
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: "700", letterSpacing: "-0.5px" }}>
            DocIntelligence AI
          </h1>
          <p style={{ fontSize: "14px", color: "var(--text-muted)", marginTop: "6px" }}>
            {isRegister ? "Create an account to start extracting" : "Sign in to your document workspace"}
          </p>
        </div>

        {error && (
          <div style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            borderRadius: "10px",
            padding: "12px 14px",
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: "#F87171",
            fontSize: "13.5px"
          }}>
            <AlertCircle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "18px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "8px" }}>
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prof@university.edu"
              style={{
                width: "100%",
                padding: "12px 16px",
                backgroundColor: "var(--bg-main)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                color: "var(--text-main)",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s"
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          <div style={{ marginBottom: "26px" }}>
            <label style={{ display: "block", fontSize: "13px", fontWeight: "600", color: "var(--text-muted)", marginBottom: "8px" }}>
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              style={{
                width: "100%",
                padding: "12px 16px",
                backgroundColor: "var(--bg-main)",
                border: "1px solid var(--border)",
                borderRadius: "10px",
                color: "var(--text-main)",
                fontSize: "14px",
                outline: "none",
                transition: "border-color 0.2s"
              }}
              onFocus={(e) => (e.target.style.borderColor = "var(--primary)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "13px",
              background: "linear-gradient(135deg, #6366F1 0%, #4F46E5 100%)",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "10px",
              fontWeight: "600",
              fontSize: "14.5px",
              cursor: loading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              boxShadow: "0 4px 12px var(--primary-glow)",
              transition: "transform 0.15s, opacity 0.15s",
              opacity: loading ? 0.7 : 1
            }}
          >
            {loading ? (
              "Processing..."
            ) : isRegister ? (
              <>
                <UserPlus size={18} /> Register Account
              </>
            ) : (
              <>
                <LogIn size={18} /> Sign In
              </>
            )}
          </button>
        </form>

        <div style={{ marginTop: "24px", textAlign: "center" }}>
          <button
            type="button"
            onClick={() => {
              setIsRegister(!isRegister);
              setError(null);
            }}
            style={{
              background: "none",
              border: "none",
              color: "var(--accent)",
              fontSize: "13.5px",
              cursor: "pointer",
              fontWeight: "500",
              textDecoration: "none"
            }}
          >
            {isRegister
              ? "Already have an account? Sign In"
              : "Need an account? Register now"}
          </button>
        </div>
      </div>
    </div>
  );
}
