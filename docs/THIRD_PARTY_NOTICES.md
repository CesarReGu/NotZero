# Third-party and asset review

This record documents the license and permission review for the submitted NotZero source tree. It is not a substitute for the license text supplied by each dependency.

## Application dependencies

The application declares its direct runtime and development dependencies in `package.json` and locks the complete dependency graph in `package-lock.json`. The repeatable check `npm run audit:licenses` verifies that every installed package exposes license metadata.

The July 19, 2026 audit inspected 496 installed packages. Every package reported a license. The dependency graph contained the following license identifiers:

| License | Packages |
|---|---:|
| MIT | 416 |
| Apache-2.0 | 26 |
| ISC | 19 |
| BSD-2-Clause | 11 |
| MPL-2.0 | 8 |
| BSD-3-Clause | 5 |
| MIT OR Apache-2.0 | 4 |
| CC0-1.0 | 2 |
| 0BSD | 1 |
| Apache-2.0 AND LGPL-3.0-or-later | 1 |
| BlueOak-1.0.0 | 1 |
| CC-BY-4.0 | 1 |
| Python-2.0 | 1 |

The less-permissive or attribution-sensitive entries are transitive build or platform packages. They include `@img/sharp-win32-x64`, `@resvg/resvg-wasm`, `@vercel/og`, `axe-core`, `lightningcss`, `satori`, and `caniuse-lite`. NotZero does not copy or modify their source. The repository distributes application source and its lockfile under MIT; installed packages retain their own licenses and notices.

## Fonts, icons, and media

- The interface uses operating-system font stacks. No font files are redistributed.
- Production icons are CSS or text-interface details authored for NotZero. No external icon pack is bundled.
- `public/og.png` was generated specifically for NotZero during the submission build. It contains no third-party photograph, logo, or trademark.
- The prepared Alex Rivera evidence fixture is fictional and was authored for this project.

## Market and technical sources

The market pack stores factual requirement labels, employer and role names, observation dates, and links. It does not reproduce job descriptions. Employer names, role titles, product names, and linked pages remain the property of their respective owners. Technical relationships summarize and link to official Docker, GitHub, and OpenTelemetry documentation. See `data/market/README.md` for the use record and limitations.

## Final review procedure

Before submitting a different commit, run `npm ci` and `npm run verify`. The July 19 release audit reported zero known npm vulnerabilities after updating the Cloudflare, Vite, Wrangler, Next, and related transitive build dependencies. Review any new package, dataset, image, font, icon, or copied text before updating this record.
