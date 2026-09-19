import pytest
from app.processors.text_processor import TextNormalizer


def test_clean_ocr_characters():
    raw = "“Hello world” — said the teacher."
    clean = TextNormalizer.clean_ocr_characters(raw)
    assert clean == '"Hello world" - said the teacher.'


def test_remove_headers_and_footers():
    raw = "Page 1 of 12\n1. What is Python?\n- 1 -\nQuestion Paper"
    cleaned = TextNormalizer.remove_headers_and_footers(raw)
    assert "Page 1 of 12" not in cleaned
    assert "- 1 -" not in cleaned
    assert "Question Paper" not in cleaned
    assert "1. What is Python?" in cleaned


def test_fix_broken_line_endings():
    raw = "This is a com-\nputer algorithm."
    fixed = TextNormalizer.fix_broken_line_endings(raw)
    assert "computer" in fixed
    assert "com-\nputer" not in fixed


def test_normalize_options():
    raw = "1. Question text (A) Option One (B) Option Two"
    normalized = TextNormalizer.normalize_options(raw)
    assert "\n(A) Option One" in normalized
    assert "\n(B) Option Two" in normalized


def test_full_normalize_pipeline():
    raw = """
    Page 2 of 5
    1. The funda-
    mental unit of life is:
    (A) Cell (B) Tissue (C) Organ
    
    
    
    - 2 -
    """
    normalized = TextNormalizer.normalize(raw)
    assert "Page 2 of 5" not in normalized
    assert "- 2 -" not in normalized
    assert "fundamental unit" in normalized
    assert "\n(A) Cell" in normalized
    assert "\n(B) Tissue" in normalized
    assert "\n\n\n" not in normalized
