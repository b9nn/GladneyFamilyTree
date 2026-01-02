"""
Test script to verify email configuration is working.

Usage:
    python test_email.py your-test-email@example.com

This will:
1. Load the .env file
2. Check if email credentials are configured
3. Test the SMTP connection
4. Send a test email (if you provide an email address)
"""

import sys
import os
from pathlib import Path

# Add the backend directory to the path
sys.path.insert(0, str(Path(__file__).parent))

# Load environment variables from .env file
from dotenv import load_dotenv
load_dotenv()

from app.email import is_email_configured, test_email_config, send_invite_email, get_email_config

def main():
    print("=" * 60)
    print("EMAIL CONFIGURATION TEST")
    print("=" * 60)
    print()

    # Check configuration
    config = get_email_config()

    print("Current Configuration:")
    print(f"  SMTP Host:     {config['smtp_host']}")
    print(f"  SMTP Port:     {config['smtp_port']}")
    print(f"  SMTP User:     {config['smtp_user'] or '❌ NOT SET'}")
    print(f"  SMTP Password: {'✓ Set' if config['smtp_password'] else '❌ NOT SET'}")
    print(f"  From Email:    {config['from_email'] or '❌ NOT SET'}")
    print(f"  From Name:     {config['from_name']}")
    print(f"  Site URL:      {config['site_url']}")
    print()

    # Check if configured
    if not is_email_configured():
        print("❌ EMAIL NOT CONFIGURED")
        print()
        print("Please update your backend/.env file with the following:")
        print("  - SMTP_USER=your-email@gmail.com")
        print("  - SMTP_PASSWORD=your-16-char-app-password")
        print("  - FROM_EMAIL=your-email@gmail.com")
        print()
        print("See backend/.env for detailed instructions.")
        return

    print("✓ Email configuration found")
    print()

    # Test connection
    print("Testing SMTP connection...")
    success, message = test_email_config()

    if success:
        print(f"✓ {message}")
        print()
    else:
        print(f"❌ {message}")
        print()
        print("Common issues:")
        print("  1. Wrong password - make sure you're using an App Password, not your Gmail password")
        print("  2. 2-Step Verification not enabled on your Google account")
        print("  3. Incorrect SMTP settings")
        print()
        return

    # Send test email if address provided
    if len(sys.argv) > 1:
        test_email = sys.argv[1]
        print(f"Sending test invite email to {test_email}...")

        if send_invite_email(test_email, "TEST-CODE-12345", "Test Recipient"):
            print(f"✓ Test email sent successfully to {test_email}")
            print("  Check your inbox (and spam folder) for the invite email")
        else:
            print(f"❌ Failed to send test email to {test_email}")
            print("  Check the error messages above for details")
    else:
        print("To send a test email, run:")
        print(f"  python {Path(__file__).name} your-email@example.com")

    print()
    print("=" * 60)

if __name__ == "__main__":
    main()
