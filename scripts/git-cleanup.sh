#!/usr/bin/env bash
# Clean up local branches already merged to master
echo "=== Deleting merged local branches ==="
git branch --merged master | grep -v 'master\|\*' | xargs -r git branch -d
echo "Done"
