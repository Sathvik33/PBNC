import uuid
import pytest
from httpx import AsyncClient
from unittest.mock import patch
from app.providers.llm.base import LLMResponse
from app.models.enums import QuestionType, DocumentRelationshipType


@pytest.mark.asyncio
async def test_end_to_end_phases_8_to_16_workflow(async_client: AsyncClient):
    # 1. Register & login
    email = f"e2e_{uuid.uuid4().hex[:6]}@example.com"
    pwd = "E2E_SecurePassword123!"
    await async_client.post("/api/v1/auth/register", json={"email": email, "password": pwd})
    login_res = await async_client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Generate valid PDF with examination questions and answer key
    import fitz
    pdf_doc = fitz.open()
    page = pdf_doc.new_page()
    page.insert_text((50, 72), """1. Which gas is most abundant in Earth's atmosphere?
(A) Oxygen
(B) Nitrogen
(C) Carbon Dioxide
(D) Hydrogen

2. The Sun is a star.
(A) True
(B) False

ANSWER KEY
1. B
2. A
""")
    doc_content = pdf_doc.tobytes()
    pdf_doc.close()

    up_res = await async_client.post(
        "/api/v1/documents",
        headers=headers,
        files={"file": ("physics_exam.pdf", doc_content, "application/pdf")}
    )
    assert up_res.status_code == 201
    doc_id = up_res.json()["id"]

    # 3. Process the document
    proc_res = await async_client.post(f"/api/v1/documents/{doc_id}/process", headers=headers)
    assert proc_res.status_code == 202

    # 4. Fetch extracted questions
    q_res = await async_client.get(f"/api/v1/documents/{doc_id}/questions", headers=headers)
    assert q_res.status_code == 200
    q_data = q_res.json()
    assert q_data["total"] >= 2
    items = q_data["items"]

    # Verify Question 1 (MCQ, Answer B)
    q1 = next((q for q in items if q["question_number"] == "1"), None)
    assert q1 is not None
    assert "abundant in Earth's atmosphere" in q1["question_text"]
    assert q1["question_type"] == QuestionType.MCQ
    assert q1["answer"] == "B"
    assert q1["confidence"] >= 0.70

    # Verify Question 2 (True/False, Answer A)
    q2 = next((q for q in items if q["question_number"] == "2"), None)
    assert q2 is not None
    assert q2["question_type"] == QuestionType.TRUE_FALSE
    assert q2["answer"] == "A"

    # 5. Fetch answers endpoint
    ans_res = await async_client.get(f"/api/v1/documents/{doc_id}/answers", headers=headers)
    assert ans_res.status_code == 200
    answers = ans_res.json()
    assert len(answers) >= 2
    assert any(a["question_number"] == "1" and a["answer"] == "B" for a in answers)

    # 6. Fetch single question
    single_q_res = await async_client.get(f"/api/v1/questions/{q1['id']}", headers=headers)
    assert single_q_res.status_code == 200
    assert single_q_res.json()["id"] == q1["id"]

    # 7. Document relationship linking
    up2 = await async_client.post(
        "/api/v1/documents",
        headers=headers,
        files={"file": ("key.pdf", b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF", "application/pdf")}
    )
    doc2_id = up2.json()["id"]

    rel_res = await async_client.post(
        f"/api/v1/documents/{doc_id}/relationships",
        headers=headers,
        json={"related_document_id": doc2_id, "relationship_type": DocumentRelationshipType.ANSWER_KEY}
    )
    assert rel_res.status_code == 201

    get_rel = await async_client.get(f"/api/v1/documents/{doc_id}/relationships", headers=headers)
    assert get_rel.status_code == 200
    assert len(get_rel.json()) >= 1
