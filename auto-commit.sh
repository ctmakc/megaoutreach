#!/bin/bash

# Auto commit and push script
# Runs every hour via cron

cd "$(dirname "$0")"

# Check if there are changes
if [[ -n $(git status -s) ]]; then
    echo "📝 Changes detected, committing..."

    # Add all changes
    git add -A

    # Commit with timestamp
    git commit -m "auto: $(date '+%Y-%m-%d %H:%M:%S')"

    # Push to remote
    git push origin main

    echo "✅ Pushed at $(date '+%Y-%m-%d %H:%M:%S')"
else
    echo "✨ No changes to commit"
fi
