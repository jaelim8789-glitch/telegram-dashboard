import os
import shutil
import subprocess
import glob

def setup_worktree():
    # Define paths
    repo_path = r'c:\Backups\emergency-20260718-211528\Dev\TeleMon\TeleMon-qoder-backend'
    source_tests_path = r'c:\Backups\emergency-20260718-211528\Dev\TeleMon\telegram-dashboard-backend\tests'
    
    # Remove existing directory if it exists
    if os.path.exists(repo_path):
        shutil.rmtree(repo_path)
    
    # Create new directory
    os.makedirs(repo_path)
    
    # Change to the new directory
    os.chdir(repo_path)
    
    # Initialize git repository
    subprocess.run(['git', 'init'])
    
    # Find test files related to services
    test_files = glob.glob(os.path.join(source_tests_path, 'test_*_service.py'))
    
    # Copy test files to new repository
    for file_path in test_files:
        shutil.copy2(file_path, repo_path)
    
    # Add files to git
    subprocess.run(['git', 'add', '.'])
    
    # Configure git user
    subprocess.run(['git', 'config', 'user.email', 'qoder@example.com'])
    subprocess.run(['git', 'config', 'user.name', 'Qoder'])
    
    # Commit the files
    subprocess.run(['git', 'commit', '-m', 'Add basic unit tests for media, telegram_notify, and sms services'])
    
    print("Worktree setup completed successfully!")

if __name__ == "__main__":
    setup_worktree()