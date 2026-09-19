import React, { useState } from "react";
import { FileText, Play, CheckCircle2, AlertTriangle, Loader2 } from "lucide-react";
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
        const res = await api.getJobStatus(docId);
        const job = res.job;
        const docStatus = res.document_status;
        setProcessingStates(prev => ({
          ...prev,
          [docId]: {
            stage: job ? (job.current_stage || job.status) : docStatus,
            progress: job ? job.progress : 0
          }
        }));

        if (docStatus === "COMPLETED" || docStatus === "FAILED" || (job && (job.status === "COMPLETED" || job.status === "FAILED"))) {
          clearInterval(interval);
          onRefresh();
        }
      } catch (e) {
        clearInterval(interval);
      }
    }, 1500);
  };

  const renderBadge = (doc) => {
    const proc = processingStates[doc.id];
    const status = proc ? proc.stage : doc.status;

    if (status === "COMPLETED" || status === "COMPLETED_WITH_WARNINGS") {
      return (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          padding: "3px 8px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: "500",
          backgroundColor: "rgba(16, 185, 129, 0.12)",
          color: "#34D399"
        }}>
          <CheckCircle2 size={13} /> Extracted
        </span>
      );
    }

    if (["EXTRACTING", "OCR_PROCESSING", "PREPROCESSING", "RUNNING", "QUEUED", "QUESTION_SEGMENTATION", "MATCHING_ANSWERS"].includes(status)) {
      return (
        <span style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          padding: "3px 8px",
          borderRadius: "6px",
          fontSize: "12px",
          fontWeight: "500",
          backgroundColor: "rgba(59, 130, 246, 0.12)",
          color: "#60A5FA"
        }}>
          <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> {status}
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
          fontWeight: "500",
          backgroundColor: "rgba(239, 68, 68, 0.12)",
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
        fontWeight: "500",
        backgroundColor: "rgba(255, 255, 255, 0.06)",
        color: "var(--text-secondary)"
      }}>
        Ready
      </span>
    );
  };

  return (
    <div style={{
      backgroundColor: "var(--bg-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "12px",
      padding: "20px"
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
        <h3 style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>
          Documents ({documents.length})
        </h3>
      </div>

      {documents.length === 0 ? (
        <p style={{ fontSize: "13px", color: "var(--text-secondary)", textAlign: "center", padding: "16px 0" }}>
          No documents uploaded yet.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {documents.map((doc) => {
            const isSelected = selectedDocId === doc.id;
            return (
              <div
                key={doc.id}
                onClick={() => onSelectDoc(doc.id)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "12px 14px",
                  borderRadius: "8px",
                  backgroundColor: isSelected ? "var(--bg-card-hover)" : "var(--bg-input)",
                  border: `1px solid ${isSelected ? "var(--primary)" : "var(--border-subtle)"}`,
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px", minWidth: 0 }}>
                  <FileText size={18} color={isSelected ? "var(--primary)" : "var(--text-tertiary)"} />
                  <div style={{ overflow: "hidden" }}>
                    <div style={{
                      fontSize: "13.5px",
                      fontWeight: "500",
                      color: "var(--text-primary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}>
                      {doc.filename}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--text-tertiary)", marginTop: "2px" }}>
                      {(doc.file_size / 1024).toFixed(0)} KB • {new Date(doc.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                  {renderBadge(doc)}

                  {doc.status !== "COMPLETED" && (
                    <button
                      onClick={(e) => triggerProcessing(doc.id, e)}
                      className="btn-primary"
                      style={{ padding: "5px 10px", fontSize: "12px" }}
                    >
                      <Play size={12} /> Run Pipeline
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
