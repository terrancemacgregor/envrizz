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

## Reporting Bugs

Open an issue at [github.com/terrancemacgregor/envrizz/issues](https://github.com/terrancemacgregor/envrizz/issues) with:

- What you expected to happen
- What actually happened
- Steps to reproduce
- Your Node.js version and OS

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
