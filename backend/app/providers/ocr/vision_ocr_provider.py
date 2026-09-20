import base64
import httpx
from typing import Optional
from app.core.config import settings
from app.core.logging import logger
from app.providers.ocr.base import OCRProvider, OCRResult


class VisionLLMOCRProvider(OCRProvider):
    """
    Vision-based OCR provider using Groq or OpenRouter vision models.
    Transcribes images, terminal outputs, and complex scanned documents with high accuracy.
    """
    def __init__(self):
        self.groq_key = settings.GROQ_API_KEY
        self.openrouter_key = settings.OPENROUTER_API_KEY
        # Groq's high-speed vision model
        self.groq_vision_model = "llama-3.2-11b-vision-preview"

    def extract_text(self, image_bytes: bytes) -> OCRResult:
        base64_image = base64.b64encode(image_bytes).decode("utf-8")
        prompt = (
            "Extract and transcribe all readable text, terminal commands, logs, questions, options, "
            "and output verbatim from this image. Preserve exact lines and formatting. "
            "Return only the extracted text without introductory commentary."
        )

        # 1. Try OpenRouter Vision with active working models
        if self.openrouter_key:
            vision_models = [
                "inclusionai/ling-3.0-flash-vl:free",
                "nex-agi/nex-n2.5-mini:free",
                "qwen/qwen3.8-27b:free",
                "google/gemini-2.0-flash-exp:free",
                "meta-llama/llama-3.2-11b-vision-instruct:free"
            ]
            for model_id in vision_models:
                try:
                    logger.info(f"Extracting image text with OpenRouter Vision ({model_id})...")
                    headers = {
                        "Authorization": f"Bearer {self.openrouter_key}",
                        "Content-Type": "application/json",
                        "HTTP-Referer": "https://pbnc.ai",
                        "X-Title": "Document Intelligence OCR"
                    }
                    payload = {
                        "model": model_id,
                        "messages": [
                            {
                                "role": "user",
                                "content": [
                                    {"type": "text", "text": prompt},
                                    {
                                        "type": "image_url",
                                        "image_url": {"url": f"data:image/png;base64,{base64_image}"}
                                    }
                                ]
                            }
                        ],
                        "temperature": 0.1,
                        "max_tokens": 2048
                    }
                    with httpx.Client(timeout=45.0) as client:
                        res = client.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
                        if res.status_code == 200:
                            data = res.json()
                            choices = data.get("choices", [])
                            if choices:
                                msg = choices[0].get("message", {})
                                raw_c = msg.get("content") or msg.get("reasoning") or ""
                                if isinstance(raw_c, list):
                                    text = " ".join(item.get("text", "") for item in raw_c if isinstance(item, dict)).strip()
                                else:
                                    text = str(raw_c).strip()

                                if text:
                                    return OCRResult(
                                        raw_text=text,
                                        confidence=0.95,
                                        metadata={"engine": "openrouter_vision", "model": model_id},
                                        is_low_quality=len(text) < 5
                                    )
                except Exception as e:
                    logger.warning(f"OpenRouter Vision ({model_id}) failed: {e}")

        return OCRResult(
            raw_text="",
            confidence=0.0,
            metadata={"engine": "vision_ocr", "error": "No vision API succeeded"},
            is_low_quality=True
        )
