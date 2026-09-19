import React, { useState, useEffect } from "react";
import { LogOut, User, Layers, Sparkles } from "lucide-react";
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
        height: "60px",
        backgroundColor: "var(--bg-sidebar)",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 28px",
        position: "sticky",
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: "30px",
            height: "30px",
            borderRadius: "8px",
            backgroundColor: "var(--primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF"
          }}>
            <Layers size={18} />
          </div>
          <span style={{ fontSize: "15px", fontWeight: "600", letterSpacing: "-0.2px" }}>
            DocIntelligence
          </span>
        </div>

        {/* User Account Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "7px",
            backgroundColor: "var(--bg-input)",
            padding: "5px 12px",
            borderRadius: "6px",
            border: "1px solid var(--border-subtle)",
            fontSize: "13px",
            color: "var(--text-secondary)"
          }}>
            <User size={14} />
            <span>{userEmail}</span>
          </div>

          <button
            onClick={handleLogout}
            className="btn-secondary"
            style={{ padding: "5px 10px", fontSize: "12px" }}
          >
            <LogOut size={13} /> Log out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main style={{
        maxWidth: "1200px",
        width: "100%",
        margin: "0 auto",
        padding: "24px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "18px"
      }}>
        {/* Document Upload */}
        <DocumentUpload
          onUploadSuccess={(newDoc) => {
            loadDocuments();
            setSelectedDocId(newDoc.id);
          }}
        />

        {/* Document List */}
        <DocumentList
          documents={documents}
          selectedDocId={selectedDocId}
          onSelectDoc={(id) => setSelectedDocId(id)}
          onRefresh={loadDocuments}
        />

        {/* Structured Questions Workspace */}
        <QuestionWorkspace selectedDocId={selectedDocId} />
      </main>
    </div>
  );
}
