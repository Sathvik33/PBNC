from typing import List, Optional
from app.models.question import Question
from app.models.enums import QuestionStatus, WarningType, WarningSeverity
from app.models.question_warning import QuestionWarning


class ConfidenceEngine:
    OCR_WEIGHT: float = 0.20
    BOUNDARY_WEIGHT: float = 0.20
    OPTION_WEIGHT: float = 0.20
    EXTRACTION_VALIDITY_WEIGHT: float = 0.20
    ANSWER_MATCH_WEIGHT: float = 0.20

    THRESHOLD_EXTRACTED: float = 0.85
    THRESHOLD_PARTIAL: float = 0.60

    @classmethod
    def score_question(
        cls,
        question: Question,
        ocr_confidence: float = 1.0,
        boundary_confidence: float = 1.0,
        has_answer: bool = False,
        answer_confidence: float = 1.0
    ) -> float:
        # 1. OCR score
        s_ocr = max(0.0, min(1.0, ocr_confidence))

        # 2. Boundary score
        s_boundary = max(0.0, min(1.0, boundary_confidence))

        # 3. Option completeness score
        options = question.options or []
        if len(options) in (4, 5):
            s_opt = 1.0
        elif len(options) == 2:
            s_opt = 0.90
        elif len(options) == 0 and question.question_type.value == "DESCRIPTIVE":
            s_opt = 0.85
        elif len(options) == 0:
            s_opt = 0.50
        else:
            s_opt = 0.70

        # 4. Extraction validity score
        s_valid = 1.0 if question.question_text and len(question.question_text) > 10 else 0.4

        # 5. Answer matching score
        s_ans = answer_confidence if has_answer else 0.80

        total_confidence = (
            cls.OCR_WEIGHT * s_ocr
            + cls.BOUNDARY_WEIGHT * s_boundary
            + cls.OPTION_WEIGHT * s_opt
            + cls.EXTRACTION_VALIDITY_WEIGHT * s_valid
            + cls.ANSWER_MATCH_WEIGHT * s_ans
        )

        return round(max(0.0, min(1.0, total_confidence)), 2)

    @classmethod
    def generate_warnings(cls, question: Question) -> List[QuestionWarning]:
        warnings: List[QuestionWarning] = []

        if not question.question_number:
            warnings.append(
                QuestionWarning(
                    question_id=question.id,
                    warning_type=WarningType.MISSING_QUESTION_NUMBER,
                    message="Question has no detected number",
                    severity=WarningSeverity.MEDIUM,
                    source_page=question.source_pages[0] if question.source_pages else None
                )
            )

        if question.confidence < cls.THRESHOLD_PARTIAL:
            warnings.append(
                QuestionWarning(
                    question_id=question.id,
                    warning_type=WarningType.LOW_CONFIDENCE,
                    message=f"Low extraction confidence score ({question.confidence:.2f})",
                    severity=WarningSeverity.HIGH,
                    source_page=question.source_pages[0] if question.source_pages else None
                )
            )

        if question.source_pages and len(question.source_pages) > 1:
            warnings.append(
                QuestionWarning(
                    question_id=question.id,
                    warning_type=WarningType.CROSS_PAGE_QUESTION,
                    message=f"Question spans across pages: {question.source_pages}",
                    severity=WarningSeverity.LOW,
                    source_page=question.source_pages[0]
                )
            )

        if question.question_type.value == "MCQ" and (not question.options or len(question.options) < 3):
            warnings.append(
                QuestionWarning(
                    question_id=question.id,
                    warning_type=WarningType.MISSING_OPTION,
                    message="Multiple-choice question has fewer than 3 options",
                    severity=WarningSeverity.MEDIUM,
                    source_page=question.source_pages[0] if question.source_pages else None
                )
            )

        return warnings
