#!/usr/bin/env python3
"""
Pre-commit Hook Setup
UTF-8 인코딩 검사를 포함한 pre-commit 훅을 설정합니다.
"""

import os
import stat
from pathlib import Path


def setup_precommit_hook():
    """Pre-commit 훅을 설정합니다."""
    # .git/hooks 디렉토리 경로
    git_hooks_dir = Path('.git/hooks')
    
    if not git_hooks_dir.exists():
        print('❌ .git/hooks 디렉토리가 존재하지 않습니다.')
        print('   이 명령어는 git 저장소 루트에서 실행되어야 합니다.')
        return False
    
    # pre-commit 훅 파일 경로
    precommit_hook_path = git_hooks_dir / 'pre-commit'
    
    # pre-commit 훅 내용
    hook_content = '''#!/bin/sh
# UTF-8 인코딩 검사
echo "🔍 UTF-8 인코딩 검사 중..."
python scripts/check_encoding_hook.py
if [ $? -ne 0 ]; then
    echo "❌ UTF-8 인코딩 검사 실패 - 커밋이 취소됩니다."
    exit 1
fi

echo "✅ 모든 검사를 통과했습니다."
'''
    
    # 파일에 쓰기
    with open(precommit_hook_path, 'w', encoding='utf-8') as f:
        f.write(hook_content)
    
    # 실행 권한 부여 (Unix 계열 시스템용)
    if os.name != 'nt':  # Windows가 아닐 경우에만
        st = os.stat(precommit_hook_path)
        os.chmod(precommit_hook_path, st.st_mode | stat.S_IEXEC)
    
    print(f'✅ Pre-commit 훅이 생성되었습니다: {precommit_hook_path}')
    print('   앞으로 모든 커밋 시 UTF-8 인코딩 검사가 자동으로 수행됩니다.')
    return True


def main():
    print('🔄 Pre-commit 훅 설정 시작...')
    
    if setup_precommit_hook():
        print('🎉 설정이 완료되었습니다!')
    else:
        print('❌ 설정에 실패했습니다.')


if __name__ == '__main__':
    main()