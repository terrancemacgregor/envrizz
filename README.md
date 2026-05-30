# EnvRizz 🔥

[![npm version](https://img.shields.io/npm/v/envrizz.svg)](https://www.npmjs.com/package/envrizz)
[![license](https://img.shields.io/npm/l/envrizz.svg)](https://github.com/terrancemacgregor/envrizz/blob/main/LICENSE)
[![node](https://img.shields.io/node/v/envrizz.svg)](https://nodejs.org)

Give your .env files that rizz! Sync them with AWS Secrets Manager and never lose your environment variables again. Your env files deserve better than being gitignored into oblivion.

## The Problem

Every team has the same workflow: *"Hey, can you Slack me the .env file?"* That's insecure, doesn't scale, and breaks every time someone adds a new variable and forgets to tell the team. EnvRizz replaces that with a single command — push your .env files to AWS Secrets Manager, and your teammates pull them down. No secrets in Slack DMs, no stale .env files, no onboarding friction.

## Why EnvRizz?

| | EnvRizz | dotenv-vault | Chamber |
|---|---|---|---|
| **Storage** | AWS Secrets Manager (your account) | Dotenv's hosted servers | AWS SSM Parameter Store |
| **Third-party account** | No | Yes | No |
| **Your data stays in your AWS** | Yes | No | Yes |
| **Preserves .env file structure** | Yes — push/pull entire files | No — key/value only | No — key/value only |
| **Setup** | `npx envrizz init` | Sign up + `npx dotenv-vault push` | Install Go binary + KMS key |
| **Language** | Node.js / npm | Node.js / npm | Go |
| **Multiple .env files** | Yes (`.env`, `.env.local`, etc.) | Yes (per environment) | No |
| **Git hook support** | Built-in (`install-hook`) | No | No |

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

### 2. Push your .env files to AWS
```bash
npx envrizz push
```

This will upload all your `.env` files to AWS Secrets Manager.

### 3. Pull .env files from AWS (on another machine or for a teammate)
```bash
npx envrizz pull
```

## Commands

### `envrizz push`
Upload all .env files to AWS Secrets Manager

```bash
npx envrizz push [options]

Options:
  -p, --project <name>   Project name for the secret
  -r, --region <region>  AWS region (default: us-east-1)
  --profile <profile>    AWS SSO profile
```

### `envrizz pull`
Download .env files from AWS Secrets Manager

```bash
npx envrizz pull [options]

Options:
  -p, --project <name>   Project name for the secret
  -o, --overwrite        Overwrite existing .env files
  -r, --region <region>  AWS region
  --profile <profile>    AWS SSO profile
```

### `envrizz list`
Preview what variables would be synced

```bash
npx envrizz list
```

### `envrizz install-hook`
Install git pre-push hook to auto-sync before pushing

```bash
npx envrizz install-hook
```

## Configuration

Create a `envrizz.json` file in your project root:

```json
{
  "projectName": "my-project",
  "awsRegion": "us-east-1",
  "awsProfile": "your-aws-profile",
  "awsAccountId": "your-account-id",
  "exclude": [".env.example", ".env.sample"],
  "include": [".env", ".env.*"]
}
```

## How It Works

1. The tool scans for all `.env` files in your project root
2. It parses each file and creates a mapping like: `.env.PORT=3000`, `.env.local.API_URL=https://api.example.com`
3. These are stored as a single JSON secret in AWS Secrets Manager with your project name
4. When pulling, it recreates the original file structure from the stored mappings

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

## Example

For a project "catfish" with:
- `.env` containing `PORT=3333`
- `.env.local` containing `URL=www.cnn.com`

The AWS Secret "catfish" will store:
```json
{
  ".env.PORT": "3333",
  ".env.local.URL": "www.cnn.com"
}
```