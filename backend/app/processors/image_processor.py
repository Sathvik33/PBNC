from typing import Tuple
from app.processors.image_preprocessor import ImagePreprocessor


class ImageProcessor:
    def __init__(self, preprocessor: ImagePreprocessor = None):
        self.preprocessor = preprocessor or ImagePreprocessor()

    def process(self, image_bytes: bytes) -> Tuple[bytes, dict]:
        preprocessed_bytes = self.preprocessor.preprocess(image_bytes)
        metadata = {
            "original_size": len(image_bytes),
            "processed_size": len(preprocessed_bytes),
            "is_preprocessed": True
        }
        return preprocessed_bytes, metadata
