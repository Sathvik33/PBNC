import io
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
        from app.services.s3_storage_service import get_storage_service
        from app.processors.pdf_processor import PDFProcessor
        from app.processors.image_processor import ImageProcessor
        from app.models.document_page import DocumentPage

        storage = get_storage_service()
        file_bytes = storage.download(doc.storage_path)

        update_job_progress(db, job, ProcessingStage.VALIDATING, 0, DocumentStatus.VALIDATING)

        update_job_progress(db, job, ProcessingStage.EXTRACTING_PAGES, 10, DocumentStatus.PROCESSING)
        pages_data = []

        if doc.file_type == "application/pdf":
            pdf_proc = PDFProcessor()
            pdf_result = pdf_proc.process(file_bytes)
            doc.page_count = pdf_result["page_count"]
            db.commit()

            for p in pdf_result["pages"]:
                img_path = None
                if p.image_bytes:
                    img_path = f"pages/{doc.id}/page_{p.page_number}.png"
                    storage.upload(io.BytesIO(p.image_bytes), img_path, "image/png")

                doc_page = DocumentPage(
                    document_id=doc.id,
                    page_number=p.page_number,
                    image_path=img_path,
                    extracted_text=p.text if not p.is_scanned else None,
                    ocr_used=p.is_scanned,
                    processing_status="EXTRACTED" if not p.is_scanned else "PENDING_OCR"
                )
                db.add(doc_page)
            db.commit()

        elif doc.file_type.startswith("image/"):
            img_proc = ImageProcessor()
            processed_bytes, _ = img_proc.process(file_bytes)
            img_path = f"pages/{doc.id}/page_1.png"
            storage.upload(io.BytesIO(processed_bytes), img_path, "image/png")
            doc.page_count = 1
            doc_page = DocumentPage(
                document_id=doc.id,
                page_number=1,
                image_path=img_path,
                extracted_text=None,
                ocr_used=True,
                processing_status="PENDING_OCR"
            )
            db.add(doc_page)
            db.commit()

        # OCR Processing Stage
        update_job_progress(db, job, ProcessingStage.OCR, 35, DocumentStatus.OCR_PROCESSING)
        from app.services.ocr_service import OCRService
        ocr_service = OCRService()

        for page in doc.pages:
            if page.ocr_used and page.processing_status == "PENDING_OCR" and page.image_path:
                try:
                    img_bytes = storage.download(page.image_path)
                    ocr_res = ocr_service.process_image(img_bytes)
                    page.extracted_text = ocr_res.raw_text
                    page.processing_status = "EXTRACTED"
                except Exception as ocr_err:
                    logger.warning(f"OCR processing failed for page {page.page_number}: {ocr_err}")
                    page.processing_status = "FAILED"
        db.commit()

        # Text Normalization Stage
        update_job_progress(db, job, ProcessingStage.TEXT_NORMALIZATION, 50, DocumentStatus.EXTRACTING)
        from app.processors.text_processor import TextNormalizer

        for page in doc.pages:
            if page.extracted_text:
                page.normalized_text = TextNormalizer.normalize(page.extracted_text)
        db.commit()

        # Question Segmentation Stage
        update_job_progress(db, job, ProcessingStage.QUESTION_SEGMENTATION, 65, DocumentStatus.EXTRACTING)
        from app.processors.question_segmenter import QuestionSegmenter
        from app.models.question import Question
        from app.models.enums import QuestionType, QuestionStatus

        page_texts = [(p.page_number, p.normalized_text or p.extracted_text or "") for p in doc.pages]
        segments = QuestionSegmenter.segment(page_texts)

        # Clear previous questions if re-running
        db.query(Question).filter(Question.document_id == doc.id).delete()

        for seg in segments:
            q = Question(
                document_id=doc.id,
                question_number=seg.detected_number,
                question_text=seg.text,
                question_type=QuestionType.MCQ if seg.options else QuestionType.UNKNOWN,
                options=[opt.model_dump() for opt in seg.options] if seg.options else None,
                confidence=seg.confidence,
                status=QuestionStatus.EXTRACTED if seg.confidence >= 0.85 else QuestionStatus.PARTIAL,
                source_pages=list(range(seg.start_page, seg.end_page + 1))
            )
            db.add(q)
        db.commit()

        # Progression through remaining pipeline stages
        for stage, progress, doc_status in PIPELINE_STAGES[6:]:
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
