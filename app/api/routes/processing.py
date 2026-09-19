import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from app.core.database import get_db
from app.models.user import User
from app.models.document import Document
from app.models.processing_job import ProcessingJob
from app.models.enums import DocumentStatus, JobStatus, ProcessingStage
from app.schemas.processing import ProcessingJobResponse, DocumentStatusResponse
from app.api.dependencies import get_current_user
from app.workers.tasks import process_document
from app.core.logging import logger

router = APIRouter(tags=["Processing"])


@router.post("/documents/{document_id}/process", response_model=ProcessingJobResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_document_processing(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    stmt = select(Document).where(Document.id == document_id, Document.owner_id == current_user.id)
    res = await db.execute(stmt)
    doc = res.scalars().first()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    job_id = str(uuid.uuid4())
    job = ProcessingJob(
        id=job_id,
        document_id=doc.id,
        status=JobStatus.PENDING,
        progress=0,
        current_stage=ProcessingStage.VALIDATING,
        started_at=datetime.now(timezone.utc)
    )
    doc.status = DocumentStatus.VALIDATING
    db.add(job)
    await db.commit()
    await db.refresh(job)

    dispatched_async = False
    try:
        from app.core.redis import sync_redis_client
        sync_redis_client.ping()
        task = process_document.delay(job.id)
        job.celery_task_id = task.id
        await db.commit()
        await db.refresh(job)
        dispatched_async = True
    except Exception as e:
        logger.warning(f"Celery dispatch unavailable ({e}), running pipeline worker locally...")

    if not dispatched_async:
        from app.core.database import SyncSessionLocal
        from app.services.pipeline_service import run_pipeline
        with SyncSessionLocal() as sync_db:
            run_pipeline(sync_db, job.id)
        await db.refresh(job)

    return job


@router.get("/documents/{document_id}/status", response_model=DocumentStatusResponse)
async def get_document_status(
    document_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    doc_stmt = select(Document).where(Document.id == document_id, Document.owner_id == current_user.id)
    doc_res = await db.execute(doc_stmt)
    doc = doc_res.scalars().first()

    if not doc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Document not found"
        )

    job_stmt = (
        select(ProcessingJob)
        .where(ProcessingJob.document_id == doc.id)
        .order_by(desc(ProcessingJob.created_at))
    )
    job_res = await db.execute(job_stmt)
    latest_job = job_res.scalars().first()

    job_dto = ProcessingJobResponse.model_validate(latest_job) if latest_job else None

    return DocumentStatusResponse(
        document_id=doc.id,
        document_status=doc.status,
        job=job_dto
    )
