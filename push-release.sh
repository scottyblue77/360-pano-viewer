#!/bin/bash

# Script to push code and create release on GitHub
# Make sure you're authenticated with GitHub first

set -e

echo "🚀 Pushing code to GitHub..."

# Push main branch
echo "📤 Pushing main branch..."
git push -u origin main

# Push tags
echo "🏷️  Pushing tags..."
git push origin --tags

echo "✅ Code and tags pushed successfully!"
echo ""
echo "📋 Next steps:"
echo "1. Go to: https://github.com/scottyblue77/360-pano-viewer/releases/new"
echo "2. Select tag: v1.0.0"
echo "3. Fill in release details (see RELEASE.md for template)"
echo "4. Click 'Publish release'"
echo ""
echo "Or use GitHub CLI:"
echo "gh release create v1.0.0 --title 'Release v1.0.0' --notes 'Initial release'"
