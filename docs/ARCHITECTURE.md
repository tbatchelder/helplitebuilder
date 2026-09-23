# HelpLite Builder — Architecture

A practical map of the codebase: what lives where, and how data
actually flows. For _why_ things are built this way, see
[`decisions/architecture.md`](./decisions/architecture.md) — that's
the chronological decision log; this is the "orient yourself here"
doc.

## Folder structure

```
bin/
└── helplite-builder.js   # the CLI entry point. Dispatches `init` and
                            # `build`. Guarded behind
                            # `require.main === module` -- requiring
                            # this file never runs anything.

src/
├── build.js               # exports buildHelp({ sourceFile, outputDir }).
│                           #   Reads the source file, hands its text to
│                           #   parse.js, writes what comes back. Its own
│                           #   CLI entry (console.error/process.exit) is
│                           #   also require.main-guarded.
├── init.js                # exports initHelp({ targetDir, force }).
│                           #   Scaffolds help-source/help.md from
│                           #   templates/help.md.
├── parse.js                # parseHelpSource(content) -- a PURE function.
│                           #   Text in, a parsed structure out, or a
│                           #   thrown HelpBuildError. No fs, no process.
│                           #   This is where the actual directive/
│                           #   fence/indentation logic lives.
├── errors.js                # HelpBuildError -- the one error type shared
│                           #   by the parser, the validators, and both
│                           #   CLI entry points.
├── paths.js                 # resolvePaths(root) -- the one place output
│                           #   paths get resolved. Every writer and both
│                           #   CLI entries go through this.
├── html.js                  # escapeHtml(), findTitle() -- shared, not
│                           #   specific to any one build type.
├── markdown.js               # renderMarkdown() -- wraps `marked`, adds
│                           #   heading ids (marked doesn't by default).
├── validation/
│   ├── validateBuild.js      # allowlist DERIVED from src/builders/'s
│   │                         #   registry keys -- not hand-maintained.
│   ├── validateLink.js
│   ├── validateTooltips.js
│   └── validatePageContext.js
├── writers/
│   ├── writeHtml.js           # looks up the right builder by buildType,
│   │                         #   writes what it returns.
│   ├── writeTooltips.js
│   └── writePageContext.js    # also removes stale .html files under
│                             #   help/pages/ that weren't written this run.
└── builders/
    ├── index.js                # the registry: @build() string -> builder
    │                          #   function. One line per type.
    └── standard.js              # the only build type that exists so far.
                                # A builder is a pure function:
                                # { title, body, cssPath } -> HTML string.
                                # No fs access.

templates/
└── help.md                  # what `init` copies into a fresh project's
                              #   help-source/help.md. Tracked, ships with
                              #   the package.

examples/
└── example.md                # an adversarial reference file exercising
                              #   every syntax edge case at once. Tracked,
                              #   but never read by any code path --
                              #   documentation-by-example only.

test/                        # roughly one file per src/ file it covers,
│                             #   plus:
├── bin.test.js                # process-level tests for BOTH CLI commands
│                             #   (spawnSync, not just importing modules)
├── cli.test.js                # process-level tests for build.js's own
│                             #   CLI entry specifically
└── builders/
    ├── registry.test.js        # the contract test -- loops over every
    │                          #   registered builder automatically
    └── standard.test.js         # standard-specific behavior
```

Not tracked, and won't appear in a fresh clone: `help-source/` (a
developer's own working file) and `help/` (generated output) — both
gitignored, everywhere, because both are fully regenerable. See
[`decisions/architecture.md`](./decisions/architecture.md) for why.

## How a build actually flows

1. `bin/helplite-builder.js build` (or `buildHelp()` called directly)
   reads `help-source/help.md` off disk as plain text.
2. That text goes to `parse.js`'s `parseHelpSource()` — a pure
   function. It walks the file once, line by line, tracking whether
   it's currently inside a `@tt`/`@pc` block and whether it's
   currently inside a fenced code block (and which fence character
   opened it). Directives and comments are only recognized at column
   zero. Everything not consumed by a directive becomes either a
   tooltip entry, a page-context entry, or a line of global markdown.
   Any malformed input (an invalid name, a duplicate, an unterminated
   block, an unknown `@build()` value) throws a `HelpBuildError`
   immediately — nothing partial gets written.
3. `parse.js` returns `{ buildType, cssPath, tooltips, pageContexts,
markdownLines }` to `build.js`.
4. `build.js` resolves output paths once via `resolvePaths()` and
   hands the parsed structure to the three writers:
   - `writeTooltips()` writes `help/fields/tooltips.json` directly —
     no rendering needed, it's already just name/text pairs.
   - `writePageContext()` renders each page context's markdown lines
     to HTML via `renderMarkdown()` and writes one file per page under
     `help/pages/`, then deletes any `.html` file in that folder that
     wasn't written this run.
   - `writeHtml()` renders the global markdown to HTML, escapes the
     title and css path, looks up the right builder function by
     `buildType` in the registry, and writes whatever HTML string that
     builder returns to `help/help.html`.

## The builder registry

`src/builders/index.js` maps a `@build()` string to a function. A
builder receives `{ title, body, cssPath }` — all three already
rendered and already escaped by `writeHtml` — and returns a complete
HTML document string. It never touches the filesystem itself; writing
the file is `writeHtml`'s job, not the builder's.

`validateBuild.js` derives its allowlist from `Object.keys(builders)`
rather than maintaining a separate list, so an `@build()` value is
valid if and only if a builder is actually registered for it — the
two literally cannot drift apart.

Adding a new build type means adding one file (or folder, if it needs
its own JS/assets — see `decisions/architecture.md`) to
`src/builders/` and one line to the registry. See the "Adding a build
type" section of `CONTRIBUTING.md` for what a PR doing that actually
needs to include.

## Testing

- `parse.js` is tested directly with string literals — no filesystem,
  no temp directories needed, since it touches neither.
- `build.js`, `init.js`, and the three writers are tested against real
  `fs.mkdtempSync` temp directories, not mocked filesystem objects.
- Both CLI entry points (`bin/helplite-builder.js` and `build.js`'s own
  entry) are additionally tested at the process level via
  `child_process.spawnSync` — the only honest way to cover code that's
  deliberately unreachable by importing the module, since that's the
  entire point of the `require.main === module` guard.
- The builder registry has a generic contract test
  (`test/builders/registry.test.js`) that runs automatically against
  whatever's currently registered, plus type-specific tests per
  builder (`test/builders/standard.test.js`).
- Known, accepted coverage gap: `build.js`'s CLI entry block shows as
  uncovered in `npm run test:coverage`'s report despite being
  functionally tested — v8's coverage instrumentation doesn't reach
  into a `spawnSync`'d child process. The behavior is verified; the
  percentage just can't see it without cross-process coverage merging,
  which hasn't been judged worth setting up.
