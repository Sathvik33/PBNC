import React, { useState } from "react";
import { UploadCloud, FileText, CheckCircle2, AlertCircle } from "lucide-react";
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
      setSuccess(`Uploaded ${doc.filename} successfully!`);
      onUploadSuccess(doc);
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

  const handleChange = (e) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div style={{
      backgroundColor: "var(--bg-surface)",
      border: "1px solid var(--border)",
      borderRadius: "14px",
      padding: "24px",
      marginBottom: "28px"
    }}>
      <h2 style={{ fontSize: "17px", fontWeight: "600", marginBottom: "6px", display: "flex", alignItems: "center", gap: "8px" }}>
        <UploadCloud size={20} color="var(--primary)" /> Upload Examination / Question Material
      </h2>
      <p style={{ fontSize: "13.5px", color: "var(--text-muted)", marginBottom: "18px" }}>
        Supports PDF (Digital & Scanned) as well as examination images (PNG, JPG, TIFF, WebP) up to 50MB.
      </p>

      {error && (
        <div style={{
          backgroundColor: "rgba(239, 68, 68, 0.1)",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          borderRadius: "8px",
          padding: "10px 14px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          color: "#F87171",
          fontSize: "13.5px"
        }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div style={{
          backgroundColor: "rgba(16, 185, 129, 0.1)",
          border: "1px solid rgba(16, 185, 129, 0.3)",
          borderRadius: "8px",
          padding: "10px 14px",
          marginBottom: "16px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          color: "#34D399",
          fontSize: "13.5px"
        }}>
          <CheckCircle2 size={18} />
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
          padding: "36px 20px",
          border: `2px dashed ${dragActive ? "var(--primary)" : "var(--border)"}`,
          borderRadius: "12px",
          backgroundColor: dragActive ? "rgba(99, 102, 241, 0.05)" : "var(--bg-main)",
          cursor: uploading ? "not-allowed" : "pointer",
          transition: "all 0.2s ease"
        }}
      >
        <input
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.tiff,.webp"
          onChange={handleChange}
          disabled={uploading}
          style={{ display: "none" }}
        />

        <div style={{
          width: "48px",
          height: "48px",
          borderRadius: "12px",
          backgroundColor: "rgba(99, 102, 241, 0.12)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: "12px"
        }}>
          <FileText size={24} color="var(--primary)" />
        </div>

        <p style={{ fontSize: "14.5px", fontWeight: "600", color: "var(--text-main)", marginBottom: "4px" }}>
          {uploading ? "Uploading to secure storage..." : "Click or drag & drop exam document here"}
        </p>
        <span style={{ fontSize: "12.5px", color: "var(--text-subtle)" }}>
          Automatic S3 upload with MIME & magic-byte validation
        </span>
      </label>
    </div>
  );
}
