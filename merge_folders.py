import os
import shutil
from pathlib import Path

def merge_landing_folders():
    landing_upper = Path('c:/Backups/emergency-20260718-211528/Dev/TeleMon/public/Landing')
    landing_lower = Path('c:/Backups/emergency-20260718-211528/Dev/TeleMon/public/landing')
    
    if not landing_upper.exists():
        print("Landing folder does not exist.")
        return
    
    if not landing_lower.exists():
        print("landing folder does not exist, renaming Landing to landing.")
        landing_upper.rename(landing_lower)
        print("Renamed Landing to landing successfully.")
        return
    
    # Backup the lowercase landing folder temporarily
    landing_backup = Path('c:/Backups/emergency-20260718-211528/Dev/TeleMon/public/landing_backup')
    
    if landing_backup.exists():
        shutil.rmtree(landing_backup)
    
    # Move the lowercase landing to backup
    landing_lower.rename(landing_backup)
    
    # Rename the uppercase Landing to landing
    landing_upper.rename(landing_lower)
    
    # Copy files from backup to the new landing folder
    for file_path in landing_backup.iterdir():
        if file_path.is_file():
            target_path = landing_lower / file_path.name
            if not target_path.exists():  # Don't overwrite if file already exists
                shutil.copy2(file_path, target_path)
    
    # Remove the backup folder
    shutil.rmtree(landing_backup)
    
    print("Successfully merged Landing and landing folders into landing.")

if __name__ == "__main__":
    merge_landing_folders()