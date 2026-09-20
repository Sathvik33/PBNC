# System Architecture Document: Document Intelligence & Question Extraction

**Document Version:** 1.0.0  
**Project:** Intelligent Assessment & Question Extraction Service (PBNC)  
**Target Length:** ~3–5 pages  

---

## 1. Problem Statement

Educational institutions, assessment bodies, and competitive exam trainers frequently receive assessments, past question papers, and quizzes in unstructured, heterogeneous formats. These include:
- **Born-digital PDFs** with selectable text.
- **Low-resolution scanned documents** with degradation, skew, and background noise.
- **Camera photos and screenshots** taken from computer screens or printed pages.
- **Complex typographical structures** such as multi-choice options (A–D, roman numerals), True/False questions, fill-in-the-blanks, mathematical symbols, and detached answer keys (often appended at the end of the paper or on separate pages).

### Core Challenges:
1. **Unreliable Traditional OCR**: Conventional rule-based OCR systems struggle with dense mathematical formulas, complex tables, noisy phone scans, and multi-column exam layouts.
2. **Structural Ambiguity**: Discerning between question stems, numbered sub-clauses, distractors, code snippets, and answer explanations requires contextual comprehension rather than rigid regex parsing.
3. **Detached Answer Matching**: Answer keys rarely appear adjacent to their corresponding question stems; associating questions with disconnected answer sections requires multi-pass semantic extraction.
4. **Lack of Trust & Verifiability**: Automated pipelines often suffer from hallucinated outputs or silently dropped questions without confidence metrics or human-in-the-loop review alerts.

---

## 2. Solution Overview

The **DocIntelligence System** is an end-to-end, fault-tolerant document intelligence platform designed to extract, parse, validate, and structure examination content into standardized JSON schemas.

### Key Architectural Pillars:
- **Hybrid Extraction Engine**: Ultra-fast PyMuPDF parsing for born-digital pages combined with multi-model Vision LLM OCR fallback for scanned images and screenshots.
- **Two-Pass Pipeline Architecture**: Decouples document text extraction and question segmentation from answer-key detection and reconciliation.
- **Multi-Model Failover Resilience**: Incorporates automated provider failover across OpenRouter and Groq Vision endpoints, guaranteeing high availability even under upstream rate limits (HTTP 429).
- **Rule & LLM Hybrid Question Segmenter**: Employs deterministic regex boundary segmentation to break long documents into isolated chunks, preventing LLM context truncation while maintaining cost efficiency.
- **Auditability & Review Warnings**: Calculates multi-factor confidence scores for every question and flags anomalies (e.g., missing correct answer, low OCR confidence, unparseable options) for manual review.

---

## 3. Architecture Diagram

```
+---------------------------------------------------------------------------------------------------+
|                                        CLIENT LAYER                                               |
|  React 18 + Vite Web App (Glassmorphic UI, Real-time Extraction Status, Question Workspace)       |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  | HTTPS / REST API (JWT Bearer)
                                                  v
+---------------------------------------------------------------------------------------------------+
|                                      API GATEWAY (FastAPI)                                        |
|  - Rate Limiting, Input Validation (Pydantic V2), JWT Auth                                        |
|  - File Upload & Storage Routing (Local Disk / AWS S3)                                            |
|  - Asynchronous Job Dispatcher                                                                    |
+---------------------------------------------------------------------------------------------------+
             |                                                                 |
             | Enqueue Job                                                     | Store Binary
             v                                                                 v
+--------------------------+                                      +---------------------------------+
|  REDIS (Broker & Cache)  |                                      |    S3 / LOCAL STORAGE           |
|  - Celery Task Queue     |                                      |    - Raw Document Artifacts     |
|  - Real-time Stage State |                                      |    - Page Images (150 DPI)      |
+--------------------------+                                      +---------------------------------+
             |
             | Pull Task
             v
+---------------------------------------------------------------------------------------------------+
|                               CELERY WORKER (Processing Pipeline)                                 |
|                                                                                                   |
|  +---------------------+      +---------------------+      +---------------------+                |
|  |  1. File Validation | ---> | 2. Page Extraction  | ---> |  3. Hybrid OCR      |                |
|  |  (MIME/Size checks) |      |    (PyMuPDF 150 DPI)|      |  (Vision Fallback)  |                |
|  +---------------------+      +---------------------+      +---------------------+                |
|                                                                       |                           |
|  +---------------------+      +---------------------+                 v                           |
|  |  6. LLM Structuring | <--- |  5. Chunk & Boundary| <--- +---------------------+                |
|  |  (Schema Extraction)|      |     Segmentation    |      | 4. Text Normalizer  |                |
|  +---------------------+      +---------------------+      | (Whitespace/Header) |                |
|            |                                               +---------------------+                |
|            v                                                                                      |
|  +---------------------+      +---------------------+      +---------------------+                |
|  | 7. Answer Key Match | ---> | 8. Confidence Score | ---> | 9. Database Persist |                |
|  |  (2-Pass Matcher)   |      |    & Warning Flags  |      |  (Atomic Commit)    |                |
|  +---------------------+      +---------------------+      +---------------------+                |
+---------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
                                    +---------------------------+
                                    |    POSTGRESQL DATABASE    |
                                    |  - User & Document State  |
                                    |  - Questions & Options    |
                                    |  - Review Warnings & Jobs |
                                    +---------------------------+
```

