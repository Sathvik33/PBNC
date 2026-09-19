import os
import shutil
from typing import BinaryIO
from app.core.config import settings
from app.services.storage_service import StorageService


class LocalStorageService(StorageService):
    def __init__(self, base_dir: str = settings.STORAGE_PATH):
        self.base_dir = os.path.abspath(base_dir)
        os.makedirs(self.base_dir, exist_ok=True)

    def _resolve_path(self, path: str) -> str:
        clean = os.path.normpath(path).lstrip("/\\")
        full_path = os.path.abspath(os.path.join(self.base_dir, clean))
        if not full_path.startswith(self.base_dir):
            raise ValueError("Directory traversal attempt detected")
        return full_path

    def upload(self, file_obj: BinaryIO, destination_path: str, content_type: str = "application/octet-stream") -> str:
        target = self._resolve_path(destination_path)
        os.makedirs(os.path.dirname(target), exist_ok=True)
        file_obj.seek(0)
        with open(target, "wb") as f:
            shutil.copyfileobj(file_obj, f)
        return destination_path

    def download(self, storage_path: str) -> bytes:
        target = self._resolve_path(storage_path)
        with open(target, "rb") as f:
            return f.read()

    def delete(self, storage_path: str) -> bool:
        target = self._resolve_path(storage_path)
        if os.path.exists(target):
            os.remove(target)
            return True
        return False

    def exists(self, storage_path: str) -> bool:
        target = self._resolve_path(storage_path)
        return os.path.exists(target)
