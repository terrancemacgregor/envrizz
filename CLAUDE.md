# EnvRizz Project Guide

## Overview
EnvRizz is a CLI tool that syncs .env files with AWS Secrets Manager, allowing teams to securely share environment variables.

## Project Structure
```
envrizz/
├── src/
│   ├── cli.ts          # CLI command definitions
│   ├── index.ts        # Main export
│   └── lib/
│       ├── aws-secrets.ts  # AWS Secrets Manager operations
│       ├── config.ts       # Configuration management
│       └── env-parser.ts   # .env file parsing/serialization
├── dist/               # Compiled JavaScript
└── .envrizz.json      # Project configuration (if exists)
```

## Key Commands

### Development
- `npm run build` - Compile TypeScript to JavaScript
- `npm run dev` - Watch mode for development
- `npm test` - Run tests
- `npm run lint` - Lint TypeScript files

### CLI Commands
- `envrizz init` - Initialize project configuration
- `envrizz push` - Upload .env files to AWS
- `envrizz pull` - Download .env files from AWS
- `envrizz list` - Preview variables to sync
- `envrizz install-hook` - Install git pre-push hook

## Important Files

### src/cli.ts
Main CLI entry point with Commander.js command definitions.

### src/lib/aws-secrets.ts
Handles AWS Secrets Manager operations (push/pull secrets).

### src/lib/env-parser.ts
Parses .env files into key-value pairs and reconstructs files from stored data.

### src/lib/config.ts
Manages .envrizz.json configuration file.

## AWS Integration
- Uses AWS SDK v3 for Secrets Manager
- Supports SSO profiles via `@aws-sdk/credential-provider-sso`
- Stores all env variables as a single JSON secret per project

## Testing & Quality
Before committing changes, always run:
1. `npm run build` - Ensure TypeScript compiles
2. `npm run lint` - Check for linting errors
3. `npm test` - Run tests (if available)

## Commit Convention (IMPORTANT)
This project uses semantic-release for automated versioning and publishing. Follow these commit message formats:

### Commit Types
- `feat:` New feature (triggers minor version bump: 1.0.0 → 1.1.0)
- `fix:` Bug fix (triggers patch version bump: 1.0.0 → 1.0.1)
- `docs:` Documentation changes (no version bump)
- `chore:` Maintenance tasks (no version bump)
- `refactor:` Code refactoring (no version bump)
- `test:` Test changes (no version bump)
- `perf:` Performance improvements (triggers patch version bump)

### Breaking Changes
Add `BREAKING CHANGE:` in commit body for major version bump (1.0.0 → 2.0.0)

### Examples
```
feat: add support for multiple AWS profiles
fix: resolve env parsing issue with quotes
docs: update README with new examples
chore: update dependencies
BREAKING CHANGE: remove support for Node 14
```

### Automated Release Process
- Every commit to main triggers semantic-release
- Version is auto-determined from commit messages
- Automatically publishes to NPM if version changes
- Creates GitHub release with changelog
- Updates CHANGELOG.md file

## Key Dependencies
- `@aws-sdk/client-secrets-manager` - AWS integration
- `commander` - CLI framework
- `dotenv` - .env file parsing
- `glob` - File pattern matching

## Configuration
Projects can use `.envrizz.json` for configuration:
```json
{
  "projectName": "my-project",
  "awsRegion": "us-east-1",
  "awsProfile": "profile-name",
  "exclude": [".env.example"],
  "include": [".env", ".env.*"]
}
```