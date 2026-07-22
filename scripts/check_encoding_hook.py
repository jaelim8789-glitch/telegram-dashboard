#!/usr/bin/env python3
"""
Encoding Check Hook
Pre-commit 훅으로 사용되어 UTF-8 인코딩이 아닌 파일이 있으면 커밋을 차단합니다.
"""

import sys
import os
import subprocess
from pathlib import Path


def is_utf8_encoded(file_path):
    """파일이 UTF-8 인코딩인지 확인합니다."""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            f.read()
        return True
    except UnicodeDecodeError:
        return False
    except Exception:
        # 파일을 열 수 없는 경우 (예: 바이너리 파일)는 패스
        return True


def get_staged_files():
    """git에 staged된 파일 목록을 가져옵니다."""
    try:
        result = subprocess.run(
            ['git', 'diff', '--cached', '--name-only', '--diff-filter=ACM'],
            capture_output=True,
            text=True,
            check=True
        )
        return [f for f in result.stdout.strip().split('\n') if f]
    except subprocess.CalledProcessError:
        print('❌ Git 명령어 실행 실패')
        return []


def main():
    print('🔍 UTF-8 인코딩 검사 시작...')
    
    staged_files = get_staged_files()
    if not staged_files:
        print('✅ staged 파일 없음')
        return 0

    non_utf8_files = []
    text_extensions = {'.py', '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.scss', '.sass', '.less', '.json', '.yaml', '.yml', '.md', '.txt', '.xml', '.sql', '.sh', '.bat'}

    for file_path in staged_files:
        ext = Path(file_path).suffix.lower()
        if ext in text_extensions:
            abs_path = os.path.abspath(file_path)
            if os.path.exists(abs_path) and not is_utf8_encoded(abs_path):
                non_utf8_files.append(file_path)

    if non_utf8_files:
        print('❌ UTF-8이 아닌 파일이 있습니다:')
        for file_path in non_utf8_files:
            print(f'  - {file_path}')
        print('')
        print('💡 해결 방법:')
        print('   1. 해당 파일들을 UTF-8 인코딩으로 변환하세요.')
        print('   2. VSCode: 우측 하단 인코딩 표시 클릭 → "Save with Encoding" → "UTF-8" 선택')
        print('   3. 다른 편집기에서도 유사한 기능 사용')
        return 1

    print('✅ 모든 파일이 UTF-8 인코딩입니다.')
    return 0


if __name__ == '__main__':
    sys.exit(main())