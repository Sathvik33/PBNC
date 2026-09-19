import React, { useState } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { api } from "../services/api";

export default function DocumentUpload({ onUploadSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const handleFile = async (file) => {
    if (!file) return;
    setError(null);
    setSuccess(null);
    setUploading(true);

    try {
      const doc = await api.uploadDocument(file);
      setSuccess(`Uploaded ${doc.filename}`);
      onUploadSuccess(doc);
    } catch (err) {
      setError(err.message || "Upload failed");
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
      backgroundColor: "var(--bg-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "12px",
      padding: "20px"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <div>
          <h2 style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>
            Upload Exam Paper or Answer Key
          </h2>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "2px" }}>
            Supports multi-page PDFs, scanned question sheets, and images (PNG, JPG, TIFF, WebP).
          </p>
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: "rgba(239, 68, 68, 0.08)",
          border: "1px solid rgba(239, 68, 68, 0.2)",
          borderRadius: "8px",
          padding: "10px 14px",
          marginBottom: "14px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "#F87171",
          fontSize: "13px"
        }}>
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: "rgba(16, 185, 129, 0.08)",
          border: "1px solid rgba(16, 185, 129, 0.2)",
          borderRadius: "8px",
          padding: "10px 14px",
          marginBottom: "14px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          color: "#34D399",
          fontSize: "13px"
        }}>
          <CheckCircle2 size={16} />
          <span>{success}</span>
        </div>
      )}

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
          padding: "28px 16px",
          border: `1.5px dashed ${dragActive ? "var(--primary)" : "rgba(255, 255, 255, 0.12)"}`,
          borderRadius: "10px",
          backgroundColor: dragActive ? "rgba(59, 130, 246, 0.05)" : "var(--bg-input)",
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
          width: "42px",
          height: "42px",
          borderRadius: "10px",
          backgroundColor: "var(--primary-light)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "10px"
        }}>
          <Upload size={20} color="var(--primary)" />
        </div>

        <p style={{ fontSize: "14px", fontWeight: "500", color: "var(--text-primary)", marginBottom: "3px" }}>
          {uploading ? "Uploading to storage..." : "Choose a file or drag & drop here"}
        </p>
        <span style={{ fontSize: "12px", color: "var(--text-tertiary)" }}>
          Max file size: 50MB
        </span>
      </label>
    </div>
  );
}
