#!/bin/bash
# === Simple GitHub Pages Auto-Deploy ===

# path to your site repo
SITE_PATH="/Users/aurifell/Desktop/Coding/aurifellmusic.com"

# go to repo
cd "$SITE_PATH" || { echo "❌ Path not found"; exit 1; }

# prompt for commit message
echo "Enter a commit message:"
read -r msg

# run git steps
git add .
git commit -m "$msg"
git push

# success feedback
echo "✅ Site pushed to GitHub Pages!"
echo "🔗 https://aur-iii.github.io/aurifellmusic"