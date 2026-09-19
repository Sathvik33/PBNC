from abc import ABC, abstractmethod
from typing import BinaryIO, Optional


class StorageService(ABC):
    @abstractmethod
    def upload(self, file_obj: BinaryIO, destination_path: str, content_type: str) -> str:
        pass

    @abstractmethod
    def download(self, storage_path: str) -> bytes:
        pass

    @abstractmethod
    def delete(self, storage_path: str) -> bool:
        pass

    @abstractmethod
    def exists(self, storage_path: str) -> bool:
        pass
