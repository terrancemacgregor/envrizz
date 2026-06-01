## [3.6.4](https://github.com/terrancemacgregor/envrizz/compare/v3.6.3...v3.6.4) (2026-06-01)


### Bug Fixes

* remove custom CodeQL workflow, use GitHub default setup ([bfe9b75](https://github.com/terrancemacgregor/envrizz/commit/bfe9b756e874349a9391f75017d91d04f30427fa))

## [3.6.3](https://github.com/terrancemacgregor/envrizz/compare/v3.6.2...v3.6.3) (2026-06-01)


### Bug Fixes

* add CodeQL code scanning workflow ([5a04b71](https://github.com/terrancemacgregor/envrizz/commit/5a04b7128dc63c46735cf8f8bad73fe45d826421))

## [3.6.2](https://github.com/terrancemacgregor/envrizz/compare/v3.6.1...v3.6.2) (2026-06-01)


### Bug Fixes

* remove dotenv dependency, implement own .env parser ([519158f](https://github.com/terrancemacgregor/envrizz/commit/519158f52dff3865fb185c93b6dd31c414f80dc9))

## [3.6.1](https://github.com/terrancemacgregor/envrizz/compare/v3.6.0...v3.6.1) (2026-06-01)


### Bug Fixes

* prevent path traversal in pull command and parseEnvFile ([b2175cb](https://github.com/terrancemacgregor/envrizz/commit/b2175cbc661cffd456ab37266254f252e02472b4))

# [3.6.0](https://github.com/terrancemacgregor/envrizz/compare/v3.5.2...v3.6.0) (2026-06-01)


### Features

* add doctor command for environment health checks ([8211e50](https://github.com/terrancemacgregor/envrizz/commit/8211e508a745b0e964e471f274221eba1e041350))

## [3.5.2](https://github.com/terrancemacgregor/envrizz/compare/v3.5.1...v3.5.2) (2026-05-31)


### Bug Fixes

* merge CLAUDE.md into README and gitignore it ([62573ee](https://github.com/terrancemacgregor/envrizz/commit/62573ee20710d2a5fe8798662529104e6c2e20c7))

## [3.5.1](https://github.com/terrancemacgregor/envrizz/compare/v3.5.0...v3.5.1) (2026-05-30)


### Bug Fixes

* rename AGENT.md to envrizz-agent.md ([1701d82](https://github.com/terrancemacgregor/envrizz/commit/1701d82488ca6996b63bd0ca706d11eae7a66635))

# [3.5.0](https://github.com/terrancemacgregor/envrizz/compare/v3.4.1...v3.5.0) (2026-05-30)


### Features

* add AI setup agent for automated project configuration ([c687f64](https://github.com/terrancemacgregor/envrizz/commit/c687f642ced738123787c9269e516fa4be44df95))

## [3.4.1](https://github.com/terrancemacgregor/envrizz/compare/v3.4.0...v3.4.1) (2026-05-30)


### Bug Fixes

* use absolute GitHub URLs for README images ([cf7d3e6](https://github.com/terrancemacgregor/envrizz/commit/cf7d3e68962fdbc1282cf4d02ed059221a0f0f51))

# [3.4.0](https://github.com/terrancemacgregor/envrizz/compare/v3.3.3...v3.4.0) (2026-05-30)


### Features

* use envrizz.json comments as single source of truth for .env.example ([85cbeac](https://github.com/terrancemacgregor/envrizz/commit/85cbeac1132c8869de6438fe0a11e4bc8396bb72))

## [3.3.3](https://github.com/terrancemacgregor/envrizz/compare/v3.3.2...v3.3.3) (2026-05-30)


### Bug Fixes

* list source files in .env.example header, remove redundant filename ([c2c66a7](https://github.com/terrancemacgregor/envrizz/commit/c2c66a7ae98af1bbf589c72007fad9015cbd4979))

## [3.3.2](https://github.com/terrancemacgregor/envrizz/compare/v3.3.1...v3.3.2) (2026-05-30)


### Bug Fixes

* add blank comment placeholders and timestamp to .env.example ([760a5ea](https://github.com/terrancemacgregor/envrizz/commit/760a5ea3151b53beb23a21b5262099dcf12e2775))

## [3.3.1](https://github.com/terrancemacgregor/envrizz/compare/v3.3.0...v3.3.1) (2026-05-30)


### Bug Fixes

* generate-example carries over comments from source .env files ([e8d907a](https://github.com/terrancemacgregor/envrizz/commit/e8d907a1cfb0ead71ee832efae27ee9f75b9d625))

# [3.3.0](https://github.com/terrancemacgregor/envrizz/compare/v3.2.0...v3.3.0) (2026-05-30)


### Features

* add diff command to compare keys across .env files ([d04e9f5](https://github.com/terrancemacgregor/envrizz/commit/d04e9f557d337c2563794c9100de703fff4b4f72))

# [3.2.0](https://github.com/terrancemacgregor/envrizz/compare/v3.1.0...v3.2.0) (2026-05-30)


### Features

* init installs pre-commit hook to auto-generate .env.example ([445c408](https://github.com/terrancemacgregor/envrizz/commit/445c408f914dca328f271c6c38d17737f694b826))

# [3.1.0](https://github.com/terrancemacgregor/envrizz/compare/v3.0.8...v3.1.0) (2026-05-30)


### Features

* add generate-example command to create .env.example ([1289949](https://github.com/terrancemacgregor/envrizz/commit/12899498896f4571c2953c9b15dc89740c61c65b))

## [3.0.8](https://github.com/terrancemacgregor/envrizz/compare/v3.0.7...v3.0.8) (2026-05-30)


### Bug Fixes

* replace emojis with Unicode symbols in CLI output ([2480c8d](https://github.com/terrancemacgregor/envrizz/commit/2480c8dbcd46a0554467d52361eb408c547a95b1))

## [3.0.7](https://github.com/terrancemacgregor/envrizz/compare/v3.0.6...v3.0.7) (2026-05-30)


### Bug Fixes

* init adds env:push and env:pull scripts to package.json ([8d96372](https://github.com/terrancemacgregor/envrizz/commit/8d9637238edc7a35a32a9061ec3cf943ce152a4b))

## [3.0.6](https://github.com/terrancemacgregor/envrizz/compare/v3.0.5...v3.0.6) (2026-05-30)


### Bug Fixes

* init writes full config, exclude filter works, AWS link after push ([adb0432](https://github.com/terrancemacgregor/envrizz/commit/adb0432960f9be61358ae7f529d17fc762be25ec)), closes [#1](https://github.com/terrancemacgregor/envrizz/issues/1) [#4](https://github.com/terrancemacgregor/envrizz/issues/4) [#3](https://github.com/terrancemacgregor/envrizz/issues/3)

## [3.0.5](https://github.com/terrancemacgregor/envrizz/compare/v3.0.4...v3.0.5) (2026-05-29)


### Bug Fixes

* strip dev-only fields from published package.json ([4350d90](https://github.com/terrancemacgregor/envrizz/commit/4350d90095282a66c7f78992c7e0cbca78ee57a8))

## [3.0.4](https://github.com/terrancemacgregor/envrizz/compare/v3.0.3...v3.0.4) (2026-05-29)


### Bug Fixes

* read version from package.json instead of hardcoded string ([afc3255](https://github.com/terrancemacgregor/envrizz/commit/afc32551db40b3ce745b5231181c0a552ed9a286))

## [3.0.3](https://github.com/terrancemacgregor/envrizz/compare/v3.0.2...v3.0.3) (2026-05-29)


### Bug Fixes

* add npm audit to pre-push hook instead of CI ([ce3f56c](https://github.com/terrancemacgregor/envrizz/commit/ce3f56c741a24c1bc78d9b23dcde4e9ce9c5eb5b))

## [3.0.2](https://github.com/terrancemacgregor/envrizz/compare/v3.0.1...v3.0.2) (2026-05-29)


### Bug Fixes

* add npm security audit to release workflow ([a8e8dad](https://github.com/terrancemacgregor/envrizz/commit/a8e8dad0c0647c26795568b42238cb71ab8d1670))

## [3.0.1](https://github.com/terrancemacgregor/envrizz/compare/v3.0.0...v3.0.1) (2026-05-29)


### Bug Fixes

* remove deprecated glob dependency and rename config file ([fc4a3b8](https://github.com/terrancemacgregor/envrizz/commit/fc4a3b86e0b9e7ad3b3a9e21d54cccc76c74ab6a))

# [3.0.0](https://github.com/terrancemacgregor/envrizz/compare/v2.0.4...v3.0.0) (2026-05-15)


### Bug Fixes

* move AWS SDK to peer dependencies ([af1a703](https://github.com/terrancemacgregor/envrizz/commit/af1a703876a61a904e605b33d159c43fdf5bb5be))


### BREAKING CHANGES

* @aws-sdk/client-secrets-manager and
@aws-sdk/credential-provider-sso are now peer dependencies.
Users must install them separately. This ensures envrizz always
uses the host project's AWS SDK version, eliminating duplicate
installs and inherited vulnerabilities from stale SDK versions.

## [2.0.4](https://github.com/terrancemacgregor/envrizz/compare/v2.0.3...v2.0.4) (2026-05-15)


### Bug Fixes

* add security policy, engines field, and npm provenance ([1b27d33](https://github.com/terrancemacgregor/envrizz/commit/1b27d33298c2d32137dc43a37b8b662bdc09ab7d))

## [2.0.3](https://github.com/terrancemacgregor/envrizz/compare/v2.0.2...v2.0.3) (2026-05-15)


### Bug Fixes

* update dependencies to resolve security vulnerabilities ([9a31f65](https://github.com/terrancemacgregor/envrizz/commit/9a31f659ada85829b9e05f712ce075e601f35000))

## [2.0.2](https://github.com/terrancemacgregor/envrizz/compare/v2.0.1...v2.0.2) (2025-11-30)


### Bug Fixes

* switch to OIDC trusted publishing, remove token auth ([e262fb5](https://github.com/terrancemacgregor/envrizz/commit/e262fb5eacd334fb9453e2d201b12cb620381688))

## [2.0.1](https://github.com/terrancemacgregor/envrizz/compare/v2.0.0...v2.0.1) (2025-11-30)


### Bug Fixes

* add .npmrc for CI token auth ([3c0af91](https://github.com/terrancemacgregor/envrizz/commit/3c0af910543034b9fd3002e9ce1df0bf3ada16b2))

# [2.0.0](https://github.com/terrancemacgregor/envrizz/compare/v1.0.1...v2.0.0) (2025-11-30)


### Bug Fixes

* exclude dev files from npm package with files whitelist ([1b88d0e](https://github.com/terrancemacgregor/envrizz/commit/1b88d0e402eccfe60d328f2631f4b0d8b53810eb))
* trigger release after Node 22 update ([f5176b7](https://github.com/terrancemacgregor/envrizz/commit/f5176b72ce2d497f361412f6ec2386968c650c0d))
* update GitHub Actions to Node 22 for semantic-release ([bcbe7a1](https://github.com/terrancemacgregor/envrizz/commit/bcbe7a188eff1b0476f2d50cd846ea064a89e123))


### Features

* implement semantic-release for automated versioning ([3ffda61](https://github.com/terrancemacgregor/envrizz/commit/3ffda614a964281709458bb9816faf604c052203))


### BREAKING CHANGES

* Commits must now follow conventional format
