# Contributing to PrefKeeper

## Getting started

```bash
git clone https://github.com/tbatchelder/prefkeeper.git
cd prefkeeper
npm install
npm test
```

All 100+ tests should pass on a clean install. If they don't, that's
worth reporting before anything else — see
[`docs/decisions/architecture.md`](./docs/decisions/architecture.md)
for a running log of real environment-specific issues already found
(e.g. `typescript` needing to be an explicit devDependency, an npm v12
`allowScripts` gotcha with `esbuild`).

## Development workflow

```bash
npm test              # run the full test suite
npm run test:watch    # same, but watches for changes
npm run test:coverage # full suite + a coverage report
npm run format        # apply Prettier
npm run format:check  # check formatting without changing anything (what CI runs)
npm run build         # build dist/ + copy assets/panel.css (what a real publish does)
```

`npm run build` runs `tsup`, then a `postbuild` step
(`scripts/copy-assets.mjs`) that copies the bundled fonts and
`panel.css` into place. If you only run `tsup` directly and skip the
full `npm run build`, you'll get a `dist/` missing both.

## Testing philosophy

This project prefers **real verification over mocks** wherever
practical:

- `storage.test.js` uses a real in-memory `localStorage` stub (real
  `getItem`/`setItem` calls), not a mocked module.
- `setup.test.js` runs `scripts/setup.mjs`'s actual logic against real
  temporary directories (`fs.mkdtempSync`), not fake filesystem objects.
- Several real bugs this project has hit (a font-loading path that
  only broke under a real bundler, a CSS file silently missing from
  the actual published tarball, a symlink-resolution bug in the setup
  CLI) were only ever found by testing the **real, built, packaged
  artifact** — not by reasoning about the code, and not by unit tests
  alone. If you're touching packaging, the build pipeline, or anything
  in `scripts/`, the bar is: does this survive a real
  `npm run build && npm pack`, installed into a genuinely separate,
  clean project? Not "does it look right."

**Known, accepted gap:** the jsdom-based UI tests (`panel.test.js`,
`fonts.test.js`) verify _behavior_ — does clicking Save persist state,
does the dirty-status message update correctly — not _visual layout_.
jsdom doesn't do real CSS rendering. If you change anything in
`panel.css` or the flexbox/slider sizing logic, **test it in a real
browser** before considering it done. Playwright e2e coverage for this
is planned but not yet built (see `docs/ROADMAP.md`).

## Testing the actual npm package (not just the source)

If you change anything in `scripts/`, `package.json`'s `files`/`bin`/
`exports` fields, or anything font/CSS-delivery related:

```bash
npm run build
npm pack
```

Then, in a **completely separate, freshly created folder** (not one
you've used before for this):

```bash
npm init -y
npm install /path/to/prefkeeper/prefkeeper-<version>.tgz
npx prefkeeper-setup
```

**Gotcha worth knowing up front:** if you re-pack after making a
change and reinstall into a project you've already used before, npm
can silently reuse a cached/stale version instead of picking up your
new tarball. If something seems to still be running old code after a
change, don't debug the code first — delete `node_modules` and
`package-lock.json` in the test project and reinstall clean, or just
use a brand new folder each time. This has already cost real
debugging time more than once.

**Also worth knowing:** `localStorage` is scoped to the browser origin
(`http://localhost:PORT`, or a `file://` path), not to which version of
the package is installed. Old preference data from a previous test
session will keep showing up until you clear it yourself — that's
normal, not a bug.

## Code style

Prettier config lives in `.prettierrc.json` (single quotes, no
trailing commas, 2-space indent). Run `npm run format` before
committing — CI runs `format:check` and will fail on unformatted code.

## Scope

Read [`docs/SCOPE.md`](./docs/SCOPE.md) before proposing a feature.
PrefKeeper deliberately covers presentation only (color, text, motion,
focus) — never semantic HTML, ARIA, or alt text. This isn't an
oversight; seeing why it matters (and the accessibility-overlay
industry's history) is worth reading before opening an issue that
falls outside it.

## Where things live

[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) is a practical map of
the codebase — what's where, how a change actually flows through the
system. [`docs/decisions/architecture.md`](./docs/decisions/architecture.md)
is the _why_ behind specific choices, including real bugs found and
how they were fixed — worth searching before re-deciding something
that's already been through this once.

## Adding a build type

> **Note:** the rest of this document is still carried over from
> PrefKeeper (this project's sibling) and describes that project's
> workflow, not this one's. It hasn't had its own pass yet. This
> section is accurate for HelpLite Builder specifically; treat
> everything else here with suspicion until the full rewrite happens.

`@build(type)` in a `help.md` source file selects which layout the
global help page is generated with. Every valid type is a file in
`src/builders/` and one entry in `src/builders/index.js` (the
registry) — there is deliberately no way for an end user to register
their own build type from outside this repo. If you need a layout this
project doesn't have yet, that's a PR here, not a config option,
because a new layout can require more than new HTML (a sidebar build
needs page order and titles for its nav, for example) — that may mean
changes to the parser or the parsed data shape, not just a new
template.

If your PR adds or changes a build type, all of the following are
required, not optional:

- A file in `src/builders/` exporting a function matching the contract
  documented at the top of `src/builders/standard.js` (receives
  already-rendered, already-escaped `{ title, body, cssPath }`, returns
  a complete HTML document string, touches no filesystem).
- One line added to `src/builders/index.js`. You do **not** need to
  touch `src/validation/validateBuild.js` — its allowlist is derived
  from the registry automatically, so a type that exists in the
  registry is automatically valid, and one that doesn't isn't.
- `test/builders/registry.test.js` will start running its generic
  baseline checks against your new type automatically — no changes
  needed there. That test is a floor, not a substitute: also add a
  `test/builders/<type>.test.js` asserting on whatever is actually
  specific to your layout (nav markup, page ordering, whatever the
  point of the new type is).
- If the new type needs something the parser doesn't currently produce
  (page titles, page order, anything beyond markdown/tooltips/page
  context), that's a `src/parse.js` change with its own tests in
  `test/parse.test.js`, reviewed with the same scrutiny as the parser
  itself.

A PR that adds a build type without its own tests will be rejected —
the registry contract test proves the new type doesn't crash, it
doesn't prove it does the right thing.

## Pull requests

See the PR template for the checklist. In short: tests pass, code is
formatted, and if you touched UI or fonts, you've actually looked at
it in a real browser — not just trusted that jsdom passing means it
looks right.
