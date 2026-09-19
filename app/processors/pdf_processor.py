import fitz
from typing import List, Dict, Any
from app.processors.image_preprocessor import ImagePreprocessor


class PDFPageResult:
    def __init__(self, page_number: int, text: str, is_scanned: bool, image_bytes: bytes = None):
        self.page_number = page_number
        self.text = text
        self.is_scanned = is_scanned
        self.image_bytes = image_bytes


class PDFProcessor:
    def __init__(self, preprocessor: ImagePreprocessor = None):
        self.preprocessor = preprocessor or ImagePreprocessor()

    def process(self, pdf_bytes: bytes) -> Dict[str, Any]:
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        page_count = len(doc)
        pages: List[PDFPageResult] = []

        for index in range(page_count):
            page = doc.load_page(index)
            text = page.get_text("text").strip()

            # Render page to image (scale 2.0 for ~150-200 DPI clarity)
            pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
            raw_img_bytes = pix.tobytes("png")

            # If extracted text is very sparse or empty, mark for OCR scan
            is_scanned = len(text) < 30

            if is_scanned:
                processed_img = self.preprocessor.preprocess(raw_img_bytes)
            else:
                processed_img = raw_img_bytes

            pages.append(
                PDFPageResult(
                    page_number=index + 1,
                    text=text,
                    is_scanned=is_scanned,
                    image_bytes=processed_img
                )
            )

        doc.close()
        return {
            "page_count": page_count,
            "pages": pages
        }
