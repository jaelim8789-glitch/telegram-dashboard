#!/usr/bin/env python3
"""
File Encoding Checker

This script checks if files are encoded in UTF-8 and reports non-UTF-8 encoded files.
"""
import sys
import os


def is_valid_utf8(file_path):
    """Check if a file can be decoded as UTF-8."""
    try:
        # Try to read the file as UTF-8
        with open(file_path, 'r', encoding='utf-8') as f:
            f.read()
        return True
    except UnicodeDecodeError:
        return False
    except Exception as e:
        print(f"Error reading file {file_path}: {str(e)}")
        return False


def check_files_for_encoding(file_paths):
    """Check a list of files for UTF-8 encoding."""
    non_utf8_files = []
    
    for file_path in file_paths:
        if os.path.exists(file_path) and os.path.isfile(file_path):
            if not is_valid_utf8(file_path):
                non_utf8_files.append(file_path)
    
    return non_utf8_files


def main():
    if len(sys.argv) < 2:
        print("Usage: python check_encoding.py <file1> [file2] ...")
        sys.exit(1)
    
    files_to_check = sys.argv[1:]
    non_utf8_files = check_files_for_encoding(files_to_check)
    
    if non_utf8_files:
        print("❌ 다음 파일들이 UTF-8 인코딩이 아닙니다:")
        for file_path in non_utf8_files:
            print(f"  - {file_path}")
        sys.exit(1)
    else:
        print("✅ 모든 파일이 UTF-8 인코딩입니다.")
        sys.exit(0)


if __name__ == "__main__":
    main()