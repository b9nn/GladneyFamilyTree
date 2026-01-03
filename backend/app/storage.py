"""
Cloud storage utility for handling file uploads to S3-compatible storage (Cloudflare R2, AWS S3, etc.)
Falls back to local filesystem if cloud storage is not configured.
"""

import os
import boto3
from botocore.exceptions import ClientError
from botocore.client import Config
from typing import Optional, BinaryIO
from pathlib import Path


def get_storage_config():
    """Get storage configuration from environment variables"""
    return {
        'use_cloud': os.getenv('USE_CLOUD_STORAGE', 'false').lower() == 'true',
        'endpoint_url': os.getenv('S3_ENDPOINT_URL'),  # e.g., https://<account-id>.r2.cloudflarestorage.com
        'access_key': os.getenv('S3_ACCESS_KEY_ID'),
        'secret_key': os.getenv('S3_SECRET_ACCESS_KEY'),
        'bucket_name': os.getenv('S3_BUCKET_NAME'),
        'public_url': os.getenv('S3_PUBLIC_URL'),  # e.g., https://files.yourdomain.com
    }


def is_cloud_storage_configured():
    """Check if cloud storage is properly configured"""
    config = get_storage_config()
    if not config['use_cloud']:
        return False
    return all([
        config['endpoint_url'],
        config['access_key'],
        config['secret_key'],
        config['bucket_name']
    ])


def get_s3_client():
    """Get configured S3 client"""
    config = get_storage_config()

    return boto3.client(
        's3',
        endpoint_url=config['endpoint_url'],
        aws_access_key_id=config['access_key'],
        aws_secret_access_key=config['secret_key'],
        config=Config(signature_version='s3v4'),
        region_name='auto'  # R2 uses 'auto'
    )


def upload_file(
    file_data: BinaryIO,
    filename: str,
    folder: str = "uploads",
    content_type: Optional[str] = None
) -> str:
    """
    Upload a file to cloud storage or local filesystem.

    Args:
        file_data: File-like object to upload
        filename: Name of the file
        folder: Folder/prefix to organize files
        content_type: MIME type of the file

    Returns:
        URL or path to access the uploaded file
    """

    if is_cloud_storage_configured():
        return _upload_to_cloud(file_data, filename, folder, content_type)
    else:
        return _upload_to_local(file_data, filename, folder)


def _upload_to_cloud(
    file_data: BinaryIO,
    filename: str,
    folder: str,
    content_type: Optional[str]
) -> str:
    """Upload file to cloud storage (S3/R2)"""
    config = get_storage_config()
    s3_client = get_s3_client()

    # Create S3 key (path in bucket)
    s3_key = f"{folder}/{filename}"

    # Prepare upload args
    upload_args = {
        'Bucket': config['bucket_name'],
        'Key': s3_key,
        'Body': file_data,
    }

    if content_type:
        upload_args['ContentType'] = content_type

    try:
        # Upload to S3/R2
        s3_client.put_object(**upload_args)

        # Return public URL
        if config['public_url']:
            return f"{config['public_url']}/{s3_key}"
        else:
            # Generate presigned URL (temporary)
            return s3_client.generate_presigned_url(
                'get_object',
                Params={'Bucket': config['bucket_name'], 'Key': s3_key},
                ExpiresIn=31536000  # 1 year
            )
    except ClientError as e:
        print(f"[STORAGE] Failed to upload to cloud: {e}")
        raise Exception(f"Failed to upload file: {str(e)}")


def _upload_to_local(file_data: BinaryIO, filename: str, folder: str) -> str:
    """Upload file to local filesystem (fallback)"""
    upload_dir = Path("uploads") / folder
    upload_dir.mkdir(parents=True, exist_ok=True)

    file_path = upload_dir / filename

    with open(file_path, "wb") as f:
        if hasattr(file_data, 'read'):
            f.write(file_data.read())
        else:
            f.write(file_data)

    return str(file_path)


def delete_file(file_path_or_url: str) -> bool:
    """
    Delete a file from cloud storage or local filesystem.

    Args:
        file_path_or_url: Path or URL of the file to delete

    Returns:
        True if deleted successfully, False otherwise
    """

    if is_cloud_storage_configured() and file_path_or_url.startswith('http'):
        return _delete_from_cloud(file_path_or_url)
    else:
        return _delete_from_local(file_path_or_url)


def _delete_from_cloud(file_url: str) -> bool:
    """Delete file from cloud storage"""
    config = get_storage_config()
    s3_client = get_s3_client()

    # Extract S3 key from URL
    if config['public_url'] and file_url.startswith(config['public_url']):
        s3_key = file_url.replace(f"{config['public_url']}/", "")
    else:
        # Try to extract from presigned URL
        s3_key = file_url.split('/')[-2] + '/' + file_url.split('/')[-1].split('?')[0]

    try:
        s3_client.delete_object(Bucket=config['bucket_name'], Key=s3_key)
        return True
    except ClientError as e:
        print(f"[STORAGE] Failed to delete from cloud: {e}")
        return False


def _delete_from_local(file_path: str) -> bool:
    """Delete file from local filesystem"""
    try:
        if os.path.exists(file_path):
            os.remove(file_path)
            return True
        return False
    except Exception as e:
        print(f"[STORAGE] Failed to delete from local: {e}")
        return False


def get_file_url(file_path_or_url: str) -> str:
    """
    Get the public URL for a file.
    For cloud storage, returns the URL directly.
    For local storage, returns the path (to be served by FastAPI).
    """
    return file_path_or_url
