# Release Process

This document describes the automated release and publishing process for vscode-pokemon.

## Overview

We have two GitHub Actions workflows to handle releases:

1. **Manual Release Creation** (`release.yml`) - Creates a new version and GitHub release
2. **Automated Publishing** (`publish.yml`) - Publishes to VS Code Marketplace when a tag is pushed

## How to Create a Release

### Option 1: Using the Manual Release Workflow (Recommended)

This is the easiest way to create a release:

1. Go to the [Actions tab](https://github.com/jakobhoeg/vscode-pokemon/actions)
2. Select "Create Release" workflow
3. Click "Run workflow"
4. Choose the version bump type:
   - **patch** (x.x.X) - Bug fixes and minor changes
   - **minor** (x.X.0) - New features, backwards compatible
   - **major** (X.0.0) - Breaking changes
5. Click "Run workflow"

The workflow will:
- ✅ Bump the version in `package.json`
- ✅ Update the `CHANGELOG.md`
- ✅ Create a git commit and tag
- ✅ Push to main branch
- ✅ Create a GitHub Release with auto-generated notes
- ✅ Trigger the publish workflow automatically

> **Note:** Quality checks (linting, formatting, tests) are handled by the existing `code-quality.yml` and `ci.yml` workflows on pull requests. The release workflow trusts that main branch is always in a good state.

### Option 2: Manual Tag Creation

If you prefer manual control:

1. Update version manually:
   ```bash
   npm version patch  # or minor, or major
   ```

2. Update `CHANGELOG.md` manually

3. Commit and push:
   ```bash
   git add .
   git commit -m "chore(release): v4.3.0"
   git tag v4.3.0
   git push origin main
   git push origin v4.3.0
   ```

4. The publish workflow will trigger automatically

## Publishing Workflow

When a tag matching `v*.*.*` is pushed:

1. The extension is compiled
2. A `.vsix` file is created and uploaded as an artifact (retained for 30 days)
3. The extension is published to the VS Code Marketplace
4. (Optional) Published to Open VSX Registry if `OVSX_PAT` secret is configured

> **Note:** Quality checks should be done before creating the release. The publish workflow focuses on building and distributing the extension.

## Required Secrets

To enable publishing, the following secrets need to be configured in the repository settings:

### Required
- **`VSCE_PAT`**: Personal Access Token for VS Code Marketplace
  - Create at: https://dev.azure.com/ (Azure DevOps)
  - Needs: `Marketplace > Manage` permission
  - Documentation: https://code.visualstudio.com/api/working-with-extensions/publishing-extension

### Optional
- **`OVSX_PAT`**: Personal Access Token for Open VSX Registry
  - Create at: https://open-vsx.org/user-settings/tokens
  - Allows publishing to the open-source marketplace (used by VSCodium, Gitpod, etc.)

## Versioning Guidelines

Follow [Semantic Versioning](https://semver.org/):

- **Major (X.0.0)**: Breaking changes, incompatible API changes
- **Minor (x.X.0)**: New features, backwards compatible
- **Patch (x.x.X)**: Bug fixes, backwards compatible

## CHANGELOG Format

The CHANGELOG follows [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
## [4.3.0] - 2024-01-15

- feat: add new feature
- fix: resolve bug
- chore: update dependencies
```

## Troubleshooting

### Release workflow fails at "Push changes"
- Ensure the repository has "Allow GitHub Actions to create and approve pull requests" enabled
- Check branch protection rules allow bot commits

### Publish workflow fails at "Publish to VS Code Marketplace"
- Verify `VSCE_PAT` secret is set correctly
- Check token hasn't expired
- Ensure publisher account has proper permissions

## Manual Rollback

If a release needs to be rolled back:

1. Delete the tag:
   ```bash
   git tag -d v4.3.0
   git push origin :refs/tags/v4.3.0
   ```

2. Delete the GitHub Release from the Releases page

3. Revert the version commit if needed:
   ```bash
   git revert <commit-hash>
   git push origin main
   ```

Note: You cannot unpublish from VS Code Marketplace, but you can deprecate and publish a new fixed version.
