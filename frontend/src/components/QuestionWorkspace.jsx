import React, { useState, useEffect } from "react";
import { Download, Filter, RefreshCw, Layers } from "lucide-react";
import { api } from "../services/api";
import QuestionCard from "./QuestionCard";

export default function QuestionWorkspace({ selectedDocId }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [minConfidence, setMinConfidence] = useState(0);

  const fetchQuestions = async () => {
    if (!selectedDocId) return;
    setLoading(true);
    try {
      const params = {};
      if (typeFilter) params.type = typeFilter;
      if (minConfidence > 0) params.min_confidence = minConfidence / 100;

      const res = await api.getQuestions(selectedDocId, params);
      setQuestions(res.items || []);
    } catch (err) {
      console.error("Failed to load questions:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [selectedDocId, typeFilter, minConfidence]);

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(questions, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `extracted_questions_${selectedDocId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  if (!selectedDocId) {
    return (
      <div style={{
        backgroundColor: "var(--bg-surface)",
        border: "1px solid var(--border)",
        borderRadius: "14px",
        padding: "48px 24px",
        textAlign: "center",
        color: "var(--text-muted)"
      }}>
        <Layers size={36} color="var(--text-subtle)" style={{ marginBottom: "12px" }} />
        <h4 style={{ fontSize: "16px", color: "var(--text-main)", marginBottom: "4px" }}>
          Select a Document to View Questions
        </h4>
        <p style={{ fontSize: "13.5px" }}>
          Click on any document in the list above to inspect its extracted question items and answer keys.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: "var(--bg-surface)",
      border: "1px solid var(--border)",
      borderRadius: "14px",
      padding: "24px"
    }}>
      {/* Action Header & Filters */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "14px",
        marginBottom: "24px"
      }}>
        <div>
          <h3 style={{ fontSize: "18px", fontWeight: "700" }}>
            Extracted Questions ({questions.length})
          </h3>
          <p style={{ fontSize: "13px", color: "var(--text-muted)" }}>
            Structured outputs parsed through multi-format segmentation & LLM classification
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              backgroundColor: "var(--bg-main)",
              border: "1px solid var(--border)",
              color: "var(--text-main)",
              fontSize: "13px",
              outline: "none"
            }}
          >
            <option value="">All Question Types</option>
            <option value="MCQ">MCQ</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="FILL_IN_BLANK">Fill in Blank</option>
            <option value="SHORT_ANSWER">Short Answer</option>
            <option value="DESCRIPTIVE">Descriptive</option>
          </select>

          <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", color: "var(--text-muted)" }}>
            <span>Min Conf:</span>
            <input
              type="range"
              min="0"
              max="90"
              step="10"
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
              style={{ width: "80px", accentColor: "var(--primary)" }}
            />
            <span style={{ fontWeight: "700", color: "var(--text-main)" }}>{minConfidence}%</span>
          </div>

          <button
            onClick={fetchQuestions}
            style={{
              padding: "8px 12px",
              borderRadius: "8px",
              backgroundColor: "var(--bg-main)",
              border: "1px solid var(--border)",
              color: "var(--text-main)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px"
            }}
          >
            <RefreshCw size={14} className={loading ? "glow-active" : ""} /> Refresh
          </button>

          <button
            onClick={handleExportJSON}
            disabled={questions.length === 0}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              backgroundColor: "var(--primary)",
              color: "#FFFFFF",
              border: "none",
              cursor: questions.length === 0 ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              fontSize: "13px",
              fontWeight: "600",
              opacity: questions.length === 0 ? 0.6 : 1
            }}
          >
            <Download size={14} /> Export JSON
          </button>
        </div>
      </div>

      {/* Questions Grid */}
      {loading ? (
        <p style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
          Loading extracted questions...
        </p>
      ) : questions.length === 0 ? (
        <p style={{ textAlign: "center", padding: "40px", color: "var(--text-muted)" }}>
          No questions found for this document matching the filter criteria. If processing just started, wait for it to complete.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {questions.map((q) => (
            <QuestionCard key={q.id} question={q} />
          ))}
        </div>
      )}
    </div>
  );
}
