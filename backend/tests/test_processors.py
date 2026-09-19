import io
import fitz
import numpy as np
import cv2
import pytest
from app.processors.image_preprocessor import ImagePreprocessor
from app.processors.image_processor import ImageProcessor
from app.processors.pdf_processor import PDFProcessor


def test_image_preprocessor():
    # Create synthetic test image (white canvas with dark rectangle)
    img = np.full((100, 100, 3), 255, dtype=np.uint8)
    cv2.putText(img, "Q1.", (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 0), 2)
    _, encoded = cv2.imencode(".png", img)
    raw_bytes = encoded.tobytes()

    preprocessed = ImagePreprocessor.preprocess(raw_bytes)
    assert isinstance(preprocessed, bytes)
    assert len(preprocessed) > 0


def test_image_processor():
    img = np.full((50, 50, 3), 240, dtype=np.uint8)
    _, encoded = cv2.imencode(".png", img)
    raw_bytes = encoded.tobytes()

    processor = ImageProcessor()
    processed_bytes, metadata = processor.process(raw_bytes)
    assert metadata["is_preprocessed"] is True
    assert len(processed_bytes) > 0


def test_pdf_processor_digital_and_scanned():
    # 1. Create a digital PDF with text
    doc = fitz.open()
    page1 = doc.new_page()
    page1.insert_text((50, 72), "1. What is the speed of light in vacuum?\nA. 3x10^8 m/s\nB. 3x10^6 m/s\n")
    page2 = doc.new_page()
    # Empty page to simulate scanned/image page
    pdf_bytes = doc.tobytes()
    doc.close()

    processor = PDFProcessor()
    result = processor.process(pdf_bytes)

    assert result["page_count"] == 2
    pages = result["pages"]
    assert len(pages) == 2

    # Digital page verification
    assert pages[0].page_number == 1
    assert "speed of light" in pages[0].text
    assert pages[0].is_scanned is False

    # Scanned/empty page verification
    assert pages[1].page_number == 2
    assert pages[1].is_scanned is True
    assert len(pages[1].image_bytes) > 0
