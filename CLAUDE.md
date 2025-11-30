# EnvRizz Project Guide

## Overview

EnvRizz is a CLI tool that syncs .env files with AWS Secrets Manager, enabling teams to securely share environment variables without committing sensitive data to version control. As a developer, you use it to push your local .env files to AWS and pull them down on other machines or share them with teammates, eliminating the "can you send me the env file?" workflow.

## Requirements

- Node.js: 22.20.0
- npm: 10.9.3
- TypeScript: 5.9.3

### CLI Commands
- `envrizz init` - Initialize project configuration
- `envrizz push` - Upload .env files to AWS
- `envrizz pull` - Download .env files from AWS
- `envrizz list` - Preview variables to sync
- `envrizz install-hook` - Install git pre-push hook

## Deployment & Hosting

### NPM Publishing
This package is published to NPM as `envrizz`. The release process is fully automated via semantic-release.

### Release Workflow
1. Commits to `main` branch trigger GitHub Actions
2. semantic-release analyzes commit messages to determine version bump
3. If version changes, it publishes to NPM automatically
4. GitHub release is created with auto-generated changelog

### Publishing Credentials
- **NPM_TOKEN**: Required for publishing to NPM registry. Stored as GitHub Actions secret.
- **GITHUB_TOKEN**: Auto-provided by GitHub Actions for creating releases.

### Manual Publishing (if needed)
```bash
npm login
npm publish
```

## Third-Party API Keys & Tokens

### AWS Credentials (Required for CLI Usage)
The CLI requires AWS credentials with permissions to read/write AWS Secrets Manager.

**Setup Options:**
1. **AWS SSO (Recommended)**: `aws sso login --profile your-profile`
2. **IAM Credentials**: `aws configure`
3. **Environment Variables**: Set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY`

**Required IAM Permissions:**
- `secretsmanager:CreateSecret`
- `secretsmanager:GetSecretValue`
- `secretsmanager:PutSecretValue`
- `secretsmanager:UpdateSecret`

### NPM Token
Uses an `NPM_TOKEN` stored in GitHub repository secrets to publish new versions.

## Team Norms & Code Standards

### Commit Convention
This project uses semantic-release for automated versioning. Follow these commit message formats:

**Commit Types:**
- `feat:` New feature (minor version bump: 1.0.0 → 1.1.0)
- `fix:` Bug fix (patch version bump: 1.0.0 → 1.0.1)
- `docs:` Documentation changes (no version bump)
- `chore:` Maintenance tasks (no version bump)
- `refactor:` Code refactoring (no version bump)
- `test:` Test changes (no version bump)
- `perf:` Performance improvements (patch version bump)

**Breaking Changes:**
Add `BREAKING CHANGE:` in commit body for major version bump (1.0.0 → 2.0.0)

### Code Quality
Husky runs lint on pre-commit, build and test on pre-push.

### File Naming Conventions
- TypeScript source files: `kebab-case.ts` (e.g., `aws-secrets.ts`)

### Code Style
- Use TypeScript strict mode