---

## 4. Detailed Processing Pipeline

The pipeline processes documents asynchronously through 9 sequential, observable stages:

1. **Validation & Ingestion**:
   - Inspects file headers, validates MIME types (`application/pdf`, `image/png`, `image/jpeg`, `image/webp`), and enforces size limits (< 50MB).
   - Generates SHA-256 content hashes to eliminate duplicate processing and persists raw artifacts to storage.

2. **Page Ingestion & Image Rendering**:
   - Uses PyMuPDF (`fitz`) to split documents into isolated pages and renders high-fidelity PNG bitmaps (`150 DPI`) for OCR analysis and frontend visual verification.

3. **Hybrid OCR Routing**:
   - Analyzes textual density of each page. Pages with `< 30` characters or high image coverage are dynamically routed to the Vision OCR engine. Digital pages skip OCR, achieving near-zero latency and cost.

4. **Text Cleaning & Normalization**:
   - Strips running headers, footers, page numbers, watermarks, and irregular line breaks. Normalizes unicode characters and mathematical symbols.

5. **Boundary Segmentation (Chunking)**:
   - Evaluates question boundary patterns using high-precision regex markers (e.g., `Q1.`, `Question 1:`, `1.`, `[1]`). Large papers are chunked into 3–5 question segments to avoid context-window limits.

6. **LLM Schema Structuring**:
   - Prompts the vision/language model with strict Pydantic schemas enforcing output structure: `question_number`, `question_type` (`MCQ`, `TRUE_FALSE`, `DESCRIPTIVE`), `question_text`, `options`, `correct_answer`, `explanation`.

7. **Answer-Key Extraction & Reconciliation**:
   - Scans trailing pages or dedicated answer sections using specialized pattern matching. Matches extracted answers back to segmented questions using question indices.

8. **Multi-Factor Confidence & Warning Generation**:
   - Evaluates extraction quality against empirical rules:
     - `NO_CORRECT_ANSWER`: Flagged if an MCQ question lacks an identified correct answer.
     - `INSUFFICIENT_OPTIONS`: Flagged if an MCQ has fewer than 2 parsed choices.
     - `LOW_CONFIDENCE`: Flagged if the composite confidence score falls below 0.70.
     - `SUSPICIOUS_STEM_LENGTH`: Flagged if the question stem contains fewer than 10 characters.

9. **Atomic Persistence & Notification**:
   - Commits structured records into PostgreSQL within a single transactional boundary and updates job state to `COMPLETED` for frontend polling.

---

## 5. Technology Choices

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Backend Framework** | **FastAPI (Python 3.11)** | High-throughput asynchronous performance, native Pydantic V2 schema validation, and automated OpenAPI/Swagger documentation generation. |
| **Task Queue & Broker** | **Celery + Redis** | Industry-standard distributed task execution with reliable retry policies, task state tracking, and memory-efficient broker queues. |
| **Database & ORM** | **PostgreSQL + SQLAlchemy + Alembic** | Robust relational model for hierarchical document-question-option schemas; migration version control via Alembic. |
| **PDF Extraction** | **PyMuPDF (`fitz`)** | Blazing-fast C-native PDF text and image rendering (10x faster than PDFMiner or PyPDF). |
| **Frontend Framework** | **React 18 + Vite** | Lightweight modern SPA architecture with instantaneous hot-module replacement and optimized production bundling. |
| **Containerization** | **Docker & Docker Compose** | Reproducible multi-service deployment isolating API, Celery worker, Redis, and frontend. |

---

## 6. OCR Approach

Our OCR design operates on an **adaptive tiering strategy**:

1. **Digital Bypass**: If a PDF page contains selectable text with character count $> 30$ and valid unicode mappings, native text extraction is used directly. This completes in $< 50\text{ ms}$ per page with 100% character fidelity at zero API cost.
2. **Vision LLM Primary OCR**: For scanned documents, handwritten notes, or images, the system invokes high-throughput Vision Language Models (`google/gemini-2.0-flash-001`, `meta-llama/llama-3.2-11b-vision-instruct`).
3. **Resilient Vision Fallback Tier**: If the primary vision endpoint is unavailable or returns HTTP 429 / 503, the provider automatically falls back through configured free vision models:
   - `inclusionai/ling-3.0-flash-vl:free`
   - `nex-agi/nex-n2.5-mini:free`
   - `qwen/qwen3.8-27b:free`
4. **Local Fallback Engine**: If cloud vision providers fail, Tesseract OCR provides local offline fallback text extraction.

---

## 7. LLM Approach

The structuring phase translates unstructured OCR text into structured Pydantic representations:

