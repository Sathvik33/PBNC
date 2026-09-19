import io
import uuid
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_auth_and_document_workflow(async_client: AsyncClient):
    unique_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    password = "SuperSecurePassword123!"

    # 1. Register user
    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": password}
    )
    assert reg_res.status_code == 201
    user_data = reg_res.json()
    assert user_data["email"] == unique_email
    assert "id" in user_data

    # Duplicate registration should fail
    dup_res = await async_client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": password}
    )
    assert dup_res.status_code == 400

    # 2. Login
    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": password}
    )
    assert login_res.status_code == 200
    token_data = login_res.json()
    assert "access_token" in token_data
    token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 3. Check /me profile
    me_res = await async_client.get("/api/v1/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["email"] == unique_email

    # 4. Upload valid PDF
    pdf_content = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    upload_res = await async_client.post(
        "/api/v1/documents",
        headers=headers,
        files={"file": ("sample_paper.pdf", pdf_content, "application/pdf")}
    )
    assert upload_res.status_code == 201
    doc_data = upload_res.json()
    assert doc_data["filename"] == "sample_paper.pdf"
    assert doc_data["file_type"] == "application/pdf"
    doc_id = doc_data["id"]

    # 5. List documents
    list_res = await async_client.get("/api/v1/documents", headers=headers)
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(d["id"] == doc_id for d in list_data["items"])

    # 6. Retrieve single document
    get_res = await async_client.get(f"/api/v1/documents/{doc_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["id"] == doc_id

    # 7. Reject unsupported file upload (e.g. .txt or spoofed)
    bad_upload = await async_client.post(
        "/api/v1/documents",
        headers=headers,
        files={"file": ("malicious.txt", b"plain text script", "text/plain")}
    )
    assert bad_upload.status_code == 400

    # 8. Reject unauthorized access
    unauth_res = await async_client.get("/api/v1/documents")
    assert unauth_res.status_code == 401

    # 9. Delete document
    del_res = await async_client.delete(f"/api/v1/documents/{doc_id}", headers=headers)
    assert del_res.status_code == 204

    # Confirm 404 after deletion
    get_after_del = await async_client.get(f"/api/v1/documents/{doc_id}", headers=headers)
    assert get_after_del.status_code == 404
