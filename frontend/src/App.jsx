import React, { useState, useEffect } from "react";
import { LogOut, User, Layers } from "lucide-react";
import { api } from "./services/api";
import AuthModal from "./components/AuthModal";
import Sidebar from "./components/Sidebar";
import QuestionWorkspace from "./components/QuestionWorkspace";
import UploadModal from "./components/UploadModal";

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

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
      const items = res.items || [];
      setDocuments(items);
      // Let user view the landing page unless they pick a document or just uploaded one
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

  const selectedDoc = documents.find((d) => d.id === selectedDocId) || null;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", backgroundColor: "var(--bg-app)" }}>
      {/* Top Navbar */}
      <header style={{
        height: "60px",
        backgroundColor: "var(--bg-sidebar)",
        borderBottom: "1px solid var(--border-subtle)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 20px",
        zIndex: 40
      }}>
        <div 
          onClick={() => setSelectedDocId(null)}
          title="Return to Home / Instructions"
          style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer", userSelect: "none" }}
        >
          <div style={{
            width: "28px",
            height: "28px",
            borderRadius: "6px",
            backgroundColor: "var(--primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#FFFFFF"
          }}>
            <Layers size={16} />
          </div>
          <span style={{ fontSize: "15px", fontWeight: "600", letterSpacing: "-0.2px", color: "#FFFFFF" }}>
            DocIntelligence
          </span>
        </div>

        {/* User Account Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "var(--bg-input)",
            padding: "4px 10px",
            borderRadius: "6px",
            border: "1px solid var(--border-subtle)",
            fontSize: "12.5px",
            color: "var(--text-secondary)"
          }}>
            <User size={13} />
            <span>{userEmail}</span>
          </div>

          <button
            onClick={handleLogout}
            className="btn-secondary"
            style={{ padding: "4px 8px", fontSize: "12px" }}
          >
            <LogOut size={12} /> Log out
          </button>
        </div>
      </header>

      {/* Main Two-Column Layout */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>
        {/* Left Documents Sidebar */}
        <Sidebar
          documents={documents}
          selectedDocId={selectedDocId}
          onSelectDoc={(id) => setSelectedDocId(id)}
          onOpenUpload={() => setIsUploadOpen(true)}
          onRefresh={loadDocuments}
        />

        {/* Main Central Question Workspace */}
        <QuestionWorkspace
          selectedDoc={selectedDoc}
          onRefresh={loadDocuments}
          onOpenUpload={() => setIsUploadOpen(true)}
        />
      </div>

      {/* Upload Modal (Triggered by + Plus in Sidebar) */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onUploadSuccess={(newDoc) => {
          loadDocuments();
          setSelectedDocId(newDoc.id);
        }}
      />
    </div>
  );
}
