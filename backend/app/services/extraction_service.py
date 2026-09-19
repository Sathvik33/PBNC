import json
import re
from typing import List, Optional
from pydantic import BaseModel, Field
from app.models.enums import QuestionType
from app.providers.llm.factory import get_llm_provider
from app.providers.llm.base import LLMProvider
from app.schemas.segmentation import QuestionSegment, QuestionOption
from app.core.logging import logger


class StructuredOption(BaseModel):
    label: str
    text: str


class StructuredQuestion(BaseModel):
    question_number: Optional[str] = None
    question_text: str
    question_type: QuestionType = QuestionType.UNKNOWN
    options: List[StructuredOption] = []
    answer: Optional[str] = None
    confidence: float = Field(default=0.9, ge=0.0, le=1.0)


class StructuredExtractionResult(BaseModel):
    questions: List[StructuredQuestion]


class QuestionExtractionService:
    def __init__(self, llm_provider: Optional[LLMProvider] = None):
        self.llm_provider = llm_provider or get_llm_provider()

    def extract_with_llm(self, text: str) -> List[StructuredQuestion]:
        system_prompt = (
            "You are an expert document and examination intelligence parser. "
            "Extract all questions, exercises, terminal tasks, prompts, or activity items into valid JSON strictly matching the schema:\n"
            "{\n"
            '  "questions": [\n'
            '    {\n'
            '      "question_number": "1",\n'
            '      "question_text": "description of question, command, task, or activity",\n'
            '      "question_type": "MCQ" | "MULTIPLE_SELECT" | "TRUE_FALSE" | "FILL_BLANK" | "DESCRIPTIVE" | "SHORT_ANSWER" | "UNKNOWN",\n'
            '      "options": [{"label": "A", "text": "option text"}],\n'
            '      "answer": "A" or null,\n'
            '      "confidence": 0.95\n'
            "    }\n"
            "  ]\n"
            "}\n"
            "If the document contains terminal commands, output logs, or non-MCQ activities, extract each logical command, step, or activity item as a DESCRIPTIVE or SHORT_ANSWER question with options as empty array [].\n"
            "Return ONLY the valid JSON object. Do not include markdown codeblocks or conversational text."
        )

        user_prompt = f"Extract all questions, tasks, commands, and exercises from the following text:\n\n{text}"

        for attempt in range(2):
            try:
                res = self.llm_provider.generate(user_prompt, system_prompt=system_prompt, json_mode=True)
                content = res.content.strip()

                # Clean markdown backticks if model wrapped JSON
                if content.startswith("```"):
                    content = re.sub(r"^```(?:json)?\s*", "", content)
                    content = re.sub(r"\s*```$", "", content)

                parsed = json.loads(content)
                validated = StructuredExtractionResult.model_validate(parsed)
                return validated.questions
            except Exception as e:
                logger.warning(f"LLM extraction attempt {attempt + 1} failed: {e}")
                user_prompt = f"Previous response was invalid. Ensure strictly valid JSON matching schema.\n\nText:\n{text}"

        return []

    def classify_question_type(self, text: str, options: List[QuestionOption]) -> QuestionType:
        # Rule-based classification first
        opt_count = len(options)
        if opt_count in (4, 5):
            return QuestionType.MCQ
        elif opt_count == 2:
            labels_or_texts = " ".join(o.text.lower() for o in options)
            if "true" in labels_or_texts and "false" in labels_or_texts:
                return QuestionType.TRUE_FALSE
            return QuestionType.MCQ
        elif opt_count == 0:
            if "____" in text or "fill in the blank" in text.lower():
                return QuestionType.FILL_BLANK
            if len(text.split()) > 8:
                return QuestionType.DESCRIPTIVE

        return QuestionType.UNKNOWN
