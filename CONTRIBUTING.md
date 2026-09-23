# Contributing to HelpLite Builder

## Getting started

```bash
git clone https://github.com/tbatchelder/helplite-builder.git
cd helplite-builder
npm install
npm test
```

All tests should pass on a clean install. If they don't, that's worth
reporting before anything else.

## Development workflow

```bash
npm test              # run the full test suite
npm run test:watch    # same, but watches for changes
npm run test:coverage # full suite + a coverage report
npm run format        # apply Prettier
npm run format:check  # check formatting without changing anything (what CI runs)
npm run build-help    # run this package's OWN build, against its own
                       #   help-source/help.md -- useful for manually
                       #   checking output while developing the parser
                       #   or a writer, not part of the published package
```

## Testing philosophy

This project prefers **real verification over mocks** wherever
practical:

- `test/build.test.js`, `test/init.test.js`, and `test/writers.test.js`
  all run against real `fs.mkdtempSync` temporary directories, not
  mocked filesystem objects.
- `test/cli.test.js` and `test/bin.test.js` actually spawn `node
bin/helplite-builder.js` / `node src/build.js` as real child
  processes via `child_process.spawnSync`, rather than only importing
  the modules and calling their exported functions. Both CLI entry
  points are deliberately unreachable by importing the module (see
  `docs/decisions/architecture.md`), so this is the only honest way to
  cover that code at all.
- Real bugs this project has already found were only caught this way:
  a `writeHtml` call that never created its own output directory (only
  appeared to work because of writer call order), a stale page-context
  file left behind after a rename, an unescaped css path breaking
  generated markup, a starter template using syntax the parser could
  no longer actually parse.
- **If you're touching packaging** (`package.json`'s `files`/`bin`
  fields, anything under `bin/`, or how `init`/`build` resolve paths),
  the bar is: does this survive a real `npm pack`, installed into a
  genuinely separate, freshly created project? Not "does it look
  right" or "does the unit test pass." A real published-package bug
  (`package-lock.json` and the entire `test/`/`docs/`/`.github/`
  folders shipping into every consumer's `node_modules`) was only ever
  found this way, not by inspection.

```bash
npm pack
```

Then, in a **completely separate, freshly created folder**:

```bash
npm init -y
npm install /path/to/helplite-builder/helplite-builder-<version>.tgz
npx helplite-builder init
npx helplite-builder build
```

**Gotcha worth knowing up front:** if you re-pack after a change and
reinstall into a project you've already used before, npm can silently
reuse a cached/stale version instead of picking up your new tarball.
If something seems to still be running old code after a change, don't
debug the code first — delete `node_modules` and `package-lock.json`
in the test project and reinstall clean, or just use a brand new
folder each time.

## Code style

Prettier config lives in `.prettierrc.json` (single quotes, no
trailing commas, 2-space indent, LF line endings — set explicitly
after a real mixed-line-ending problem showed up from files edited on
different machines). Run `npm run format` before committing — CI runs
`format:check` and will fail on unformatted code.

## Scope

Read [`docs/SCOPE.md`](./docs/SCOPE.md) before proposing a feature.
HelpLite Builder deliberately covers exactly one job — compiling
`help-source/help.md` into the three files HelpLite consumes — and
explicitly does not render, search, sanitize, or let an end user
register their own build type at runtime. Seeing why that boundary
matters is worth reading before opening an issue that falls outside
it.

## Where things live

[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) is a practical map of
the codebase — what's where, how a build actually flows.
[`docs/decisions/architecture.md`](./docs/decisions/architecture.md)
is the _why_ behind specific choices, including real bugs found and
how they were fixed — worth searching before re-deciding something
that's already been through this once.

## Adding a build type

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
- If the new type needs its own JS, see `docs/decisions/architecture.md`
  for the intended pattern (a real standalone `.js` asset,
  `fs.readFileSync`'d and inlined at build time — not a new directive,
  not a copy-pasted template string).

A PR that adds a build type without its own tests will be rejected —
the registry contract test proves the new type doesn't crash, it
doesn't prove it does the right thing.

## Pull requests

See the PR template for the checklist. In short: tests pass, code is
formatted, and if you touched parsing or a build type, you've tested
it against something harder than the happy path — a fenced code block,
a nested list, a duplicate name, an unterminated directive.
