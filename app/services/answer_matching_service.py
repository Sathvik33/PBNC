from typing import List, Dict, Tuple, Optional
from pydantic import BaseModel
from app.models.question import Question
from app.models.answer_key_entry import AnswerKeyEntry


class MatchResult(BaseModel):
    status: str  # MATCHED, UNCERTAIN, UNMATCHED
    answer: Optional[str] = None
    answer_confidence: float = 0.0
    warning: Optional[str] = None


class AnswerMatchingService:
    @classmethod
    def match_answers(
        cls,
        questions: List[Question],
        answer_entries: List[AnswerKeyEntry]
    ) -> Dict[str, MatchResult]:
        results: Dict[str, MatchResult] = {}
        answer_map: Dict[str, AnswerKeyEntry] = {
            entry.question_number.strip(): entry for entry in answer_entries
        }

        for q in questions:
            q_num = (q.question_number or "").strip()
            if q_num and q_num in answer_map:
                entry = answer_map[q_num]
                results[q.id] = MatchResult(
                    status="MATCHED",
                    answer=entry.answer,
                    answer_confidence=entry.confidence
                )
            elif not q_num:
                results[q.id] = MatchResult(
                    status="UNCERTAIN",
                    answer=None,
                    answer_confidence=0.3,
                    warning="Unable to reliably associate answer: missing question number"
                )
            else:
                results[q.id] = MatchResult(
                    status="UNMATCHED",
                    answer=None,
                    answer_confidence=0.0
                )

        return results
