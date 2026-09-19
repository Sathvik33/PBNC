import cv2
import numpy as np


class ImagePreprocessor:
    @staticmethod
    def to_grayscale(image: np.ndarray) -> np.ndarray:
        if len(image.shape) == 2:
            return image
        return cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)

    @staticmethod
    def denoise(gray_image: np.ndarray) -> np.ndarray:
        return cv2.fastNlMeansDenoising(gray_image, None, h=10, templateWindowSize=7, searchWindowSize=21)

    @staticmethod
    def threshold(gray_image: np.ndarray) -> np.ndarray:
        return cv2.adaptiveThreshold(
            gray_image, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2
        )

    @staticmethod
    def deskew(gray_image: np.ndarray) -> np.ndarray:
        coords = np.column_stack(np.where(gray_image < 255))
        if len(coords) < 100:
            return gray_image

        angle = cv2.minAreaRect(coords)[-1]
        if angle < -45:
            angle = -(90 + angle)
        else:
            angle = -angle

        if abs(angle) < 0.5 or abs(angle) > 45:
            return gray_image

        (h, w) = gray_image.shape[:2]
        center = (w // 2, h // 2)
        matrix = cv2.getRotationMatrix2D(center, angle, 1.0)
        rotated = cv2.warpAffine(
            gray_image, matrix, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE
        )
        return rotated

    @classmethod
    def preprocess(cls, image_bytes: bytes) -> bytes:
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            return image_bytes

        gray = cls.to_grayscale(img)
        denoised = cls.denoise(gray)
        deskewed = cls.deskew(denoised)

        success, encoded = cv2.imencode(".png", deskewed)
        return encoded.tobytes() if success else image_bytes
