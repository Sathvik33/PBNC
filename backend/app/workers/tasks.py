from app.workers.celery_app import celery_app
from app.core.database import get_sync_db
from app.core.logging import logger
from app.services.pipeline_service import run_pipeline


@celery_app.task(name="tasks.ping")
def ping():
    logger.info("Celery ping task executed successfully.")
    return "pong"


@celery_app.task(name="tasks.process_document", bind=True)
def process_document(self, job_id: str):
    logger.info(f"Starting async processing for job {job_id} with task id {self.request.id}")
    db_gen = get_sync_db()
    db = next(db_gen)
    try:
        run_pipeline(db, job_id)
        return {"job_id": job_id, "status": "COMPLETED"}
    finally:
        try:
            next(db_gen)
        except StopIteration:
            pass
