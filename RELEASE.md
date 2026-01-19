# Release Management Guide

## Current Status

✅ **Git Repository initialized**
✅ **All code committed** (Commit: `8bd93e8`)
✅ **Version tag created** (v1.0.0)

## Next Steps to Complete Release

### 1. Push to GitHub

You need to authenticate with GitHub first. Choose one method:

#### Option A: Using Personal Access Token (Recommended)
```bash
cd /Users/skzonefpv/360-pano-viewer-main
git remote set-url origin https://github.com/scottyblue77/360-pano-viewer.git
git push -u origin main
# When prompted, use your GitHub username and a Personal Access Token as password
```

#### Option B: Using SSH
```bash
# First, add GitHub to known hosts
ssh-keyscan github.com >> ~/.ssh/known_hosts

# Then push
cd /Users/skzonefpv/360-pano-viewer-main
git push -u origin main
```

#### Option C: Using GitHub CLI
```bash
gh auth login
cd /Users/skzonefpv/360-pano-viewer-main
git push -u origin main
```

### 2. Push Tags
```bash
git push origin v1.0.0
# Or push all tags:
git push origin --tags
```

### 3. Create GitHub Release

#### Using GitHub Web Interface:
1. Go to: https://github.com/scottyblue77/360-pano-viewer/releases/new
2. Select tag: `v1.0.0`
3. Title: `Release v1.0.0 - Initial Release`
4. Description:
```
## Release v1.0.0 - Initial Release

### Features
- Complete 360° panorama viewer functionality
- Photo Sphere Viewer integration with plugins
- Admin interface for tour management
- Upload functionality for panoramas
- Hotspot editor for interactive elements
- Virtual tour navigation between panoramas

### Technical Details
- TypeScript + Vite build system
- Photo Sphere Viewer 5.11.5
- Three.js integration
- Responsive design for desktop and mobile

### Installation
```bash
npm install
npm run dev
```

### Rollback
To rollback to this version:
```bash
git checkout v1.0.0
npm install
npm run build
```
```
5. Click "Publish release"

#### Using GitHub CLI:
```bash
gh release create v1.0.0 \
  --title "Release v1.0.0 - Initial Release" \
  --notes "## Release v1.0.0 - Initial Release

### Features
- Complete 360° panorama viewer functionality
- Photo Sphere Viewer integration with plugins
- Admin interface for tour management
- Upload functionality for panoramas
- Hotspot editor for interactive elements
- Virtual tour navigation between panoramas"
```

## Version Management

Current version: **v1.0.0** (from package.json)

### For Future Releases:

1. **Update version in package.json:**
   ```bash
   npm version patch  # for bug fixes (1.0.0 -> 1.0.1)
   npm version minor  # for new features (1.0.0 -> 1.1.0)
   npm version major  # for breaking changes (1.0.0 -> 2.0.0)
   ```

2. **Commit the version change:**
   ```bash
   git add package.json package-lock.json
   git commit -m "Bump version to v1.0.1"
   ```

3. **Create and push tag:**
   ```bash
   git tag -a v1.0.1 -m "Release v1.0.1"
   git push origin main
   git push origin v1.0.1
   ```

4. **Create GitHub release** (see above)

## Rollback Plan

### To rollback to a specific version:

```bash
# 1. Checkout the release tag
git checkout v1.0.0

# 2. Create a new branch from this version (optional, for safety)
git checkout -b rollback-v1.0.0

# 3. Reinstall dependencies
npm install

# 4. Build the project
npm run build

# 5. If you want to make this the new main branch:
git checkout main
git reset --hard v1.0.0
git push origin main --force  # ⚠️ Use with caution
```

### To view all available versions:
```bash
git tag -l
git log --oneline --decorate
```

## Current Commit History

```
8bd93e8 (HEAD -> main, tag: v1.0.0) Initial commit: 360° Panorama Viewer v1.0.0
```

## Files Committed

- ✅ All source code (src/)
- ✅ Configuration files (package.json, tsconfig.json, vite.config.ts)
- ✅ HTML files (index.html, admin.html, upload.html)
- ✅ API endpoints (api/)
- ✅ Documentation (README.md, PLAN.md)
- ✅ Build configuration (vercel.json)
- ✅ .gitignore (excludes node_modules, dist, etc.)

## Security Note

⚠️ Make sure `.env` files are NOT committed (they're in .gitignore)
⚠️ Never commit sensitive API keys or tokens
⚠️ Review all files before pushing to ensure no secrets are included
