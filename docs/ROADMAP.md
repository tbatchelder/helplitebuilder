# HelpLite Builder — Roadmap

Status board, not a decision log — see
[`decisions/architecture.md`](./decisions/architecture.md) for the
_why_ behind anything here.

**"v1"/"v2"/"v3" below are milestone labels, not npm version
commitments.** The package itself stays on `0.x` deliberately (see
`decisions/naming.md` and the versioning discussion in project
history) — semver's own convention for "the contract can still
change without a major bump," which is genuinely true right now.
Whether `sidebar`/`hamburger` ("v2"/"v3" here) end up warranting an
actual major version bump depends on whether their parser changes
turn out to be additive or breaking — something that won't be known
until they're actually built, the same reason a plugin API and
forced builder-folder structure were both deferred rather than
designed speculatively. Don't read a milestone number here as a
promise about the eventual package version.

## v1 — Built and verified

- Parser (`src/parse.js`): fence-aware, preserves markdown
  indentation/nesting, column-zero-only directives and comments,
  throws on unterminated blocks instead of silently swallowing the
  rest of the file.
- All four directives: `@build(type)`, `@link(path.css)`, `@tt`/`@ett`
  tooltip blocks, `@pc`/`@epc` page-context blocks.
- `@build(type)` implemented as a builder registry (`src/builders/`) —
  extensible internally, closed to end users, PR-gated. `standard` is
  the only build type that exists so far.
- Testability refactor complete: `parse.js` is a pure function, `build.js`
  exports a parameterized `buildHelp()`, `init.js` was built the same
  way from the start, both CLI entry points guarded behind
  `require.main === module`.
- CLI: `helplite-builder init` and `helplite-builder build`, both
  verified against a real packed-and-installed tarball, not just
  source-in-place — including chaining `build` into an existing,
  unrelated, more complex build pipeline (a real copy of PrefKeeper's
  `tsup`-based `package.json`) and confirming both run cleanly back to
  back.
- `package.json` `files` allowlist — published package trimmed from 46
  files/46.8kB down to 21/11.4kB after a real install was found
  shipping `test/`, `docs/`, `.github/`, and even `package-lock.json`
  into a consumer's `node_modules`.
- Test suite: 100+ Vitest tests across the parser, all four validators,
  all three writers, the builder registry (both a generic contract
  test and `standard`-specific tests), and both CLI entry points
  (via real `child_process.spawnSync`, not just importing the
  modules). ~97% statement coverage, with the remaining gaps
  explicitly identified and either accepted (a known cross-process
  coverage-tooling limitation) or deferred to open-source tickets
  rather than chased for their own sake.
- CI (GitHub Actions: format check, test) and issue/PR templates in
  place, including a checklist item specifically for build-type
  changes.

## Immediate next steps

- [x] GitHub repo made public.
- [ ] Real `npm publish`. `package.json`'s `private` flag is now
      `false` — nothing technical blocks this anymore — but it's
      being held deliberately until HelpLite exists and this has had
      some real-world use beyond local testing. Staying on `0.1.0`
      until then is the same decision, not a separate one.
- [ ] HelpLite itself, the package that actually consumes
      `help/help.html`, `help/pages/*.html`, and
      `help/fields/tooltips.json` — a separate, not-yet-started
      project. HelpLite Builder's own v1 doesn't depend on it existing,
      but it's the reason this package exists.

## v2 / v3 — new build types

- **`sidebar`** — persistent side navigation for the global help page.
  Will likely need `src/parse.js` changes first (page order, page
  titles) before the builder itself can be written, since the parser
  doesn't currently produce that data.
- **`hamburger`** — collapsible nav behind a toggle button. First real
  build type expected to need its own JS — plan is a folder
  (`src/builders/hamburger/`) holding the builder function, a real
  standalone `.js` asset, and a throwaway `demo.html` for manual
  browser click-testing, inlined into the generated page via
  `fs.readFileSync` at build time (see `decisions/architecture.md`).
- Either one becoming real is also what will finally justify designing
  a genuine plugin API, if one ever gets built — deliberately not
  designed speculatively ahead of a second real build type existing to
  test the contract against.

## Ideas, not yet planned

- Static JS asset delivery (`<script src="...">` writing a real file
  into `help/`, instead of always inlining) — worth it once a
  builder's script is big enough to want browser caching or real lint/
  test tooling as its own file; not needed for anything that exists
  today.
- CI check that fails if `npm pack`'s file count regresses — catching
  a repeat of the `files`-allowlist issue automatically instead of by
  someone noticing during a real install again.
