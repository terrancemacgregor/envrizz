# EnvRizz 🔥

[![npm version](https://img.shields.io/npm/v/envrizz.svg)](https://www.npmjs.com/package/envrizz)
[![license](https://img.shields.io/npm/l/envrizz.svg)](https://github.com/terrancemacgregor/envrizz/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/envrizz.svg)](https://nodejs.org)

Give your .env files that rizz! Sync them with AWS Secrets Manager and never lose your environment variables again. Your env files deserve better than being gitignored into oblivion.

## The Problem

Every team has the same workflow: *"Hey, can you Slack me the .env file?"* That's insecure, doesn't scale, and breaks every time someone adds a new variable and forgets to tell the team. EnvRizz replaces that with a single command — push your .env files to AWS Secrets Manager, and your teammates pull them down. No secrets in Slack DMs, no stale .env files, no onboarding friction.

<p align="center">
  <img src="https://raw.githubusercontent.com/terrancemacgregor/envrizz/main/docs/branding/terminal-demo.gif" alt="EnvRizz terminal demo" width="680">
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/terrancemacgregor/envrizz/main/docs/branding/midwit-envrizz.jpg" alt="EnvRizz midwit meme" width="500">
</p>

## Why EnvRizz?

| | EnvRizz | dotenv-vault | Chamber |
|---|---|---|---|
| **Storage** | AWS Secrets Manager (your account) | Dotenv's hosted servers | AWS SSM Parameter Store |
| **Third-party account** | No | Yes | No |
| **Your data stays in your AWS** | Yes | No | Yes |
| **Preserves .env file structure** | Yes — push/pull entire files | No — key/value only | No — key/value only |
| **Setup** | `npx envrizz init` | Sign up + `npx dotenv-vault push` | Install Go binary + KMS key |
| **Language** | Node.js / npm | Node.js / npm | Go |
| **Multiple .env files** | Yes (`.env.dev`, `.env.staging`, etc.) | Yes (per environment) | No |
| **Git hook support** | Built-in | No | No |
| **Generate .env.example** | Built-in with documented comments | No | No |
| **Diff across environments** | Built-in | No | No |

**TL;DR** — If your team already uses AWS, EnvRizz is the simplest path. No third-party accounts, no extra infrastructure. Your secrets stay in your AWS account, encrypted by KMS, accessible through the same IAM permissions you already manage.

## Installation

```bash
npm install envrizz
```

## Quick Start

### 1. Initialize your project

```bash
npx envrizz init --project "my-project-name"
```

This creates `envrizz.json`, adds `env:push` and `env:pull` npm scripts to your `package.json`, and installs a git pre-commit hook that keeps `.env.example` up to date.

### 2. Push your .env files to AWS

```bash
npx envrizz push
```

Uploads all your `.env` files to AWS Secrets Manager and prints a link to view them in the AWS console.

### 3. Pull .env files from AWS

```bash
npx envrizz pull
```

Downloads `.env` files from AWS and recreates them locally. Use `--overwrite` to replace existing files.

### 4. Compare environments

```bash
npx envrizz diff
```

Shows which keys are common across all your `.env` files, which are missing from each, and which are unique to one file.

### 5. Generate .env.example

```bash
npx envrizz generate-example
```

Creates a `.env.example` with keys common to all your `.env` files. Comments come from `envrizz.json` — see [Configuration](#configuration) below.

## Commands

| Command | Description |
|---------|-------------|
| `envrizz init` | Initialize project config, npm scripts, and pre-commit hook |
| `envrizz push` | Upload .env files to AWS Secrets Manager |
| `envrizz pull` | Download .env files from AWS Secrets Manager |
| `envrizz list` | Preview variables that would be synced |
| `envrizz diff` | Compare keys across all .env files |
| `envrizz generate-example` | Generate .env.example from common keys |
| `envrizz install-hook` | Install git pre-push hook for auto-sync |

### Command Options

**`envrizz push`** / **`envrizz pull`**

```
-p, --project <name>   Project name for the secret
-r, --region <region>  AWS region (default: us-east-1)
--profile <profile>    AWS SSO profile
```

**`envrizz pull`** (additional)

```
-o, --overwrite        Overwrite existing .env files
```

**`envrizz init`**

```
-p, --project <name>   Project name
```

## Configuration

`envrizz init` creates an `envrizz.json` file in your project root:

```json
{
  "projectName": "my-project",
  "awsRegion": "us-east-1",
  "awsProfile": "your-aws-profile",
  "awsAccountId": "your-account-id",
  "exclude": [".env.example", ".env.sample"],
  "include": [".env", ".env.*"],
  "comments": {
    "PORT": "The port the server listens on",
    "DATABASE_URL": "PostgreSQL connection string",
    "API_KEY": "API authentication key"
  }
}
```

### Comments

The `comments` field is the single source of truth for `.env.example` comments. Here's how it works:

1. Run `envrizz generate-example`
2. For any key not in `comments`, envrizz adds it with `"TODO: add description for KEY_NAME"` and tells you to update the config
3. You edit `envrizz.json` and replace the TODOs with real descriptions
4. Every future run uses your descriptions — no guessing, no merging from source files

The generated `.env.example` looks like this:

```bash
# Generated by envrizz on May 30, 2026 at 2:39 AM
# Keys common to: .env.dev, .env.staging, .env.production
# Copy this file to .env and fill in the values

# The port the server listens on
PORT=

# PostgreSQL connection string
DATABASE_URL=

# API authentication key
API_KEY=
```

### Exclude / Include

The `exclude` list prevents files from being uploaded or scanned. `.env.example` and `.env.sample` are excluded by default. The `include` list defines which file patterns to look for.

## What `envrizz init` Sets Up

Running `envrizz init` does three things:

1. **Creates `envrizz.json`** — project config with defaults for region, exclude/include, and comments
2. **Adds npm scripts** — `env:push` and `env:pull` to your `package.json` so you can run `npm run env:push` instead of remembering the full command
3. **Installs a git pre-commit hook** — automatically regenerates `.env.example` and stages it before every commit, so it's always up to date in version control

## How It Works

1. EnvRizz scans for all `.env` files in your project root (excluding `.env.example` and `.env.sample`)
2. It parses each file and creates a mapping: `.env.dev.PORT=3000`, `.env.staging.API_URL=https://api.example.com`
3. These are stored as a single JSON secret in AWS Secrets Manager under your project name
4. When pulling, it recreates the original file structure from the stored mappings
5. The `diff` command compares keys across all files to catch environment drift
6. The `generate-example` command creates a documented `.env.example` from keys common to all files

## AWS Setup

Make sure you have:
1. AWS CLI configured
2. AWS credentials with permissions to read/write Secrets Manager

```bash
# For SSO profiles:
aws sso login --profile your-profile

# Or configure AWS credentials:
aws configure
```

**Required IAM Permissions:**
- `secretsmanager:CreateSecret`
- `secretsmanager:GetSecretValue`
- `secretsmanager:PutSecretValue`
- `secretsmanager:UpdateSecret`
- `secretsmanager:DescribeSecret`

## Example

For a project "catfish" with:
- `.env.dev` containing `PORT=3333` and `URL=http://localhost`
- `.env.staging` containing `PORT=8080` and `URL=https://staging.example.com`

The AWS Secret "catfish" will store:
```json
{
  ".env.dev.PORT": "3333",
  ".env.dev.URL": "http://localhost",
  ".env.staging.PORT": "8080",
  ".env.staging.URL": "https://staging.example.com"
}
```

Running `envrizz diff` would show:
```
Common to all files (2):
  PORT, URL

✔ All .env files have the same keys
```

Running `envrizz generate-example` would produce:
```bash
# Generated by envrizz on May 30, 2026 at 2:39 AM
# Keys common to: .env.dev, .env.staging
# Copy this file to .env and fill in the values

# The port the server listens on
PORT=

# The application URL
URL=
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT
