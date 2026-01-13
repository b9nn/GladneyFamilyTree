#!/usr/bin/env python3
"""
Add PDF file fields to vignettes table
"""

from sqlalchemy import create_engine, text
from app.database import DATABASE_URL

def add_pdf_fields():
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

    with engine.connect() as conn:
        # Add pdf_file_path column
        try:
            conn.execute(text("ALTER TABLE vignettes ADD COLUMN pdf_file_path TEXT"))
            conn.commit()
            print("✓ Added pdf_file_path column")
        except Exception as e:
            if "duplicate column" in str(e).lower():
                print("✓ pdf_file_path column already exists")
            else:
                print(f"Error adding pdf_file_path: {e}")

        # Add pdf_filename column
        try:
            conn.execute(text("ALTER TABLE vignettes ADD COLUMN pdf_filename TEXT"))
            conn.commit()
            print("✓ Added pdf_filename column")
        except Exception as e:
            if "duplicate column" in str(e).lower():
                print("✓ pdf_filename column already exists")
            else:
                print(f"Error adding pdf_filename: {e}")

if __name__ == "__main__":
    add_pdf_fields()
    print("\n✓ Migration complete!")