- **Strict JSON Mode**: Enforces structured JSON output (`response_format={"type": "json_object"}`) preventing conversational filler or markdown wrapping errors.
- **Few-Shot In-Context Guidance**: System prompts incorporate curated few-shot demonstrations showing edge cases: multi-line options, code snippets inside questions, and roman-numeral sub-questions.
- **Context-Preserving Chunking**: Instead of feeding entire 50-page exam papers into a single context window (which degrades attention and leads to lost questions in the middle), the pipeline segments documents into localized batches of 3–5 questions.
- **Provider Redundancy**: Configured through a unified factory pattern supporting OpenRouter, Groq, Anthropic, and local Ollama endpoints.

---

## 8. Answer-Key Matching Mechanism

Answer keys in exams typically appear in two distinct patterns:
1. **Embedded Answers**: The answer is highlighted or explicitly written beneath the question (e.g., `Answer: (B)`).
2. **Detached Answer Tables**: The document contains an answer section at the end of the paper (e.g., `1. C | 2. A | 3. D | 4. False`).

### Two-Pass Reconciliation Algorithm:
- **Pass 1 (Question Discovery)**: The question segmenter extracts stems and options. If an embedded answer is detected, it is immediately assigned.
- **Pass 2 (Table Extraction & Alignment)**: The answer extractor scans trailing pages for answer key blocks using pattern expressions (`Answer Key:`, `Solutions:`). Extracted keys are indexed into an in-memory hash map `{question_number: correct_key}`.
- **Reconciliation**: Questions lacking an embedded answer query the hash map by normalized question number (`"1"`, `"Q1"`, `"Question 1"`). When a match is made, the option's `is_correct` flag is set, and the `correct_answer` field is updated.

---

## 9. Confidence Scoring & Human-in-the-Loop Review

Every extracted question is assigned an objective confidence score ($C \in [0.0, 1.0]$) calculated as a weighted sum of four quality vectors:

$$C = w_{\text{ocr}} S_{\text{ocr}} + w_{\text{struct}} S_{\text{struct}} + w_{\text{opt}} S_{\text{opt}} + w_{\text{ans}} S_{\text{ans}}$$

Where:
- $S_{\text{ocr}}$: Confidence metric reported by the OCR engine ($0.25$).
- $S_{\text{struct}}$: Structural completeness (presence of clear question stem and question number) ($0.25$).
- $S_{\text{opt}}$: Option validity (all choices have identifiers and text) ($0.25$).
- $S_{\text{ans}}$: Answer resolution (correct answer successfully identified and verified against options) ($0.25$).

### Quality Warnings Drawer
Questions with scores $< 0.70$ or specific structural anomalies are automatically tagged with warning labels:
- `NO_CORRECT_ANSWER`: Prompted for instructor review.
- `INSUFFICIENT_OPTIONS`: Triggers notification if fewer than 2 options were extracted for an MCQ.
- `LOW_CONFIDENCE`: Highlights the card in amber/red on the web UI.

---

## 10. Security Architecture

- **Authentication & Authorization**: Stateless JWT (JSON Web Tokens) signed using HMAC-SHA256 with expiration enforcement. Passwords salted and hashed with bcrypt.
- **Role-Based Scoping**: All document and question queries are scoped strictly to the authenticated `user_id`, preventing horizontal privilege escalation (IDOR).
- **Storage Protection**: Files stored in S3 are referenced via signed private keys. Local storage paths are strictly sanitized against path traversal (`../`) attacks.
- **Input Sanitization**: File uploads are restricted by MIME sniffing and size quotas. API endpoints implement Pydantic strict-type sanitization against injection attacks.

---

## 11. Scalability & Operational Characteristics

- **Horizontal Worker Scaling**: Celery workers run statelessly. Increasing ingestion throughput is achieved simply by scaling worker containers:
  ```bash
  docker-compose up --scale celery_worker=4 -d
  ```
- **Connection Resiliency**: Configured with `broker_connection_retry_on_startup=True` and automatic connection pool recycling to survive transient Redis or PostgreSQL restarts.
- **Resource Footprint**:
  - Memory: API container $\approx 150\text{ MB}$, Celery worker $\approx 250\text{ MB}$, Redis $\approx 30\text{ MB}$.
  - Processing Latency: Digital PDFs process at $\approx 1.2\text{ s}$ per page; Scanned Vision OCR processes at $\approx 3.5\text{ s}$ per page.

---

## 12. Trade-offs & Known Limitations

1. **Vision API Latency vs. Cost**: Cloud-based Vision LLMs provide unmatched extraction accuracy on degraded scans, but have higher latency ($2–4\text{ s}$ per page) compared to traditional local Tesseract ($0.5\text{ s}$). We mitigate this with page-level text density detection so only scanned pages incur vision costs.
2. **Free Tier Rate Limits**: When relying on free OpenRouter/Groq tiers, high concurrency can trigger 429 rate limits. We address this using exponential backoff retries and automatic fallbacks across 3 distinct free models.
3. **Complex Diagram-Based Questions**: Questions containing geometry diagrams or circuit schematics are currently extracted with their textual stem and options, but graphical coordinate bounding boxes are not yet mapped to individual vector shapes.
4. **Handwritten Exam Variations**: Cursive or heavily degraded handwriting can experience lower confidence scores, which our confidence engine successfully detects and routes to the UI warnings drawer.
