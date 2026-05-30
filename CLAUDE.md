# EnvRizz Project Guide

## Overview

EnvRizz is a CLI tool that syncs .env files with AWS Secrets Manager, enabling teams to securely share environment variables without committing sensitive data to version control. As a developer, you use it to push your local .env files to AWS and pull them down on other machines or share them with teammates, eliminating the "can you send me the env file?" workflow.

## Requirements

- Node.js: 22.20.0
- npm: 10.9.3
- TypeScript: 5.9.3

### CLI Commands
- `envrizz init` - Initialize project config, npm scripts, and pre-commit hook
- `envrizz push` - Upload .env files to AWS Secrets Manager
- `envrizz pull` - Download .env files from AWS Secrets Manager
- `envrizz list` - Preview variables to sync
- `envrizz diff` - Compare keys across all .env files
- `envrizz generate-example` - Generate .env.example from common keys
- `envrizz install-hook` - Install git pre-push hook for auto-sync

### What `envrizz init` Does
1. Creates `envrizz.json` with project config, exclude/include lists, and comments section
2. Adds `env:push` and `env:pull` npm scripts to `package.json`
3. Installs a git pre-commit hook that regenerates `.env.example` and stages it

### How Comments Work
Comments for `.env.example` are defined in `envrizz.json` under the `comments` field. When `generate-example` finds a key not in the config, it adds `"TODO: add description for KEY_NAME"`. The developer fills in real descriptions once. No comment merging or guessing from source files.

### Test Suite
- 78 tests across 4 suites (EnvParser, ConfigManager, AWSSecretsManager, CLI integration)
- Run with `npm test`
- Pre-push hook runs build, tests, and npm audit

## Deployment & Hosting

### NPM Publishing
This package is published to NPM as `envrizz`. The release process is fully automated via semantic-release. Published package.json is cleaned by prepack/postpack scripts (no devDependencies, scripts, or overrides shipped to consumers).

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
- `secretsmanager:DescribeSecret`

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
- Husky pre-commit: runs lint
- Husky pre-push: runs build, test (78 tests), and npm audit
- CLI output uses Unicode symbols (checkmark, arrow, warning) — no emojis

### File Naming Conventions
- TypeScript source files: `kebab-case.ts` (e.g., `aws-secrets.ts`)
- Test files: `kebab-case.test.ts` co-located with source

### Code Style
- Use TypeScript strict mode
- Icon library: Lucide (https://lucide.dev)
- Brand voice: reverent technical, humorous, never corporate (see docs/branding/branding-guidelines.md)
