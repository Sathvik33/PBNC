import re
from typing import List, Tuple, Optional
from app.schemas.segmentation import QuestionSegment, QuestionOption


class QuestionSegmenter:
    # Matches patterns like:
    # 1. , 1) , (1) , Q1. , Q.1 , Question 1 , Q1: , Question 1:
    QUESTION_START_PATTERN = re.compile(
        r"^(?:(?:Q(?:uestion)?[\s\.]*(\d+)|(\d+)[\.\)]|\((\d+)\))[\s:.-]*)(.*)$",
        re.IGNORECASE
    )

    # Matches option markers:
    # (A), (B), (a), (b), A., B., 1), 2), 3), 4), i., ii., iii., iv.
    OPTION_PATTERN = re.compile(
        r"^(?:\(([A-Da-d])\)|([A-Da-d])[\.\)]|([1-4])\)|(i|ii|iii|iv|v)[\.\)])\s+(.*)$"
    )

    @classmethod
    def _extract_options(cls, lines: List[str]) -> Tuple[str, List[QuestionOption]]:
        stem_lines = []
        options: List[QuestionOption] = []
        current_option_label = None
        current_option_text = []

        for line in lines:
            opt_match = cls.OPTION_PATTERN.match(line.strip())
            if opt_match:
                if current_option_label:
                    options.append(
                        QuestionOption(
                            label=current_option_label,
                            text=" ".join(current_option_text).strip()
                        )
                    )
                    current_option_text = []

                # Find which group matched the label
                label = opt_match.group(1) or opt_match.group(2) or opt_match.group(3) or opt_match.group(4)
                current_option_label = label.upper()
                current_option_text.append(opt_match.group(5).strip())
            else:
                if current_option_label:
                    current_option_text.append(line.strip())
                else:
                    stem_lines.append(line.strip())

        if current_option_label:
            options.append(
                QuestionOption(
                    label=current_option_label,
                    text=" ".join(current_option_text).strip()
                )
            )

        stem = " ".join(filter(None, stem_lines)).strip()
        return stem, options

    @classmethod
    def segment(cls, page_texts: List[Tuple[int, str]]) -> List[QuestionSegment]:
        segments: List[QuestionSegment] = []
        current_q_num: Optional[str] = None
        current_lines: List[str] = []
        current_start_page: int = 1
        current_end_page: int = 1

        def commit_current():
            nonlocal current_q_num, current_lines, current_start_page, current_end_page
            if not current_lines:
                return

            stem, options = cls._extract_options(current_lines)
            if stem or options:
                confidence = 0.95 if current_q_num else 0.60
                segments.append(
                    QuestionSegment(
                        detected_number=current_q_num,
                        text=stem,
                        options=options,
                        start_page=current_start_page,
                        end_page=current_end_page,
                        confidence=confidence
                    )
                )
            current_q_num = None
            current_lines = []

        ANSWER_KEY_HEADERS = [
            re.compile(r"^\s*(?:---\s*)?(?:ANSWER\s*KEY|ANSWERS|SOLUTIONS|CORRECT\s*ANSWERS)\s*[:.-]*$", re.IGNORECASE)
        ]

        SECTION_HEADER_PATTERN = re.compile(
            r"^\s*(?:SECTION\s+[A-Z0-9]+|PART\s+[A-Z0-9]+)\s*[:.-]?.*$",
            re.IGNORECASE
        )

        for page_num, text in page_texts:
            if not text:
                continue

            lines = [l.strip() for l in text.split("\n") if l.strip()]
            in_answer_key = False

            for line in lines:
                # 1. Stop segmenting questions once the Answer Key section is reached
                if any(p.match(line) for p in ANSWER_KEY_HEADERS):
                    commit_current()
                    in_answer_key = True
                    break

                if in_answer_key:
                    break

                # 2. Skip structural examination section markers like "SECTION A: ..."
                if SECTION_HEADER_PATTERN.match(line):
                    commit_current()
                    continue

                # 3. If inside an active question, check for option lines
                is_option = False
                if current_q_num:
                    opt_match = cls.OPTION_PATTERN.match(line)
                    if opt_match:
                        is_option = True

                if is_option:
                    current_lines.append(line)
                    current_end_page = page_num
                    continue

                # 4. Check for question start
                match = cls.QUESTION_START_PATTERN.match(line)
                if match:
                    commit_current()
                    current_q_num = match.group(1) or match.group(2) or match.group(3)
                    remainder = match.group(4).strip()
                    current_start_page = page_num
                    current_end_page = page_num
                    if remainder:
                        current_lines.append(remainder)
                else:
                    # Only collect subsequent lines if an active question has already started
                    if current_q_num:
                        current_lines.append(line)
                        current_end_page = page_num

        commit_current()
        return segments
