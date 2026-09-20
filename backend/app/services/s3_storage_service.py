import boto3
from botocore.exceptions import ClientError
from typing import BinaryIO
from app.core.config import settings
from app.core.logging import logger
from app.services.storage_service import StorageService
from app.services.local_storage_service import LocalStorageService


class S3StorageService(StorageService):
    def __init__(self):
        self.bucket_name = settings.S3_BUCKET or "uploads"
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.AWS_ENDPOINT_URL_S3,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_REGION
        )

    def upload(self, file_obj: BinaryIO, destination_path: str, content_type: str = "application/octet-stream") -> str:
        file_obj.seek(0)
        clean_key = destination_path.lstrip("/\\").replace("\\", "/")
        self.client.upload_fileobj(
            file_obj,
            self.bucket_name,
            clean_key,
            ExtraArgs={"ContentType": content_type}
        )
        return clean_key

    def download(self, storage_path: str) -> bytes:
        clean_key = storage_path.lstrip("/\\").replace("\\", "/")
        response = self.client.get_object(Bucket=self.bucket_name, Key=clean_key)
        return response["Body"].read()

    def delete(self, storage_path: str) -> bool:
        clean_key = storage_path.lstrip("/\\").replace("\\", "/")
        try:
            self.client.delete_object(Bucket=self.bucket_name, Key=clean_key)
            return True
        except ClientError as e:
            logger.error(f"S3 deletion failed: {e}")
            return False

    def exists(self, storage_path: str) -> bool:
        clean_key = storage_path.lstrip("/\\").replace("\\", "/")
        try:
            self.client.head_object(Bucket=self.bucket_name, Key=clean_key)
            return True
        except ClientError:
            return False


def get_storage_service() -> StorageService:
    if settings.AWS_ENDPOINT_URL_S3 and settings.AWS_ACCESS_KEY_ID:
        return S3StorageService()
    return LocalStorageService()
