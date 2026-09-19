from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.models.enums import JobStatus, ProcessingStage, DocumentStatus


class ProcessingJobResponse(BaseModel):
    id: str
    document_id: str
    celery_task_id: Optional[str] = None
    status: JobStatus
    progress: int
    current_stage: ProcessingStage
    error: Optional[str] = None
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class DocumentStatusResponse(BaseModel):
    document_id: str
    document_status: DocumentStatus
    job: Optional[ProcessingJobResponse] = None
