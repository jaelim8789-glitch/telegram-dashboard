#!/usr/bin/env python3
"""
Test script to verify encoding check functionality
"""
import os
import tempfile


def create_test_files():
    """Create test files with different encodings"""
    # Create a temporary UTF-8 file
    with open('temp_utf8_test.txt', 'w', encoding='utf-8') as f:
        f.write("This is a UTF-8 encoded test file.\n")
        f.write("테스트 파일입니다.\n")  # Korean characters
        f.write("测试文件\n")  # Chinese characters
    
    print("✅ Created UTF-8 test file: temp_utf8_test.txt")


def cleanup_test_files():
    """Clean up test files"""
    try:
        os.remove('temp_utf8_test.txt')
        print("🧹 Cleaned up test files")
    except FileNotFoundError:
        pass


def main():
    print("🧪 Testing encoding check functionality...")
    
    # Create test files
    create_test_files()
    
    # Test the encoding checker
    print("\n📋 Running encoding check on test file...")
    os.system(f"python scripts/check_encoding.py temp_utf8_test.txt")
    
    # Clean up
    cleanup_test_files()
    
    print("\n✅ Encoding check test completed!")


if __name__ == "__main__":
    main()