# EnvRizz Branding Guidelines

## Colors

Use these consistently across the logo, docs, and CLI output.

| Name | Hex | Usage |
|------|-----|-------|
| **Primary** | `#bb3489` | Core brand color — logo, key accents |
| **Secondary** | `#fb19bc` | Highlights, hover states, emphasis |
| **White** | `#ffffff` | Backgrounds, contrast text |
| **Black** | `#000000` | Body text, dark backgrounds |

## Brand Mark

![EnvRizz Brandmark](envrizz-brandmark-logo.png)

### Logo Variants

| Variant | File | Usage |
|---------|------|-------|
| Brandmark only | `envrizz-brandmark-logo.png` | Favicons, app icons, small spaces |
| Brandmark + wordmark | `envrizz-brandmark-wording-logo.png` | README headers, docs, social |
| Horizontal | `envrizz-horizontal-logo.png` | Banners, wide layouts |

## Typography

Design Font: Pacific Northwest Letters Rough

- **CLI output:** System monospace (SF Mono, Menlo, Consolas)
- **Docs/README:** System sans-serif (-apple-system, Segoe UI, Roboto)

## Brand Voice

**Tone:** Reverent technical. Humorous. Never corporate.

EnvRizz sounds like a senior engineer who knows their stuff deeply but doesn't take themselves too seriously. The kind of person who writes bulletproof infrastructure and names it something funny.

### Principles

1. **Respect the craft** — We take the engineering seriously. The tool is reliable, the code is clean, the docs are accurate. When we talk about how something works, we're precise.

2. **Don't respect the ceremony** — We don't write press releases. We don't say "leverage" or "enterprise-grade solution." We say "stop Slacking your .env files to teammates" because that's what's actually happening.

3. **Earn the joke** — Humor lands because the tool actually works. The name is funny, but the push/pull is rock solid. The README can be playful because the tests pass.

### Do

- "Your env files deserve better than being gitignored into oblivion."
- "One command. No more 'hey can you Slack me the .env?'"
- "Synced. Your secrets are in AWS where they belong."
- Use straightforward language a junior dev can follow.
- Be direct. Short sentences. No filler.

### Don't

- "EnvRizz is a next-generation secrets orchestration platform."
- "Seamlessly integrate your environment variable workflow."
- "We're excited to announce..."
- Overpromise. If it doesn't do something, say so.
- Use jargon without context. If you say KMS, explain it once.

### Error Messages

Even errors should sound human, not robotic:
- Good: "Can't reach AWS. Check your credentials or run `aws sso login`."
- Bad: "Error: UnauthorizedAccessException in SecretsManagerClient"

### Tagline

"Give your .env files that rizz."

## Icon Library

**Lucide** (https://lucide.dev) — 1,500+ icons, ISC license, 24px SVGs with 2px strokes. Change colors via the `stroke` attribute.
