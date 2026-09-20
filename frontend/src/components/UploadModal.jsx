import React, { useState } from "react";
import { Upload, X, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { api } from "../services/api";

export default function UploadModal({ isOpen, onClose, onUploadSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleFile = async (file) => {
    if (!file) return;
    setError(null);
    setUploading(true);

    try {
      const doc = await api.uploadDocument(file);
      // Automatically kick off extraction pipeline for the uploaded document
      try {
        await api.triggerProcessing(doc.id);
      } catch (procErr) {
        console.warn("Auto-trigger pipeline failed, can be triggered manually:", procErr);
      }
      onUploadSuccess(doc);
      onClose();
    } catch (err) {
      setError(err.message || "Failed to upload document");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "rgba(0, 0, 0, 0.75)",
      backdropFilter: "blur(6px)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 100,
      padding: "20px"
    }} onClick={onClose}>
      <div style={{
        backgroundColor: "var(--bg-sidebar)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "16px",
        width: "100%",
        maxWidth: "480px",
        padding: "24px",
        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)",
        display: "flex",
        flexDirection: "column",
        gap: "18px"
      }} onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <h3 style={{ fontSize: "16px", fontWeight: "600", color: "#FFFFFF" }}>
              Upload Document
            </h3>
            <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "2px" }}>
              Select an exam paper, test sheet, or answer key.
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-tertiary)",
              cursor: "pointer",
              padding: "6px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center"
            }}
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div style={{
            backgroundColor: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "8px",
            padding: "10px 12px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#F87171",
            fontSize: "13px"
          }}>
            <AlertCircle size={15} />
            <span>{error}</span>
          </div>
        )}

        {/* Drop Zone */}
        <label
          onDragEnter={() => setDragActive(true)}
          onDragLeave={() => setDragActive(false)}
          onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
          onDrop={handleDrop}
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "36px 20px",
            border: `1.5px dashed ${dragActive ? "var(--primary)" : "rgba(255, 255, 255, 0.15)"}`,
            borderRadius: "12px",
            backgroundColor: dragActive ? "rgba(59, 130, 246, 0.08)" : "var(--bg-input)",
            cursor: uploading ? "not-allowed" : "pointer",
            transition: "all 0.15s ease"
          }}
        >
          <input
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.tiff,.webp"
            onChange={(e) => e.target.files && handleFile(e.target.files[0])}
            disabled={uploading}
            style={{ display: "none" }}
          />

          <div style={{
            width: "44px",
            height: "44px",
            borderRadius: "10px",
            backgroundColor: "var(--primary-light)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "12px"
          }}>
            <Upload size={22} color="var(--primary)" />
          </div>

          <p style={{ fontSize: "14px", fontWeight: "500", color: "#FFFFFF", marginBottom: "4px" }}>
            {uploading ? "Uploading file..." : "Click to browse or drop file"}
          </p>
          <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
            PDF (Digital & Scanned), PNG, JPG, WebP up to 50MB
          </span>
        </label>
      </div>
    </div>
  );
}
