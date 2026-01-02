#!/bin/bash

# Script to push code to a new private GitHub repository
# Usage: ./push-to-new-repo.sh YOUR_GITHUB_REPO_URL

if [ -z "$1" ]; then
    echo "❌ Error: Repository URL required"
    echo ""
    echo "Usage:"
    echo "  ./push-to-new-repo.sh https://github.com/YOUR-USERNAME/YOUR-REPO.git"
    echo ""
    echo "Steps:"
    echo "  1. Create a new PRIVATE repository on GitHub: https://github.com/new"
    echo "  2. Copy the repository URL"
    echo "  3. Run this script with that URL"
    echo ""
    exit 1
fi

NEW_REPO_URL="$1"

echo "🔄 Updating Git remote to your private repository..."
echo ""

# Remove old remote
git remote remove origin

# Add new remote
git remote add origin "$NEW_REPO_URL"

echo "✅ Remote updated to: $NEW_REPO_URL"
echo ""
echo "📤 Pushing code to your private repository..."
echo ""

# Push all branches and tags
git push -u origin main

echo ""
echo "✅ Code successfully pushed to your private repository!"
echo ""
echo "🔗 Repository: $NEW_REPO_URL"
echo ""
echo "Next steps:"
echo "  1. Go to your GitHub repository"
echo "  2. Deploy to Vercel/Railway from your private repo"
echo ""

