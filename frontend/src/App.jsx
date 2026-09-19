import React, { useState, useEffect } from "react";
import { Sparkles, LogOut, User, FileText, CheckCircle2 } from "lucide-react";
import { api } from "./services/api";
import AuthModal from "./components/AuthModal";
import DocumentUpload from "./components/DocumentUpload";
import DocumentList from "./components/DocumentList";
import QuestionWorkspace from "./components/QuestionWorkspace";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);

  const checkAuth = () => {
    const token = api.getToken();
    const email = api.getUserEmail();
    setIsAuthenticated(!!token);
    setUserEmail(email || "");
  };

  const loadDocuments = async () => {
    if (!api.getToken()) return;
    try {
      const res = await api.getDocuments();
      setDocuments(res.items || []);
      if (!selectedDocId && res.items && res.items.length > 0) {
        setSelectedDocId(res.items[0].id);
      }
    } catch (err) {
      console.error("Failed to load documents:", err);
    }
  };

  useEffect(() => {
    checkAuth();
    window.addEventListener("auth-changed", checkAuth);
    return () => window.removeEventListener("auth-changed", checkAuth);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadDocuments();
    }
  }, [isAuthenticated]);

  const handleLogout = () => {
    api.clearAuth();
    setIsAuthenticated(false);
    setUserEmail("");
    setDocuments([]);
    setSelectedDocId(null);
  };

  if (!isAuthenticated) {
    return <AuthModal onLoginSuccess={checkAuth} />;
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Top Navbar */}
      <header style={{
        height: "68px",
        backgroundColor: "var(--bg-surface)",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 32px",
        position: "sticky",
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "38px",
            height: "38px",
            borderRadius: "10px",
            background: "linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: "0 4px 12px var(--primary-glow)"
          }}>
            <Sparkles size={20} color="#FFFFFF" />
          </div>
          <div>
            <h1 style={{ fontSize: "16.5px", fontWeight: "700", letterSpacing: "-0.3px" }}>
              DocIntelligence AI
            </h1>
            <span style={{ fontSize: "11px", color: "var(--accent)", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Production v1.0
            </span>
          </div>
        </div>

        {/* User Badge & Logout */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "var(--bg-main)",
            padding: "6px 12px",
            borderRadius: "8px",
            border: "1px solid var(--border)"
          }}>
            <User size={15} color="var(--primary)" />
            <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-main)" }}>
              {userEmail}
            </span>
          </div>

          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "7px 12px",
              borderRadius: "8px",
              backgroundColor: "rgba(239, 68, 68, 0.1)",
              border: "1px solid rgba(239, 68, 68, 0.25)",
              color: "#F87171",
              fontSize: "13px",
              fontWeight: "600",
              cursor: "pointer",
              transition: "all 0.15s ease"
            }}
          >
            <LogOut size={14} /> Logout
          </button>
        </div>
      </header>

      {/* Main Workspace Layout */}
      <main style={{
        maxWidth: "1280px",
        width: "100%",
        margin: "0 auto",
        padding: "32px 24px",
        display: "flex",
        flexDirection: "column",
        gap: "24px"
      }}>
        {/* Document Upload Section */}
        <DocumentUpload
          onUploadSuccess={(newDoc) => {
            loadDocuments();
            setSelectedDocId(newDoc.id);
          }}
        />

        {/* Uploaded Documents List */}
        <DocumentList
          documents={documents}
          selectedDocId={selectedDocId}
          onSelectDoc={(id) => setSelectedDocId(id)}
          onRefresh={loadDocuments}
        />

        {/* Question Workspace */}
        <QuestionWorkspace selectedDocId={selectedDocId} />
      </main>
    </div>
  );
}
