from pydantic import BaseModel
from typing import List, Dict, Optional, Any


class QuestionOption(BaseModel):
    label: str
    text: str


class QuestionSegment(BaseModel):
    detected_number: Optional[str] = None
    text: str
    options: List[QuestionOption] = []
    start_page: int
    end_page: int
    confidence: float = 1.0
    source_regions: List[Dict[str, Any]] = []
