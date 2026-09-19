import uuid
import pytest
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_processing_pipeline_workflow(async_client: AsyncClient):
    unique_email = f"worker_test_{uuid.uuid4().hex[:8]}@example.com"
    password = "WorkerPassword123!"

    reg_res = await async_client.post(
        "/api/v1/auth/register",
        json={"email": unique_email, "password": password}
    )
    assert reg_res.status_code == 201

    login_res = await async_client.post(
        "/api/v1/auth/login",
        json={"email": unique_email, "password": password}
    )
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    pdf_content = b"%PDF-1.4\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF"
    upload_res = await async_client.post(
        "/api/v1/documents",
        headers=headers,
        files={"file": ("exam_test.pdf", pdf_content, "application/pdf")}
    )
    assert upload_res.status_code == 201
    doc_id = upload_res.json()["id"]

    # Trigger processing
    process_res = await async_client.post(
        f"/api/v1/documents/{doc_id}/process",
        headers=headers
    )
    assert process_res.status_code == 202
    job_data = process_res.json()
    assert job_data["document_id"] == doc_id
    assert "id" in job_data

    # Check status endpoint
    status_res = await async_client.get(
        f"/api/v1/documents/{doc_id}/status",
        headers=headers
    )
    assert status_res.status_code == 200
    status_data = status_res.json()
    assert status_data["document_id"] == doc_id
    assert status_data["job"] is not None
    assert status_data["job"]["progress"] in [0, 10, 20, 35, 50, 65, 75, 85, 90, 95, 100]
