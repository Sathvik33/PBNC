import re
from typing import List, Optional


class TextNormalizer:
    PAGE_HEADER_FOOTER_PATTERNS = [
        re.compile(r"^\s*Page\s+\d+(\s+of\s+\d+)?\s*$", re.IGNORECASE),
        re.compile(r"^\s*\d+\s*/\s*\d+\s*$"),
        re.compile(r"^\s*-\s*\d+\s*-\s*$"),
        re.compile(r"^\s*Question\s+Paper\s*$", re.IGNORECASE),
    ]

    COMMON_OCR_REPLACEMENTS = {
        "“": '"',
        "”": '"',
        "‘": "'",
        "’": "'",
        "—": "-",
        "–": "-",
        "\t": " ",
    }

    @classmethod
    def clean_ocr_characters(cls, text: str) -> str:
        for old, new in cls.COMMON_OCR_REPLACEMENTS.items():
            text = text.replace(old, new)
        return text

    @classmethod
    def remove_headers_and_footers(cls, text: str) -> str:
        lines = text.split("\n")
        filtered_lines = []
        for line in lines:
            stripped = line.strip()
            if any(pattern.match(stripped) for pattern in cls.PAGE_HEADER_FOOTER_PATTERNS):
                continue
            filtered_lines.append(line)
        return "\n".join(filtered_lines)

    @classmethod
    def fix_broken_line_endings(cls, text: str) -> str:
        # Rejoin hyphenated words split across lines: e.g. "com-\nputer" -> "computer"
        text = re.sub(r"(\w+)-\s*\n\s*(\w+)", r"\1\2", text)
        return text

    @classmethod
    def normalize_options(cls, text: str) -> str:
        # Standardize option prefixes to be on new lines if merged:
        # e.g. "Some text (A) Option 1 (B) Option 2"
        text = re.sub(r"\s+([A-D]\.|\([A-Da-d]\))\s+", r"\n\1 ", text)
        return text

    @classmethod
    def normalize_whitespace(cls, text: str) -> str:
        # Collapse multiple empty lines to max two
        text = re.sub(r"\n{3,}", "\n\n", text)
        # Collapse multiple spaces on a single line
        lines = [re.sub(r"[ ]{2,}", " ", line).strip() for line in text.split("\n")]
        return "\n".join(lines).strip()

    @classmethod
    def normalize(cls, raw_text: Optional[str]) -> str:
        if not raw_text:
            return ""

        text = cls.clean_ocr_characters(raw_text)
        text = cls.fix_broken_line_endings(text)
        text = cls.remove_headers_and_footers(text)
        text = cls.normalize_options(text)
        text = cls.normalize_whitespace(text)
        return text
