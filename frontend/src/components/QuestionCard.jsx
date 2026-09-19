import React, { useState } from "react";
import { CheckCircle, AlertTriangle, HelpCircle, Layers, Tag } from "lucide-react";

export default function QuestionCard({ question }) {
  const [showWarnings, setShowWarnings] = useState(false);

  const getConfidenceColor = (conf) => {
    if (conf >= 0.85) return "#10B981";
    if (conf >= 0.65) return "#F59E0B";
    return "#EF4444";
  };

  const confidencePercent = Math.round((question.confidence || 0) * 100);

  return (
    <div style={{
      backgroundColor: "var(--bg-surface)",
      border: "1px solid var(--border)",
      borderRadius: "14px",
      padding: "22px",
      display: "flex",
      flexDirection: "column",
      gap: "14px",
      position: "relative",
      overflow: "hidden"
    }} className="animate-fade">
      {/* Top Meta Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{
            fontSize: "13px",
            fontWeight: "700",
            backgroundColor: "rgba(99, 102, 241, 0.15)",
            color: "#818CF8",
            padding: "4px 10px",
            borderRadius: "6px"
          }}>
            #{question.question_number}
          </span>
          <span style={{
            fontSize: "12px",
            fontWeight: "600",
            color: "var(--text-muted)",
            backgroundColor: "var(--bg-main)",
            border: "1px solid var(--border)",
            padding: "4px 8px",
            borderRadius: "6px"
          }}>
            {question.question_type}
          </span>
        </div>

        {/* Confidence Indicator */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{
              width: "60px",
              height: "6px",
              backgroundColor: "var(--bg-main)",
              borderRadius: "3px",
              overflow: "hidden"
            }}>
              <div style={{
                width: `${confidencePercent}%`,
                height: "100%",
                backgroundColor: getConfidenceColor(question.confidence)
              }} />
            </div>
            <span style={{
              fontSize: "12px",
              fontWeight: "700",
              color: getConfidenceColor(question.confidence)
            }}>
              {confidencePercent}%
            </span>
          </div>

          {question.status === "FLAGGED" && (
            <span style={{
              fontSize: "11px",
              fontWeight: "700",
              backgroundColor: "rgba(239, 68, 68, 0.15)",
              color: "#F87171",
              padding: "3px 8px",
              borderRadius: "5px",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}>
              <AlertTriangle size={12} /> FLAGGED
            </span>
          )}
        </div>
      </div>

      {/* Question Stem */}
      <p style={{
        fontSize: "15px",
        fontWeight: "500",
        color: "var(--text-main)",
        lineHeight: "1.6",
        whiteSpace: "pre-wrap"
      }}>
        {question.question_text}
      </p>

      {/* MCQ Options Grid */}
      {question.options && question.options.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "8px", marginTop: "4px" }}>
          {question.options.map((opt, idx) => {
            const isCorrect = opt.is_correct;
            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  backgroundColor: isCorrect ? "rgba(16, 185, 129, 0.08)" : "var(--bg-main)",
                  border: `1px solid ${isCorrect ? "rgba(16, 185, 129, 0.4)" : "var(--border)"}`
                }}
              >
                <span style={{
                  fontSize: "12px",
                  fontWeight: "700",
                  width: "22px",
                  height: "22px",
                  borderRadius: "50%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isCorrect ? "#10B981" : "rgba(255, 255, 255, 0.08)",
                  color: isCorrect ? "#FFFFFF" : "var(--text-muted)"
                }}>
                  {opt.key}
                </span>
                <span style={{
                  fontSize: "14px",
                  color: isCorrect ? "#34D399" : "var(--text-main)",
                  fontWeight: isCorrect ? "600" : "400"
                }}>
                  {opt.text}
                </span>
                {isCorrect && (
                  <CheckCircle size={16} color="#10B981" style={{ marginLeft: "auto" }} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Warnings & Source Page Details */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        borderTop: "1px solid var(--border)",
        paddingTop: "12px",
        marginTop: "4px"
      }}>
        <div style={{ fontSize: "12px", color: "var(--text-subtle)", display: "flex", alignItems: "center", gap: "6px" }}>
          <Layers size={14} /> Page {question.source_pages ? question.source_pages.join(", ") : "1"}
        </div>

        {question.warnings && question.warnings.length > 0 && (
          <button
            onClick={() => setShowWarnings(!showWarnings)}
            style={{
              background: "none",
              border: "none",
              color: "#F59E0B",
              fontSize: "12px",
              fontWeight: "600",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
          >
            <AlertTriangle size={13} /> {question.warnings.length} Quality Warning{question.warnings.length > 1 ? "s" : ""}
          </button>
        )}
      </div>

      {showWarnings && question.warnings && (
        <div style={{
          backgroundColor: "rgba(245, 158, 11, 0.08)",
          border: "1px solid rgba(245, 158, 11, 0.2)",
          borderRadius: "8px",
          padding: "10px 12px",
          display: "flex",
          flexDirection: "column",
          gap: "6px"
        }}>
          {question.warnings.map((w, idx) => (
            <div key={idx} style={{ fontSize: "12.5px", color: "#FBBF24" }}>
              • <strong>{w.warning_type}:</strong> {w.message}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
