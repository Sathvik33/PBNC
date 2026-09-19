import React, { useState } from "react";
import { Plus, FileText, Play, CheckCircle2, AlertTriangle, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { api } from "../services/api";

export default function Sidebar({
  documents,
  selectedDocId,
  onSelectDoc,
  onOpenUpload,
  onRefresh
}) {
  const [processingStates, setProcessingStates] = useState({});

  const triggerProcessing = async (docId, e) => {
    e.stopPropagation();
    try {
      setProcessingStates(prev => ({ ...prev, [docId]: { stage: "QUEUED" } }));
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
        const currentStage = job ? (job.current_stage || job.status) : docStatus;

        setProcessingStates(prev => ({
          ...prev,
          [docId]: { stage: currentStage }
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

  const renderStatus = (doc) => {
    const proc = processingStates[doc.id];
    const status = proc ? proc.stage : doc.status;

    if (status === "COMPLETED" || status === "COMPLETED_WITH_WARNINGS") {
      return (
        <span style={{ fontSize: "11px", color: "#34D399", display: "flex", alignItems: "center", gap: "3px" }}>
          <CheckCircle2 size={12} /> Extracted
        </span>
      );
    }

    if (["EXTRACTING", "OCR_PROCESSING", "PREPROCESSING", "RUNNING", "QUEUED", "QUESTION_SEGMENTATION", "MATCHING_ANSWERS"].includes(status)) {
      return (
        <span style={{ fontSize: "11px", color: "#60A5FA", display: "flex", alignItems: "center", gap: "3px" }}>
          <Loader2 size={11} style={{ animation: "spin 1s linear infinite" }} /> Processing...
        </span>
      );
    }

    if (status === "FAILED") {
      return (
        <span style={{ fontSize: "11px", color: "#F87171", display: "flex", alignItems: "center", gap: "3px" }}>
          <AlertTriangle size={11} /> Failed
        </span>
      );
    }

    return (
      <button
        onClick={(e) => triggerProcessing(doc.id, e)}
        style={{
          background: "transparent",
          border: "1px solid var(--border-subtle)",
          borderRadius: "5px",
          color: "var(--primary)",
          fontSize: "11px",
          padding: "2px 6px",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: "4px"
        }}
      >
        <Play size={10} /> Extract
      </button>
    );
  };

  const handleDelete = async (docId, filename, e) => {
    e.stopPropagation();
    if (window.confirm(`Are you sure you want to delete "${filename}"?`)) {
      try {
        await api.deleteDocument(docId);
        onRefresh();
      } catch (err) {
        alert("Failed to delete: " + err.message);
      }
    }
  };

  return (
    <aside style={{
      width: "280px",
      minWidth: "280px",
      height: "calc(100vh - 60px)",
      backgroundColor: "var(--bg-sidebar)",
      borderRight: "1px solid var(--border-subtle)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden"
    }}>
      {/* Sidebar Header with + Plus Upload Button */}
      <div style={{
        padding: "16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottom: "1px solid var(--border-subtle)"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ fontSize: "13px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--text-secondary)" }}>
            Documents
          </span>
          <span style={{
            fontSize: "11px",
            fontFamily: "var(--font-mono)",
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            padding: "2px 6px",
            borderRadius: "4px",
            color: "var(--text-secondary)"
          }}>
            {documents.length}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <button
            onClick={onRefresh}
            title="Refresh list"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-tertiary)",
              cursor: "pointer",
              padding: "5px",
              borderRadius: "6px",
              display: "flex",
              alignItems: "center"
            }}
          >
            <RefreshCw size={14} />
          </button>

          {/* Dedicated Professional Plus Button */}
          <button
            onClick={onOpenUpload}
            title="Upload new document"
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "6px",
              backgroundColor: "var(--primary)",
              color: "#FFFFFF",
              border: "none",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "transform 0.1s ease"
            }}
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Documents List */}
      <div style={{
        flex: 1,
        overflowY: "auto",
        padding: "10px",
        display: "flex",
        flexDirection: "column",
        gap: "4px"
      }}>
        {documents.length === 0 ? (
          <div style={{ textAlign: "center", padding: "30px 10px", color: "var(--text-tertiary)", fontSize: "13px" }}>
            No documents yet.<br />Click <strong>+</strong> above to upload.
          </div>
        ) : (
          documents.map((doc) => {
            const isSelected = selectedDocId === doc.id;
            return (
              <div
                key={doc.id}
                onClick={() => onSelectDoc(doc.id)}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  backgroundColor: isSelected ? "var(--bg-card-hover)" : "transparent",
                  border: isSelected ? "1px solid var(--border-subtle)" : "1px solid transparent",
                  cursor: "pointer",
                  transition: "all 0.12s ease"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                    <FileText size={15} color={isSelected ? "var(--primary)" : "var(--text-tertiary)"} style={{ flexShrink: 0 }} />
                    <span style={{
                      fontSize: "13px",
                      fontWeight: isSelected ? "600" : "450",
                      color: isSelected ? "#FFFFFF" : "var(--text-secondary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis"
                    }}>
                      {doc.filename}
                    </span>
                  </div>

                  {/* Delete Trash Button */}
                  <button
                    onClick={(e) => handleDelete(doc.id, doc.filename, e)}
                    title="Delete document"
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-tertiary)",
                      cursor: "pointer",
                      padding: "4px",
                      borderRadius: "4px",
                      display: "flex",
                      alignItems: "center",
                      opacity: isSelected ? 0.9 : 0.4
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "#EF4444")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-tertiary)")}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                <div style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  paddingLeft: "23px"
                }}>
                  <span style={{ fontSize: "11px", color: "var(--text-tertiary)" }}>
                    {(doc.file_size / 1024).toFixed(0)} KB
                  </span>
                  {renderStatus(doc)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
}
