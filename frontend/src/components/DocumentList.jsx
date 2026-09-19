import React, { useState, useEffect } from "react";
import { File, Play, CheckCircle2, Clock, AlertTriangle, ChevronRight } from "lucide-react";
import { api } from "../services/api";

export default function DocumentList({ documents, selectedDocId, onSelectDoc, onRefresh }) {
  const [processingStates, setProcessingStates] = useState({});

  const triggerProcessing = async (docId, e) => {
    e.stopPropagation();
    try {
      setProcessingStates(prev => ({ ...prev, [docId]: { stage: "QUEUED", progress: 5 } }));
      await api.triggerProcessing(docId);
      pollStatus(docId);
    } catch (err) {
      alert("Failed to start processing: " + err.message);
    }
  };

  const pollStatus = (docId) => {
    const interval = setInterval(async () => {
      try {
        const job = await api.getJobStatus(docId);
        setProcessingStates(prev => ({
          ...prev,
          [docId]: {
            stage: job.current_stage || job.status,
            progress: job.progress || 0
          }
        }));

        if (job.status === "COMPLETED" || job.status === "FAILED") {
          clearInterval(interval);
          onRefresh();
        }
      } catch (e) {
        clearInterval(interval);
      }
    }, 1500);
  };

  const getStatusBadge = (doc) => {
    const proc = processingStates[doc.id];
    const status = proc ? proc.stage : doc.status;

    if (status === "COMPLETED") {
      return (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          padding: "3px 8px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: "600",
          backgroundColor: "rgba(16, 185, 129, 0.15)",
          color: "#34D399"
        }}>
          <CheckCircle2 size={13} /> Processed
        </span>
      );
    }

    if (["EXTRACTING", "OCR_PROCESSING", "PREPROCESSING", "RUNNING", "QUEUED"].includes(status)) {
      return (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          padding: "3px 8px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: "600",
          backgroundColor: "rgba(99, 102, 241, 0.15)",
          color: "#818CF8"
        }}>
          <Clock size={13} className="glow-active" /> {status} ({proc?.progress || 0}%)
        </span>
      );
    }

    if (status === "FAILED") {
      return (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          padding: "3px 8px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: "600",
          backgroundColor: "rgba(239, 68, 68, 0.15)",
          color: "#F87171"
        }}>
          <AlertTriangle size={13} /> Failed
        </span>
      );
    }

    return (
      <span style={{
        padding: "3px 8px",
        borderRadius: "6px",
        fontSize: "12px",
        fontWeight: "600",
        backgroundColor: "rgba(148, 163, 184, 0.12)",
        color: "var(--text-muted)"
      }}>
        Ready
      </span>
    );
  };

  return (
    <div style={{
      backgroundColor: "var(--bg-surface)",
      border: "1px solid var(--border)",
      borderRadius: "14px",
      padding: "20px",
      marginBottom: "28px"
    }}>
      <h3 style={{ fontSize: "16px", fontWeight: "600", marginBottom: "14px" }}>
        Your Uploaded Documents ({documents.length})
      </h3>

      {documents.length === 0 ? (
        <p style={{ fontSize: "13.5px", color: "var(--text-muted)", padding: "16px 0", textAlign: "center" }}>
          No documents found. Upload a test paper or answer key above.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {documents.map((doc) => {
            const isSelected = selectedDocId === doc.id;
            const proc = processingStates[doc.id];
            return (
              <div
                key={doc.id}
                onClick={() => onSelectDoc(doc.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "14px 16px",
                  borderRadius: "10px",
                  backgroundColor: isSelected ? "var(--bg-card-hover)" : "var(--bg-main)",
                  border: `1px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}>
                  <File size={20} color={isSelected ? "var(--primary)" : "var(--text-muted)"} />
                  <div>
                    <div style={{ fontSize: "14px", fontWeight: "600", color: "var(--text-main)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {doc.filename}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-subtle)", marginTop: "2px" }}>
                      {(doc.file_size / 1024).toFixed(1)} KB • {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  {getStatusBadge(doc)}

                  {doc.status !== "COMPLETED" && (
                    <button
                      onClick={(e) => triggerProcessing(doc.id, e)}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        backgroundColor: "var(--primary)",
                        color: "#fff",
                        border: "none",
                        fontSize: "12.5px",
                        fontWeight: "600",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        cursor: "pointer"
                      }}
                    >
                      <Play size={13} /> Extract
                    </button>
                  )}

                  <ChevronRight size={16} color="var(--text-subtle)" />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
