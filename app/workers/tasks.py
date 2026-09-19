from app.workers.celery_app import celery_app
from app.core.logging import logger


@celery_app.task(name="tasks.ping")
def ping():
    logger.info("Celery ping task executed successfully.")
    return "pong"
