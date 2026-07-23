#!/usr/bin/env python3
"""
Uncommitted Changes Monitor Script

This script checks for uncommitted changes in the git repository every 30 minutes
and sends notifications if old changes are detected.
"""
import os
import time
import subprocess
import sys
from datetime import datetime, timedelta
import json


def get_git_status():
    """Get the current git status with detailed information."""
    try:
        # Check if we're in a git repository
        result = subprocess.run(['git', 'rev-parse', '--is-inside-work-tree'], 
                              capture_output=True, text=True, cwd=os.getcwd())
        if result.returncode != 0:
            print("Not in a git repository")
            return None
            
        # Get detailed git status
        result = subprocess.run(['git', 'status', '--porcelain', '--untracked-files=all'], 
                              capture_output=True, text=True, cwd=os.getcwd())
        if result.returncode != 0:
            print(f"Error getting git status: {result.stderr}")
            return None
            
        return result.stdout.strip().split('\n') if result.stdout.strip() else []
    except Exception as e:
        print(f"Exception while checking git status: {str(e)}")
        return None


def get_file_modification_time(filepath):
    """Get the last modification time of a file."""
    try:
        return datetime.fromtimestamp(os.path.getmtime(filepath))
    except OSError:
        # If file doesn't exist locally, it might be staged only
        return datetime.now()


def parse_git_status(status_lines):
    """Parse git status lines and extract file information."""
    files = []
    for line in status_lines:
        if line.strip():
            # Line format: XY FILENAME
            parts = line.split(' ', 2)
            if len(parts) >= 2:
                status = parts[0].strip()
                filepath = parts[1].strip()
                
                # Determine actual file path (might be in subdirectories)
                full_path = os.path.join(os.getcwd(), filepath)
                mod_time = get_file_modification_time(full_path)
                
                files.append({
                    'filepath': filepath,
                    'status': status,
                    'modified_at': mod_time
                })
    return files


def check_for_old_changes(threshold_minutes=30):
    """Check for changes older than the threshold."""
    status_lines = get_git_status()
    if not status_lines:
        return []
        
    files = parse_git_status(status_lines)
    old_changes = []
    threshold_time = datetime.now() - timedelta(minutes=threshold_minutes)
    
    for f in files:
        if f['modified_at'] < threshold_time:
            age = datetime.now() - f['modified_at']
            old_changes.append({
                'filepath': f['filepath'],
                'status': f['status'],
                'age_minutes': int(age.total_seconds() / 60)
            })
    
    return old_changes


def send_notification(old_changes):
    """Send notification about old uncommitted changes."""
    if not old_changes:
        return
        
    print("=" * 60)
    print(f"⚠️  알림: 오래된 커밋되지 않은 변경 사항 발견 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    for change in old_changes:
        print(f"📁 {change['filepath']} ({change['status']}) - {change['age_minutes']}분 전 수정")
    
    print("-" * 60)
    print("💡 제안: 변경 사항을 커밋하거나 취소하세요")
    print("   git add <files> && git commit -m \"...\"")
    print("   또는 git checkout . (모든 변경 취소)")
    print("=" * 60)


def main():
    """Main monitoring loop."""
    print(f"🔄 Uncommitted Changes Monitor 시작 - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("⏳ 30분마다 git 상태 확인 중...")
    
    try:
        while True:
            old_changes = check_for_old_changes(threshold_minutes=30)
            send_notification(old_changes)
            
            print(f"⏰ 다음 확인까지 30분 대기 중... ({datetime.now().strftime('%H:%M:%S')})")
            time.sleep(30 * 60)  # Wait for 30 minutes
    except KeyboardInterrupt:
        print("\n⏹️  모니터링 중지됨")
        sys.exit(0)
    except Exception as e:
        print(f"❌ 오류 발생: {str(e)}")
        sys.exit(1)


if __name__ == "__main__":
    main()