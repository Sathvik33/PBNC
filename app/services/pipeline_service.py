from datetime import datetime, timezone
from sqlalchemy.orm import Session
from app.models.document import Document
from app.models.processing_job import ProcessingJob
from app.models.enums import DocumentStatus, JobStatus, ProcessingStage
from app.core.logging import logger

PIPELINE_STAGES = [
    (ProcessingStage.VALIDATING, 0, DocumentStatus.VALIDATING),
    (ProcessingStage.EXTRACTING_PAGES, 10, DocumentStatus.PROCESSING),
    (ProcessingStage.PREPROCESSING, 20, DocumentStatus.PROCESSING),
    (ProcessingStage.OCR, 35, DocumentStatus.OCR_PROCESSING),
    (ProcessingStage.TEXT_NORMALIZATION, 50, DocumentStatus.EXTRACTING),
    (ProcessingStage.QUESTION_SEGMENTATION, 65, DocumentStatus.EXTRACTING),
    (ProcessingStage.QUESTION_EXTRACTION, 75, DocumentStatus.EXTRACTING),
    (ProcessingStage.ANSWER_KEY, 85, DocumentStatus.MATCHING_ANSWERS),
    (ProcessingStage.MATCHING, 90, DocumentStatus.MATCHING_ANSWERS),
    (ProcessingStage.VALIDATION, 95, DocumentStatus.VALIDATING_RESULTS),
    (ProcessingStage.COMPLETED, 100, DocumentStatus.COMPLETED),
]


def update_job_progress(
    db: Session,
    job: ProcessingJob,
    stage: ProcessingStage,
    progress: int,
    doc_status: DocumentStatus
):
    job.current_stage = stage
    job.progress = progress
    if progress == 100:
        job.status = JobStatus.SUCCESS
        job.completed_at = datetime.now(timezone.utc)
    else:
        job.status = JobStatus.RUNNING

    if job.document:
        job.document.status = doc_status
        if progress == 100:
            job.document.processing_completed_at = datetime.now(timezone.utc)

    db.commit()


def run_pipeline(db: Session, job_id: str):
    job = db.query(ProcessingJob).filter(ProcessingJob.id == job_id).first()
    if not job:
        logger.error(f"ProcessingJob {job_id} not found")
        return

    doc = job.document
    if not doc:
        logger.error(f"Document for job {job_id} not found")
        return

    now = datetime.now(timezone.utc)
    job.started_at = now
    job.status = JobStatus.RUNNING
    doc.processing_started_at = now
    db.commit()

    try:
        for stage, progress, doc_status in PIPELINE_STAGES:
            logger.info(f"Processing document {doc.id} - stage: {stage.value} ({progress}%)")
            update_job_progress(db, job, stage, progress, doc_status)

        logger.info(f"Pipeline completed for document {doc.id}")

    except Exception as e:
        logger.exception(f"Pipeline failed for document {doc.id}: {e}")
        job.status = JobStatus.FAILURE
        job.error = str(e)
        job.completed_at = datetime.now(timezone.utc)
        doc.status = DocumentStatus.FAILED
        doc.error_message = str(e)
        db.commit()
        raise e
