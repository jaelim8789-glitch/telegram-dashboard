import os
import shutil
import stat
import subprocess
import glob
from pathlib import Path

def handle_remove_readonly(func, path, exc):
    """Error handler for shutil.rmtree to handle read-only files."""
    if os.path.exists(path):
        os.chmod(path, stat.S_IWRITE)
        func(path)

def setup_worktree():
    # Define paths
    repo_path = Path(r'c:\Backups\emergency-20260718-211528\Dev\TeleMon\TeleMon-qoder-backend')
    source_tests_path = Path(r'c:\Backups\emergency-20260718-211528\Dev\TeleMon\telegram-dashboard-backend\tests')
    
    # Remove existing directory if it exists
    if repo_path.exists():
        shutil.rmtree(repo_path, onerror=handle_remove_readonly)
    
    # Create new directory
    repo_path.mkdir(exist_ok=True)
    
    # Change to the new directory
    os.chdir(repo_path)
    
    # Initialize git repository
    subprocess.run(['git', 'init'], check=True)
    
    # Find test files related to services
    test_files = list(source_tests_path.glob('test_*_service.py'))
    
    # Copy test files to new repository
    for file_path in test_files:
        shutil.copy2(file_path, repo_path)
    
    # Add files to git
    subprocess.run(['git', 'add', '.'], check=True)
    
    # Configure git user
    subprocess.run(['git', 'config', 'user.email', 'qoder@example.com'], check=True)
    subprocess.run(['git', 'config', 'user.name', 'Qoder'], check=True)
    
    # Commit the files
    subprocess.run(['git', 'commit', '-m', 'Add basic unit tests for media, telegram_notify, and sms services'], check=True)
    
    print("Worktree setup completed successfully!")

if __name__ == "__main__":
    setup_worktree()