import pytest
from app.processors.question_segmenter import QuestionSegmenter


def test_standard_mcq_segmentation():
    text = """
    1. What is the powerhouse of the cell?
    (A) Ribosome
    (B) Mitochondria
    (C) Nucleus
    (D) Golgi body

    2. Which planet is closest to the Sun?
    A. Venus
    B. Mercury
    C. Earth
    D. Mars
    """
    segments = QuestionSegmenter.segment([(1, text)])
    assert len(segments) == 2

    # Question 1
    assert segments[0].detected_number == "1"
    assert "powerhouse of the cell" in segments[0].text
    assert len(segments[0].options) == 4
    assert segments[0].options[0].label == "A"
    assert segments[0].options[0].text == "Ribosome"
    assert segments[0].options[1].label == "B"
    assert segments[0].options[1].text == "Mitochondria"

    # Question 2
    assert segments[1].detected_number == "2"
    assert "closest to the Sun" in segments[1].text
    assert len(segments[1].options) == 4
    assert segments[1].options[1].label == "B"
    assert segments[1].options[1].text == "Mercury"


def test_various_numbering_formats():
    text = """
    Q1. First Question text
    A. Opt 1
    B. Opt 2

    Q.2: Second Question text
    1) Opt 1
    2) Opt 2

    (3) Third Question without options
    """
    segments = QuestionSegmenter.segment([(1, text)])
    assert len(segments) == 3
    assert segments[0].detected_number == "1"
    assert segments[1].detected_number == "2"
    assert segments[2].detected_number == "3"
    assert len(segments[2].options) == 0


def test_cross_page_question_segmentation():
    page_1 = """
    1. A lengthy problem statement that begins on the first page
    and introduces complex background details.
    (A) Option Alpha
    """
    page_2 = """
    (B) Option Beta
    (C) Option Gamma
    (D) Option Delta

    2. Normal question on page 2.
    """
    segments = QuestionSegmenter.segment([(1, page_1), (2, page_2)])
    assert len(segments) == 2

    # Question 1 spans across page 1 and page 2
    q1 = segments[0]
    assert q1.detected_number == "1"
    assert q1.start_page == 1
    assert q1.end_page == 2
    assert len(q1.options) == 4
    assert q1.options[0].label == "A"
    assert q1.options[3].label == "D"

    # Question 2 is on page 2
    q2 = segments[1]
    assert q2.detected_number == "2"
    assert q2.start_page == 2
    assert q2.end_page == 2
