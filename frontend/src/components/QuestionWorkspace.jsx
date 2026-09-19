import React, { useState, useEffect } from "react";
import { Download, RefreshCw, Search, FileQuestion, Filter } from "lucide-react";
import { api } from "../services/api";
import QuestionCard from "./QuestionCard";

export default function QuestionWorkspace({ selectedDoc, onRefresh }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const selectedDocId = selectedDoc?.id;

  const fetchQuestions = async () => {
    if (!selectedDocId) return;
    setLoading(true);
    try {
      const params = {};
      if (typeFilter) params.type = typeFilter;

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
  }, [selectedDocId, typeFilter]);

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(questions, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `questions_${selectedDoc?.filename || selectedDocId}.json`);
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

  if (!selectedDoc) {
    return (
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px",
        color: "var(--text-tertiary)"
      }}>
        <FileQuestion size={40} style={{ marginBottom: "12px", opacity: 0.5 }} />
        <h3 style={{ fontSize: "16px", color: "var(--text-secondary)", fontWeight: "500" }}>
          No document selected
        </h3>
        <p style={{ fontSize: "13px", marginTop: "4px" }}>
          Select a document from the left sidebar or click <strong>+</strong> to upload a new one.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      display: "flex",
      flexDirection: "column",
      height: "calc(100vh - 60px)",
      overflowY: "auto",
      padding: "24px 32px"
    }}>
      {/* Workspace Header */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: "14px",
        paddingBottom: "18px",
        borderBottom: "1px solid var(--border-subtle)",
        marginBottom: "20px"
      }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: "600", color: "#FFFFFF" }}>
              {selectedDoc.filename}
            </h2>
            <span style={{
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              color: "var(--text-secondary)",
              backgroundColor: "rgba(255, 255, 255, 0.06)",
              padding: "2px 8px",
              borderRadius: "4px"
            }}>
              {filteredQuestions.length} questions
            </span>
          </div>
          <p style={{ fontSize: "12.5px", color: "var(--text-tertiary)", marginTop: "4px" }}>
            Uploaded on {new Date(selectedDoc.created_at).toLocaleDateString()} • {(selectedDoc.file_size / 1024).toFixed(0)} KB
          </p>
        </div>

        {/* Toolbar (Clean search & type filter only) */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Quick Search */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            backgroundColor: "var(--bg-input)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "8px",
            padding: "6px 12px"
          }}>
            <Search size={14} color="var(--text-tertiary)" />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--text-primary)",
                fontSize: "13px",
                outline: "none",
                width: "180px"
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
            <option value="">All Question Types</option>
            <option value="MCQ">MCQ</option>
            <option value="TRUE_FALSE">True / False</option>
            <option value="FILL_BLANK">Fill in Blank</option>
            <option value="SHORT_ANSWER">Short Answer</option>
            <option value="DESCRIPTIVE">Descriptive</option>
          </select>

          <button onClick={fetchQuestions} className="btn-secondary" title="Refresh">
            <RefreshCw size={14} className={loading ? "spin" : ""} />
          </button>

          <button
            onClick={handleExportJSON}
            disabled={questions.length === 0}
            className="btn-primary"
          >
            <Download size={14} /> Export JSON
          </button>
        </div>
      </div>

      {/* Questions List */}
      {loading ? (
        <p style={{ textAlign: "center", padding: "60px 0", color: "var(--text-tertiary)", fontSize: "14px" }}>
          Loading questions...
        </p>
      ) : filteredQuestions.length === 0 ? (
        <div style={{
          padding: "48px 24px",
          textAlign: "center",
          backgroundColor: "var(--bg-card)",
          borderRadius: "12px",
          border: "1px solid var(--border-subtle)",
          color: "var(--text-secondary)"
        }}>
          {selectedDoc.status === "UPLOADED" ? (
            <div>
              <p style={{ fontSize: "14px", fontWeight: "500", color: "#FFFFFF", marginBottom: "8px" }}>
                This document has not been processed yet.
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
                Click <strong>"Extract"</strong> next to the document in the sidebar to run the extraction pipeline.
              </p>
            </div>
          ) : (
            <p style={{ fontSize: "13.5px" }}>
              No questions found matching your filter criteria.
            </p>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingBottom: "40px" }}>
          {filteredQuestions.map((q) => (
            <QuestionCard key={q.id} question={q} />
          ))}
        </div>
      )}
    </div>
  );
}
