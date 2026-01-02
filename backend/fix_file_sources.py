"""
Script to check and optionally fix files with incorrect source tags.

This script will:
1. Display all files and their current source tags
2. Optionally update files that should be in 'files' but are tagged as 'vignettes'

Usage:
    python fix_file_sources.py --check          # Just check, don't modify
    python fix_file_sources.py --fix            # Fix the mistagged files
"""

import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from datetime import datetime

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.models import File, User
from app.database import DATABASE_URL

def get_db_session():
    """Create a database session"""
    engine = create_engine(
        DATABASE_URL,
        connect_args={"check_same_thread": False} if "sqlite" in DATABASE_URL else {}
    )
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    return SessionLocal()

def check_files(db):
    """Check all files and their source tags"""
    print("\n" + "="*80)
    print("CHECKING FILE SOURCE TAGS")
    print("="*80 + "\n")

    all_files = db.query(File).order_by(File.created_at.desc()).all()

    if not all_files:
        print("No files found in database.")
        return []

    vignette_files = []
    files_files = []

    for file in all_files:
        if file.source == "vignettes":
            vignette_files.append(file)
        elif file.source == "files":
            files_files.append(file)

    print(f"Total files in database: {len(all_files)}")
    print(f"  - Tagged as 'files': {len(files_files)}")
    print(f"  - Tagged as 'vignettes': {len(vignette_files)}")
    print()

    if vignette_files:
        print("\nFiles tagged as 'vignettes':")
        print("-" * 80)
        for file in vignette_files:
            uploaded_by = db.query(User).filter(User.id == file.uploaded_by_id).first()
            username = uploaded_by.username if uploaded_by else "Unknown"
            print(f"ID: {file.id:4d} | {file.created_at.strftime('%Y-%m-%d %H:%M')} | "
                  f"By: {username:15s} | Title: {file.title or file.filename}")
        print()

    if files_files:
        print("\nFiles tagged as 'files':")
        print("-" * 80)
        for file in files_files[:10]:  # Show first 10
            uploaded_by = db.query(User).filter(User.id == file.uploaded_by_id).first()
            username = uploaded_by.username if uploaded_by else "Unknown"
            print(f"ID: {file.id:4d} | {file.created_at.strftime('%Y-%m-%d %H:%M')} | "
                  f"By: {username:15s} | Title: {file.title or file.filename}")
        if len(files_files) > 10:
            print(f"... and {len(files_files) - 10} more")
        print()

    return vignette_files

def fix_files(db, files_to_fix):
    """Update source tag from 'vignettes' to 'files' for specified files"""
    if not files_to_fix:
        print("No files to fix.")
        return

    print("\n" + "="*80)
    print("FIXING FILE SOURCE TAGS")
    print("="*80 + "\n")

    print(f"Will update {len(files_to_fix)} files from 'vignettes' to 'files'")

    confirm = input("\nAre you sure you want to proceed? (yes/no): ").strip().lower()
    if confirm != 'yes':
        print("Aborted. No changes made.")
        return

    updated_count = 0
    for file in files_to_fix:
        file.source = "files"
        updated_count += 1

    db.commit()
    print(f"\n✓ Successfully updated {updated_count} files!")
    print("Files that were tagged as 'vignettes' are now tagged as 'files'.")

def main():
    if len(sys.argv) < 2 or sys.argv[1] not in ['--check', '--fix']:
        print(__doc__)
        sys.exit(1)

    mode = sys.argv[1]

    try:
        db = get_db_session()

        # Check current state
        vignette_files = check_files(db)

        if mode == '--fix':
            if vignette_files:
                print("\n" + "!"*80)
                print("WARNING: These files are currently tagged as 'vignettes'.")
                print("This script will change them to 'files'.")
                print("Only proceed if you want these files to appear on the Files page,")
                print("NOT on the Vignettes page.")
                print("!"*80)
                fix_files(db, vignette_files)
            else:
                print("✓ No files need fixing. All files are correctly tagged!")
        elif mode == '--check':
            if vignette_files:
                print("\nℹ️  To fix these files, run: python fix_file_sources.py --fix")
            else:
                print("✓ All files are correctly tagged!")

        db.close()

    except Exception as e:
        print(f"\n❌ Error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    main()
