import re
from typing import List, Optional
from pydantic import BaseModel


class ExtractedAnswerEntry(BaseModel):
    question_number: str
    answer: str
    confidence: float = 1.0
    source_page: Optional[int] = None
    raw_text: Optional[str] = None


class AnswerKeyExtractor:
    SECTION_HEADERS = [
        re.compile(r"^\s*(?:ANSWER\s*KEY|ANSWERS|SOLUTIONS|CORRECT\s*ANSWERS)\s*[:.-]*$", re.IGNORECASE),
    ]

    ENTRY_PATTERNS = [
        # 1-A or 1 - A or 1: A or 1. A or 1) A or Q1 - B or Q.1: B
        re.compile(r"(?:Q(?:uestion)?[\s\.]*)?(\d+)[\s.:\)-]+([A-Da-d]|True|False)\b", re.IGNORECASE)
    ]

    @classmethod
    def is_answer_key_section(cls, text: str) -> bool:
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        for line in lines:
            if any(p.match(line) for p in cls.SECTION_HEADERS):
                return True
        return False

    @classmethod
    def extract_entries(cls, text: str, page_number: Optional[int] = None) -> List[ExtractedAnswerEntry]:
        entries: List[ExtractedAnswerEntry] = []
        lines = text.split("\n")

        # If an explicit ANSWER KEY header exists, only process lines after that header
        in_section = True
        for i, line in enumerate(lines):
            if any(p.match(line.strip()) for p in cls.SECTION_HEADERS):
                lines = lines[i + 1:]
                in_section = True
                break

        if not in_section:
            return entries

        for line in lines:
            line_str = line.strip()
            for pattern in cls.ENTRY_PATTERNS:
                matches = pattern.findall(line_str)
                for q_num, ans in matches:
                    clean_ans = ans.strip().upper()
                    entries.append(
                        ExtractedAnswerEntry(
                            question_number=q_num.strip(),
                            answer=clean_ans,
                            confidence=0.98 if clean_ans in ["A", "B", "C", "D", "TRUE", "FALSE"] else 0.85,
                            source_page=page_number,
                            raw_text=line_str
                        )
                    )
        return entries
