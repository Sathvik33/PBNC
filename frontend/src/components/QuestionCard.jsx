import React, { useState } from "react";
import { 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  ChevronDown, 
  ChevronUp, 
  FileText,
  Percent
} from "lucide-react";

export default function QuestionCard({ question }) {
  const [showDetails, setShowDetails] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    let copyText = `Q${question.question_number || ""}: ${question.question_text}\n`;
    if (question.options) {
      question.options.forEach(opt => {
        copyText += `${opt.label || opt.key}) ${opt.text}\n`;
      });
    }
    if (question.answer) {
      copyText += `Answer: ${question.answer}\n`;
    }
    navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const confidenceScore = Math.round((question.confidence || 0) * 100);
  
  // Clean color tags
  const getScoreColor = (score) => {
    if (score >= 85) return { text: "#34D399", bg: "rgba(16, 185, 129, 0.12)", border: "rgba(16, 185, 129, 0.25)" };
    if (score >= 65) return { text: "#FBBF24", bg: "rgba(245, 158, 11, 0.12)", border: "rgba(245, 158, 11, 0.25)" };
    return { text: "#F87171", bg: "rgba(239, 68, 68, 0.12)", border: "rgba(239, 68, 68, 0.25)" };
  };

  const scoreTheme = getScoreColor(confidenceScore);
  const warnings = question.warnings || [];

  return (
    <div style={{
      backgroundColor: "var(--bg-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "12px",
      padding: "20px",
      display: "flex",
      flexDirection: "column",
      gap: "14px",
      transition: "border-color 0.15s ease",
    }}>
      {/* Question Header Bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{
            fontSize: "13px",
            fontWeight: "700",
            fontFamily: "var(--font-mono)",
            color: "#FFFFFF",
            backgroundColor: "rgba(255, 255, 255, 0.08)",
            padding: "4px 10px",
            borderRadius: "6px"
          }}>
            #{question.question_number || "?"}
          </span>

          <span style={{
            fontSize: "12px",
            fontWeight: "500",
            color: "var(--text-secondary)",
            backgroundColor: "var(--bg-input)",
            border: "1px solid var(--border-subtle)",
            padding: "3px 8px",
            borderRadius: "6px"
          }}>
            {question.question_type || "Question"}
          </span>

          {question.source_pages && (
            <span style={{
              fontSize: "12px",
              color: "var(--text-tertiary)",
              display: "inline-flex",
              alignItems: "center",
              gap: "4px"
            }}>
              <FileText size={13} /> p. {question.source_pages.join(", ")}
            </span>
          )}
        </div>

        {/* Right Action & Confidence Bar */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Quality Warning Indicator */}
          {warnings.length > 0 && (
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "4px",
              fontSize: "12px",
              fontWeight: "600",
              color: "#FBBF24",
              backgroundColor: "rgba(245, 158, 11, 0.1)",
              border: "1px solid rgba(245, 158, 11, 0.2)",
              padding: "3px 8px",
              borderRadius: "6px"
            }}>
              <AlertCircle size={13} /> {warnings.length} alert{warnings.length > 1 ? "s" : ""}
            </span>
          )}

          {/* Confidence Badge */}
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "3px",
            fontSize: "12px",
            fontWeight: "600",
            fontFamily: "var(--font-mono)",
            color: scoreTheme.text,
            backgroundColor: scoreTheme.bg,
            border: `1px solid ${scoreTheme.border}`,
            padding: "3px 8px",
            borderRadius: "6px"
          }}>
            {confidenceScore}%
          </span>

          {/* Copy Button */}
          <button
            onClick={handleCopy}
            title="Copy question text"
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              cursor: "pointer",
              padding: "4px",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center"
            }}
          >
            {copied ? <Check size={16} color="#34D399" /> : <Copy size={16} />}
          </button>
        </div>
      </div>

      {/* Question Text */}
      <div style={{
        fontSize: "15px",
        fontWeight: "450",
        color: "var(--text-primary)",
        lineHeight: "1.65",
        whiteSpace: "pre-wrap"
      }}>
        {question.question_text}
      </div>

      {/* MCQ Options */}
      {question.options && question.options.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "4px" }}>
          {question.options.map((opt, idx) => {
            const optLabel = (opt.label || opt.key || "").trim().toUpperCase();
            const isCorrect = opt.is_correct || (question.answer && optLabel === question.answer.trim().toUpperCase());

            return (
              <div
                key={idx}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  padding: "10px 14px",
                  borderRadius: "8px",
                  backgroundColor: isCorrect ? "rgba(16, 185, 129, 0.08)" : "var(--bg-input)",
                  border: `1px solid ${isCorrect ? "rgba(16, 185, 129, 0.35)" : "var(--border-subtle)"}`,
                  transition: "background-color 0.15s ease"
                }}
              >
                <span style={{
                  fontSize: "12.5px",
                  fontWeight: "700",
                  fontFamily: "var(--font-mono)",
                  minWidth: "22px",
                  height: "22px",
                  borderRadius: "6px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: isCorrect ? "#10B981" : "rgba(255, 255, 255, 0.07)",
                  color: isCorrect ? "#FFFFFF" : "var(--text-secondary)",
                  marginTop: "1px"
                }}>
                  {optLabel}
                </span>

                <span style={{
                  fontSize: "14px",
                  color: isCorrect ? "#F1F5F9" : "var(--text-secondary)",
                  fontWeight: isCorrect ? "500" : "400",
                  flex: 1,
                  lineHeight: "1.5"
                }}>
                  {opt.text}
                </span>

                {isCorrect && (
                  <span style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "4px",
                    fontSize: "12px",
                    fontWeight: "600",
                    color: "#34D399",
                    marginLeft: "auto"
                  }}>
                    <CheckCircle2 size={16} /> Answer Key
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Answer Key summary line if no options (e.g. Fill-in-the-blank or Short answer) */}
      {(!question.options || question.options.length === 0) && question.answer && (
        <div style={{
          padding: "10px 14px",
          borderRadius: "8px",
          backgroundColor: "rgba(16, 185, 129, 0.08)",
          border: "1px solid rgba(16, 185, 129, 0.25)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          fontSize: "13.5px",
          color: "#34D399"
        }}>
          <CheckCircle2 size={16} />
          <strong>Key Answer:</strong> {question.answer}
        </div>
      )}

      {/* Warning expansion toggle */}
      {warnings.length > 0 && (
        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "12px" }}>
          <button
            onClick={() => setShowDetails(!showDetails)}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--text-secondary)",
              fontSize: "12.5px",
              fontWeight: "500",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showDetails ? "Hide Extraction Details" : `View ${warnings.length} Quality Warnings`}
          </button>

          {showDetails && (
            <div style={{ marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
              {warnings.map((w, idx) => (
                <div
                  key={idx}
                  style={{
                    backgroundColor: "rgba(245, 158, 11, 0.08)",
                    border: "1px solid rgba(245, 158, 11, 0.2)",
                    borderRadius: "6px",
                    padding: "8px 12px",
                    fontSize: "12.5px",
                    color: "#FCD34D"
                  }}
                >
                  <strong>{w.warning_type}:</strong> {w.message}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
