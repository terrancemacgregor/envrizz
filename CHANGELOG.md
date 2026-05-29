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
