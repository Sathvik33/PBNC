import React, { useState, useEffect } from "react";
import { Download, RefreshCw, Layers, SlidersHorizontal, Search } from "lucide-react";
import { api } from "../services/api";
import QuestionCard from "./QuestionCard";

export default function QuestionWorkspace({ selectedDocId }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
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
    downloadAnchor.setAttribute("download", `questions_${selectedDocId}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const filteredQuestions = questions.filter(q => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    const stemMatches = (q.question_text || "").toLowerCase().includes(query);
    const numberMatches = (q.question_number || "").toString().includes(query);
    return stemMatches || numberMatches;
  });

  if (!selectedDocId) {
    return (
      <div style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--border-subtle)",
        borderRadius: "12px",
        padding: "48px 24px",
        textAlign: "center"
      }}>
        <Layers size={32} color="var(--text-tertiary)" style={{ marginBottom: "12px" }} />
        <h4 style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)", marginBottom: "4px" }}>
          No Document Selected
        </h4>
        <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
          Select a document from the list above to view its structured questions and answers.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      backgroundColor: "var(--bg-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "12px",
      padding: "20px"
    }}>
      {/* Action Header & Filters */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "12px",
        marginBottom: "20px"
      }}>
        <div>
          <h3 style={{ fontSize: "16px", fontWeight: "600", color: "var(--text-primary)" }}>
            Extracted Questions ({filteredQuestions.length})
          </h3>
          <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "2px" }}>
            Parsed stems, options, and linked answer keys.
          </p>
        </div>

        {/* Filter Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          {/* Quick Search */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            backgroundColor: "var(--bg-input)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            padding: "6px 10px"
          }}>
            <Search size={14} color="var(--text-tertiary)" />
            <input
              type="text"
              placeholder="Search in questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none",
                width: "160px"
              }}
            />
          </div>

          {/* Type Select */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            style={{
              padding: "7px 10px",
              borderRadius: "8px",
              backgroundColor: "var(--bg-input)",
              border: "1px solid var(--border-subtle)",
              color: "var(--text-primary)",
              fontSize: "13px",
              outline: "none"
            }}
          >
            <option value="">All Types</option>
            <option value="MCQ">MCQ</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="FILL_BLANK">Fill in Blank</option>
            <option value="SHORT_ANSWER">Short Answer</option>
            <option value="DESCRIPTIVE">Descriptive</option>
          </select>

          {/* Confidence Filter */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "12.5px",
            color: "var(--text-secondary)",
            backgroundColor: "var(--bg-input)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            padding: "6px 10px"
          }}>
            <SlidersHorizontal size={13} />
            <span>&ge; {minConfidence}%</span>
            <input
              type="range"
              min="0"
              max="90"
              step="10"
              value={minConfidence}
              onChange={(e) => setMinConfidence(Number(e.target.value))}
              style={{ width: "65px" }}
            />
          </div>

          <button onClick={fetchQuestions} className="btn-secondary" title="Refresh">
            <RefreshCw size={14} className={loading ? "spin" : ""} />
          </button>

          <button onClick={handleExportJSON} disabled={questions.length === 0} className="btn-primary">
            <Download size={14} /> Export JSON
          </button>
        </div>
      </div>

      {/* Questions Stack */}
      {loading ? (
        <p style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)", fontSize: "13.5px" }}>
          Loading extracted questions...
        </p>
      ) : filteredQuestions.length === 0 ? (
        <p style={{ textAlign: "center", padding: "40px", color: "var(--text-secondary)", fontSize: "13.5px" }}>
          No questions found matching your filter criteria. If processing is underway, wait a few seconds and refresh.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          {filteredQuestions.map((q) => (
            <QuestionCard key={q.id} question={q} />
          ))}
        </div>
      )}
    </div>
  );
}
