# env-sync

Sync your .env files with AWS Secrets Manager. Never lose your environment variables again!

## Installation

```bash
npm install env-sync
```

## Quick Start

### 1. Initialize your project
```bash
npx env-sync init --project "my-project-name"
```

### 2. Push your .env files to AWS
```bash
npx env-sync push
```

This will upload all your `.env` files to AWS Secrets Manager.

### 3. Pull .env files from AWS (on another machine or for a teammate)
```bash
npx env-sync pull
```

## Commands

### `env-sync push`
Upload all .env files to AWS Secrets Manager

```bash
npx env-sync push [options]

Options:
  -p, --project <name>   Project name for the secret
  -r, --region <region>  AWS region (default: us-east-1)
  --profile <profile>    AWS SSO profile
```

### `env-sync pull`
Download .env files from AWS Secrets Manager

```bash
npx env-sync pull [options]

Options:
  -p, --project <name>   Project name for the secret
  -o, --overwrite        Overwrite existing .env files
  -r, --region <region>  AWS region
  --profile <profile>    AWS SSO profile
```

### `env-sync list`
Preview what variables would be synced

```bash
npx env-sync list
```

### `env-sync install-hook`
Install git pre-push hook to auto-sync before pushing

```bash
npx env-sync install-hook
```

## Configuration

Create a `.env-sync.json` file in your project root:

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