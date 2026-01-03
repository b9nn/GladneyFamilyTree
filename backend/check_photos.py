"""
Diagnostic script to check photos in the database.

Usage:
    python check_photos.py

This will:
1. Count total photos in the database
2. List all photos with their details
3. Check for orphaned photos (uploaded_by user doesn't exist)
4. Check if photo files exist on disk
"""

import sys
import os
from pathlib import Path

# Add the backend directory to the path
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

from sqlalchemy.orm import Session
from app.database import SessionLocal
from app import models

def main():
    print("=" * 60)
    print("PHOTO DATABASE DIAGNOSTIC")
    print("=" * 60)
    print()

    db: Session = SessionLocal()

    try:
        # Count total photos
        total_photos = db.query(models.Photo).count()
        print(f"Total photos in database: {total_photos}")
        print()

        if total_photos == 0:
            print("⚠️  No photos found in database!")
            print()
            return

        # List all photos
        photos = db.query(models.Photo).order_by(models.Photo.created_at.desc()).all()

        print("Photos in database:")
        print("-" * 60)

        orphaned_count = 0
        missing_files = 0

        for i, photo in enumerate(photos, 1):
            print(f"\n{i}. ID: {photo.id}")
            print(f"   Title: {photo.title}")
            print(f"   Filename: {photo.filename}")
            print(f"   File Path: {photo.file_path}")
            print(f"   Uploaded By ID: {photo.uploaded_by_id}")
            print(f"   Created At: {photo.created_at}")
            print(f"   Sort Order: {photo.sort_order}")

            # Check if user exists
            user = db.query(models.User).filter(models.User.id == photo.uploaded_by_id).first()
            if not user:
                print(f"   ⚠️  WARNING: Uploaded by user ID {photo.uploaded_by_id} does not exist!")
                orphaned_count += 1
            else:
                print(f"   Uploaded By: {user.username}")

            # Check if file exists
            if os.path.exists(photo.file_path):
                file_size = os.path.getsize(photo.file_path)
                print(f"   ✓ File exists ({file_size:,} bytes)")
            else:
                print(f"   ✗ File NOT FOUND on disk")
                missing_files += 1

        print()
        print("=" * 60)
        print("SUMMARY")
        print("=" * 60)
        print(f"Total photos: {total_photos}")
        print(f"Orphaned photos (user doesn't exist): {orphaned_count}")
        print(f"Missing files on disk: {missing_files}")
        print()

        if orphaned_count > 0:
            print("⚠️  Orphaned photos found. These may not display properly.")
            print("   This can happen after user deletion or database migration.")

        if missing_files > 0:
            print("⚠️  Some photo files are missing from disk.")
            print("   This can happen if uploads were not properly saved or files were deleted.")

        if orphaned_count == 0 and missing_files == 0:
            print("✓ All photos appear to be valid!")

    finally:
        db.close()

    print()
    print("=" * 60)

if __name__ == "__main__":
    main()
