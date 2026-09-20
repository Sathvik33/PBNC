import React, { useState, useEffect } from "react";
import { 
  Download, RefreshCw, Search, FileQuestion, Filter, Play, 
  UploadCloud, Sparkles, CheckCircle2, ArrowRight, FileText, Zap, ShieldCheck 
} from "lucide-react";
import { api } from "../services/api";
import QuestionCard from "./QuestionCard";

export default function QuestionWorkspace({ selectedDoc, onRefresh, onOpenUpload }) {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeJob, setActiveJob] = useState(null);

  const selectedDocId = selectedDoc?.id;

  const fetchQuestions = async () => {
    if (!selectedDocId) return;
    try {
      // Fetch all questions for document so client-side filtering by type & search is instant
      const params = { limit: 100 };
      const res = await api.getQuestions(selectedDocId, params);
      setQuestions(res.items || []);
    } catch (err) {
      console.error("Failed to load questions:", err);
    }
  };

  // Continuous live polling during extraction
  useEffect(() => {
    if (!selectedDocId) return;
    
    // Initial fetch
    setLoading(true);
    fetchQuestions().finally(() => setLoading(false));

    let isPolling = true;
    let consecutiveCompletedChecks = 0;

    const pollInterval = setInterval(async () => {
      try {
        const res = await api.getJobStatus(selectedDocId);
        const job = res.job;
        const docStatus = res.document_status;

        const isRunning = (
          (job && (job.status === "RUNNING" || job.status === "PENDING" || job.status === "STARTED")) ||
          ["VALIDATING", "PROCESSING", "OCR_PROCESSING", "EXTRACTING", "MATCHING_ANSWERS", "VALIDATING_RESULTS"].includes(docStatus)
        );

        if (isRunning) {
          consecutiveCompletedChecks = 0;
          setActiveJob({
            stage: (job && job.current_stage) || docStatus,
            progress: (job && job.progress != null) ? job.progress : 25
          });
          // Continuously refresh questions as new items are extracted
          fetchQuestions();
        } else if (docStatus === "COMPLETED" || docStatus === "COMPLETED_WITH_WARNINGS" || (job && job.status === "SUCCESS")) {
          consecutiveCompletedChecks += 1;
          // Do one more immediate fetch and give a brief grace period before stopping polling
          fetchQuestions();
          if (consecutiveCompletedChecks >= 2) {
            setActiveJob(null);
            if (onRefresh) onRefresh();
            clearInterval(pollInterval);
          }
        } else if (docStatus === "FAILED" || (job && job.status === "FAILURE")) {
          setActiveJob(null);
          clearInterval(pollInterval);
        }
      } catch (e) {
        // Silent poll error, continue polling
      }
    }, 1500);

    return () => {
      isPolling = false;
      clearInterval(pollInterval);
    };
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
    if (typeFilter) {
      const normalize = (t) => (t || "").toUpperCase().replace(/[\s\-_/]/g, "");
      const normQType = normalize(q.question_type);
      const normFilter = normalize(typeFilter);

      // Check direct normalized match or TRUE/FALSE variants
      const matchesType = normQType === normFilter ||
        (normFilter === "TRUEFALSE" && (normQType === "TRUEFALSE" || normQType === "TF" || normQType === "BOOLEAN"));

      if (!matchesType) return false;
    }

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
        padding: "48px 32px",
        overflowY: "auto",
        backgroundColor: "var(--bg-main)"
      }}>
        <div style={{
          maxWidth: "760px",
          width: "100%",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center"
        }}>
          {/* Header Badge */}
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            padding: "6px 14px",
            borderRadius: "20px",
            backgroundColor: "rgba(59, 130, 246, 0.12)",
            border: "1px solid rgba(59, 130, 246, 0.28)",
            color: "#60a5fa",
            fontSize: "13px",
            fontWeight: "500",
            marginBottom: "18px"
          }}>
            <Sparkles size={14} />
            <span>AI Automated Question Extraction Pipeline</span>
          </div>

          <h2 style={{
            fontSize: "28px",
            fontWeight: "700",
            color: "var(--text-primary)",
            marginBottom: "12px",
            letterSpacing: "-0.02em"
          }}>
            Welcome to DocIntelligence
          </h2>

          <p style={{
            fontSize: "15px",
            color: "var(--text-secondary)",
            lineHeight: "1.6",
            maxWidth: "600px",
            marginBottom: "32px"
          }}>
            Upload any exam paper, worksheet, or assessment document. Our intelligent multi-model vision and NLP pipeline will extract structured questions, choices, and answer keys in seconds.
          </p>

          {/* Quick CTA */}
          {onOpenUpload && (
            <button
              onClick={onOpenUpload}
              className="btn-primary"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "10px",
                padding: "12px 26px",
                fontSize: "15px",
                fontWeight: "600",
                borderRadius: "8px",
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.35)",
                cursor: "pointer",
                marginBottom: "44px"
              }}
            >
              <UploadCloud size={18} />
              <span>Upload New Document</span>
            </button>
          )}

          {/* 3 Step Instruction Cards */}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: "18px",
            width: "100%",
            textAlign: "left"
          }}>
            {/* Step 1 */}
            <div style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "10px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "10px"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(59, 130, 246, 0.12)",
                  color: "#60a5fa",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <UploadCloud size={18} />
                </div>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-tertiary)" }}>STEP 1</span>
              </div>
              <h4 style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>
                Upload Document
              </h4>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
                Click <strong>Upload</strong> or <strong>+</strong> in the sidebar. Drop exam PDFs, images (PNG, JPG, WebP), or scanned question papers.
              </p>
            </div>

            {/* Step 2 */}
            <div style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "10px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "10px"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(245, 158, 11, 0.12)",
                  color: "#fbbf24",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <Zap size={18} />
                </div>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-tertiary)" }}>STEP 2</span>
              </div>
              <h4 style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>
                Automatic Extract
              </h4>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
                The background AI worker starts immediately. It runs OCR, segments question stems, labels answer options, and detects question types.
              </p>
            </div>

            {/* Step 3 */}
            <div style={{
              backgroundColor: "var(--bg-card)",
              border: "1px solid var(--border-subtle)",
              borderRadius: "10px",
              padding: "20px",
              display: "flex",
              flexDirection: "column",
              gap: "10px"
            }}>
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <div style={{
                  width: "36px",
                  height: "36px",
                  borderRadius: "8px",
                  backgroundColor: "rgba(16, 185, 129, 0.12)",
                  color: "#34d399",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}>
                  <ShieldCheck size={18} />
                </div>
                <span style={{ fontSize: "12px", fontWeight: "700", color: "var(--text-tertiary)" }}>STEP 3</span>
              </div>
              <h4 style={{ fontSize: "15px", fontWeight: "600", color: "var(--text-primary)" }}>
                Review & Export
              </h4>
              <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: "1.5", margin: 0 }}>
                Filter by <strong>MCQ</strong>, <strong>True/False</strong>, or search questions. Review confidence scores, quality alerts, and export clean JSON.
              </p>
            </div>
          </div>

          {/* Quick tip footnote */}
          <div style={{
            marginTop: "32px",
            padding: "12px 18px",
            backgroundColor: "rgba(255, 255, 255, 0.02)",
            border: "1px dashed var(--border-subtle)",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            gap: "10px",
            fontSize: "12.5px",
            color: "var(--text-tertiary)"
          }}>
            <FileText size={14} style={{ color: "var(--primary)", flexShrink: 0 }} />
            <span>
              <strong>Tip:</strong> Already uploaded documents are listed on the left. Click any document to view or re-run extraction anytime.
            </span>
          </div>
        </div>
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
            <option value="UNKNOWN">Other / Unknown</option>
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

      {/* Live Pipeline Processing Banner */}
      {activeJob && (
        <div style={{
          backgroundColor: "rgba(59, 130, 246, 0.08)",
          border: "1px solid rgba(59, 130, 246, 0.25)",
          borderRadius: "8px",
          padding: "12px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              backgroundColor: "#3B82F6",
              boxShadow: "0 0 10px #3B82F6"
            }} />
            <span style={{ fontSize: "13.5px", fontWeight: "500", color: "#60A5FA" }}>
              Pipeline Active: <strong>{activeJob.stage}</strong>
            </span>
          </div>
          <span style={{ fontSize: "12.5px", color: "var(--text-secondary)", fontFamily: "var(--font-mono)" }}>
            {activeJob.progress}% complete
          </span>
        </div>
      )}

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
          {activeJob ? (
            <div>
              <div style={{
                display: "inline-block",
                width: "24px",
                height: "24px",
                border: "2px solid rgba(59, 130, 246, 0.2)",
                borderTopColor: "#3B82F6",
                borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                marginBottom: "12px"
              }} />
              <p style={{ fontSize: "14px", fontWeight: "500", color: "#FFFFFF", marginBottom: "4px" }}>
                Extracting questions in progress...
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-tertiary)" }}>
                Current stage: <strong style={{ color: "#60A5FA" }}>{activeJob.stage}</strong> ({activeJob.progress}%). Parsed items will render automatically here.
              </p>
            </div>
          ) : selectedDoc.status === "UPLOADED" || questions.length === 0 ? (
            <div>
              <p style={{ fontSize: "14px", fontWeight: "500", color: "#FFFFFF", marginBottom: "8px" }}>
                {selectedDoc.status === "UPLOADED" ? "This document has not been processed yet." : "No questions extracted yet for this document."}
              </p>
              <p style={{ fontSize: "13px", color: "var(--text-tertiary)", marginBottom: "16px" }}>
                Click below to run the OCR and AI extraction pipeline on this file.
              </p>
              <button
                onClick={async () => {
                  try {
                    await api.triggerProcessing(selectedDoc.id);
                    if (onRefresh) onRefresh();
                  } catch (e) {
                    alert("Extraction trigger failed: " + e.message);
                  }
                }}
                className="btn-primary"
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", margin: "0 auto" }}
              >
                <Play size={13} /> Extract Questions Now
              </button>
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
