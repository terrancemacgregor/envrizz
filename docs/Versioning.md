# Versioning

## Overview

EnvRizz uses semantic versioning (SemVer) managed automatically by semantic-release.

## Version Format

Versions follow the pattern: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes that require user action
- **MINOR**: New features, backwards compatible
- **PATCH**: Bug fixes, backwards compatible

## Automated Versioning

Version bumps are determined automatically by commit message prefixes:

| Commit Type | Version Bump | Example |
|-------------|--------------|---------|
| `feat:` | Minor (1.0.0 → 1.1.0) | `feat: add multi-profile support` |
| `fix:` | Patch (1.0.0 → 1.0.1) | `fix: resolve quote parsing issue` |
| `perf:` | Patch (1.0.0 → 1.0.1) | `perf: improve file scanning speed` |
| `BREAKING CHANGE:` | Major (1.0.0 → 2.0.0) | Body contains `BREAKING CHANGE:` |

## Release Process

1. Developer commits with proper prefix to `main` branch
2. GitHub Actions triggers semantic-release
3. semantic-release analyzes all commits since last release
4. Determines appropriate version bump
5. Updates `package.json` version
6. Publishes to NPM
7. Creates GitHub release with changelog
8. Updates CHANGELOG.md

## No Manual Versioning

Do not manually edit the version in `package.json`. All version management is handled by the CI/CD pipeline.

## Pre-release Versions

For testing releases before they go to production, create a branch named `beta` or `alpha`. semantic-release will create pre-release versions like `1.1.0-beta.1`.

