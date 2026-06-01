# Contributing to EnvRizz

Thanks for your interest in contributing! Here's how to get started.

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/envrizz.git`
3. Install dependencies: `npm install`
4. Create a branch: `git checkout -b my-feature`

## Development

```bash
npm run build      # Compile TypeScript
npm run dev        # Watch mode
npm run lint       # Run ESLint
npm test           # Run tests
```

## Commit Messages

This project uses [semantic-release](https://github.com/semantic-release/semantic-release) for automated versioning. Follow these commit message formats:

- `feat: add new feature` (minor version bump)
- `fix: fix a bug` (patch version bump)
- `docs: update documentation` (no release)
- `chore: maintenance task` (no release)

## Pull Requests

1. Make sure your code passes `npm run lint` and `npm run build`
2. Keep PRs focused on a single change
3. Write a clear description of what your PR does and why

## End-to-End Testing

Unit and integration tests run with `npm test` and don't require AWS. For full end-to-end testing against real AWS Secrets Manager, set up a local test project:

1. Create a `test-project/` directory in the repo root (it's gitignored)
2. Add a `package.json` and a simple app (e.g., `server.js`) that reads environment variables
3. Create multiple `.env` files (`.env.dev`, `.env.staging`, `.env.production`) with test values — use fake secrets, never real ones
4. Make sure you have AWS credentials configured (`aws sso login --profile your-profile`)

Then run through the three test flows:

**Fresh setup:**
```bash
cd test-project
npx envrizz init --project "my-test"
npx envrizz list
npx envrizz diff
npx envrizz generate-example
```

**Project update (drift detection):**
```bash
# Add a new variable to one .env file
echo "NEW_VAR=test" >> .env.dev
npx envrizz diff          # Should catch the drift
npx envrizz generate-example  # Should exclude the non-common key
```

**Onboarding (push/pull cycle):**
```bash
npx envrizz push           # Upload to AWS
rm .env.dev .env.staging .env.production
npx envrizz pull           # Should restore all files from AWS
```

Remember to clean up your AWS Secrets Manager after testing — delete the test secret from the AWS console or CLI.

## Reporting Bugs

Open an issue at [github.com/terrancemacgregor/envrizz/issues](https://github.com/terrancemacgregor/envrizz/issues) with:

- What you expected to happen
- What actually happened
- Steps to reproduce
- Your Node.js version and OS

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
