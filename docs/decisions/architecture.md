# HelpLite Builder — Architecture Decisions

A running log of decisions made during design/development, and why.
Add new entries at the bottom as decisions get made or revisited.

Naming rationale has moved to [`naming.md`](./naming.md); the
in-scope/out-of-scope boundary has moved to [`../SCOPE.md`](../SCOPE.md).

---

## Core architecture

- **Separate package from HelpLite, not a mode inside it.** HelpLite
  Builder compiles `help-source/help.md` into the files HelpLite
  consumes; it never runs in the browser and never ships to an end
  user, only its generated output does. This is deliberate, not
  incidental — every feature that could be tempting to bolt onto
  HelpLite's runtime (navigation generation, search indexing,
  sanitization) instead lives here, at build time, in a tool nobody
  downloads. Complexity at build time is free; complexity at runtime
  is downloaded by every visitor forever.
- **An in-project build tool, not a standalone CLI or a runtime
  compiler.** A developer wires `helplite-builder build` into their
  own `npm run build` so help regenerates automatically on every
  build, the same way any other asset-generation step would. Runtime
  compilation (parsing `help.md` inside the running app) was ruled out
  early — it would mean shipping the parser itself to every visitor,
  exactly the "lite" HelpLite is supposed to stay.
- **V1 syntax: markdown plus four directives.** `@build(type)` at the
  top of the file, `@link(path.css)`, a `@tt` … `@ett` tooltip block,
  and a `@pc` … `@epc` page-context block. See
  [`naming.md`](./naming.md) for why the directives themselves are
  kept to 3 characters or less, and why the block-with-pipes form
  replaced an earlier per-item form.
- **Tooltips are deliberately one line each.** This is "lite" help —
  a short answer to "what is this field," not full custom
  documentation per field.
- **Output structure:** `help/help.html` (global), `help/pages/
<name>.html` (per-page context), `help/fields/tooltips.json` (every
  tooltip, names required to be unique site-wide since HelpLite looks
  them up by name alone). Both the global help page and page-context
  panels render to real HTML via `marked` rather than shipping raw
  markdown text, so HelpLite only ever has to load and display,
  never parse.
- **Search stays a HelpLite runtime responsibility.** A generated
  search index was considered for this package and explicitly
  deferred — it's a HelpLite concern, not a build-time one, since
  search needs to operate over whatever's currently loaded, not a
  static snapshot.

## The parser: from a naive line-by-line pass to something fence-aware

The original parser trimmed every line before doing anything else,
which served directive/comment detection well (matching `@tt` with or
without stray whitespace) but destroyed markdown block structure in
the process — a nested list flattened to siblings, an indented code
block lost its indentation entirely, and a `//` comment or a bare
`@tt` typed inside a fenced code sample got misread as a real
directive because the parser had no concept of "currently inside a
fence" at all.

The fix split detection from storage: **detect on a normalized copy of
each line, store the raw line.** A second piece of state — whether the
parser is currently inside a fenced code block, and which fence
character opened it — means nothing inside a fence is ever
reinterpreted as markdown syntax, and a `~~~` fence can safely contain
a ` ``` ` without prematurely closing. Directives and comments were
additionally restricted to column zero, which for free also protects
a four-space-indented code block (which has no fence to detect it by)
from having its own `//` comment misread.

An unterminated block — a missing `@ett`, `@epc`, or closing fence —
now throws instead of silently swallowing the rest of the file into
the wrong parsing mode, which previously could produce an empty
`help.html` with no warning at all.

## Testability: `parse.js` split out as a pure function

`build.js` originally did everything — read the file, parse it,
validate it, write output — as code running at module scope the
moment the file was `require`d, with every validator calling
`process.exit(1)` directly on bad input. Neither is testable:
importing the module _was_ running a real build against whatever was
in `process.cwd()`, and a failing-input test would take the whole test
runner down with it instead of letting anything assert on the error.

`src/parse.js` now holds the entire parsing loop as a pure function —
markdown text in, a parsed structure out, or a thrown `HelpBuildError`
— touching no filesystem and no `process` at all. `build.js` shrank to
what it should always have been: read the file, hand the text to the
parser, write what comes back, exported as `buildHelp({ sourceFile,
outputDir })` rather than a side-effecting script. The CLI's
`console.error`/`process.exit` behavior lives behind `if
(require.main === module)`, so requiring the module never triggers it
— verified directly, not just assumed, by requiring the module fresh
in a throwaway process and confirming no `help/` directory appeared.

All four validators throw `HelpBuildError` instead of calling
`process.exit` directly, for the same reason. `HelpBuildError` exists
as one distinct class specifically so every CLI entry point (there are
now two — `build` and `init`) can tell "print this message and exit 1"
apart from "this is a real bug or filesystem problem, let it propagate
with its stack trace." A missing source file, for instance,
deliberately surfaces as a plain `ENOENT`, not a `HelpBuildError` —
swallowing an unexpected failure into a tidy one-line message would
hide exactly the information needed to diagnose it.

`src/init.js` was built the way `build.js` should have been from day
one: a real, parameterized `initHelp({ targetDir, force })` from the
start, no retrofit required.

## Shared path resolution

`src/paths.js` exports one `resolvePaths(root)` function that every
writer and both CLI entry points resolve output paths through.
Previously each writer called `path.join(process.cwd(), 'help', ...)`
independently — the output location was defined in three places, and
that's also specifically what made the writers impossible to point at
a temp directory in a test.

## Writers: three real bugs found by actually running the code

- **`writeHtml` never created its own output directory.** It only
  appeared to work because `writeTooltips` happened to run first and
  created `help/` as a side effect of creating `help/fields/`. A
  source file with no tooltips and no page contexts crashed with an
  uncaught `ENOENT`, entirely dependent on writer call order. Each
  writer now creates what it needs.
- **`writePageContext` never removed stale output.** Renaming a page
  context from `contacts` to `oldcontacts` left `contacts.html`
  sitting in the output folder forever — generated, but no longer
  matching anything in the source, and HelpLite would have no way to
  know it was dead. The writer now deletes any `.html` file under
  `help/pages/` that wasn't written in the current run, deliberately
  scoped to just that folder and just that extension so nothing a
  developer placed there by hand (an image, a `.gitkeep`) is ever
  touched.
- **`cssPath` and the page title were interpolated into the generated
  HTML unescaped.** A css path containing a `"` closed the `href`
  attribute early and produced broken markup. Both are now escaped via
  a shared `escapeHtml()` before reaching any template.

`marked` does not add `id` attributes to headings by default (checked
directly against the installed version, not assumed from memory) —
`src/markdown.js` adds a custom heading renderer that slugifies each
heading into an id, with duplicate headings numbered (`overview`,
`overview-1`) since several pages can legitimately share a heading
like "Overview." This exists because every planned V2/V3 navigation
feature — a table of contents, an in-app deep link, a "back to top" —
needs something to target, and retrofitting ids after the fact would
mean revisiting every existing output.

## `@build(type)`: a registry, not a plugin API

`@build(type)` selects which layout the global help page is generated
with. The implementation is a registry — `src/builders/`, one file per
type, `src/builders/index.js` as the single lookup table — rather than
a runtime API letting an end user register their own build type from
outside this repo.

This was a deliberate choice, not an oversight. A `@build()` value
typed into someone's `help.md` is untrusted input from the builder's
point of view. A new layout can require more than new HTML — a
sidebar build needs page order and titles for its own navigation,
which may not even exist yet in the parsed data shape — so adding one
can mean a `src/parse.js` change, not just a new template. That's a
much bigger contract to hand to an arbitrary string in a source file
than "pick one of these known, reviewed layouts." A real plugin API
was considered and explicitly deferred until a second real build type
(`sidebar`) exists to design the contract against — designing a
plugin signature now, before there's a concrete second consumer to
test it against, would be guessing at a shape that `sidebar` might
immediately prove wrong.

`src/validation/validateBuild.js`'s allowlist is derived from
`Object.keys(builders)` rather than hand-maintained, so the parser's
accepted `@build()` values and the builders that actually exist in the
registry can never drift apart — there's exactly one list, not two
that have to be kept in sync by hand.

**Builder contract:** a builder function receives already-rendered,
already-escaped `{ title, body, cssPath }` and returns a complete HTML
document string, touching no filesystem itself. Rendering markdown and
escaping the title/css path were pulled into shared modules
(`src/html.js`, `src/markdown.js`) specifically so no individual
builder ever has to think about escaping or rendering — it only
arranges already-safe pieces into a shell. `writeHtml` owns looking up
the right builder and all the actual `fs` work, the same as it does
for tooltips and page context.

**File vs. folder.** A builder can be a single file (`standard.js`
today) or grow into a folder (`src/builders/hamburger/` with its own
`index.js`, a real static `.js` asset, and a throwaway `demo.html` for
manual browser testing) — deliberately not decided in advance for
every future type. `require('./builders/x')` in Node resolves
identically whether `x` is a file or a folder with an `index.js`, so
nothing else in the codebase has to change the day a builder actually
needs to be more than one file. Forcing folder structure on every
builder today, before a second one exists to say what it needs, would
be the same premature-structure mistake as designing the plugin API
too early.

**How a builder brings in its own JS**, once one actually needs it: not
a new `@script()` directive. Unlike CSS — which a consumer supplies
via `@link`, a genuine external reference the builder never touches —
a build type's interactive behavior isn't something a consumer picks;
it's intrinsic to choosing that `@build(type)` in the first place. The
plan is to `fs.readFileSync` a real, standalone `.js` file (the same
file a developer opens directly in a browser via a throwaway
`demo.html` and `<script src="...">` to manually click-test) and inline
its contents into the generated page's `<script>` block at build
time — proven working end to end with a throwaway demo, byte-for-byte
identical output whether loaded via `<script src>` or inlined via
`readFileSync`, so there's exactly one authored copy of the logic and
no copy-paste drift between the tested version and the shipped one.

**Verified, not assumed:** a raw `<script>` tag placed directly inside
an author's `help.md` markdown content passes through `marked`
completely unescaped and would execute in a browser. This is unrelated
to the builder-JS mechanism above — it's just a real, checked fact
about the current pipeline (no sanitization exists anywhere in it).
Not treated as a bug: `help-source/help.md` is authored by a trusted
developer, not end-user input, the same way nobody sanitizes a
developer's own JS or CSS source files either.

## The registry contract test

`test/builders/registry.test.js` is a structural safety net under the
"you must add tests" rule below, rather than relying purely on a
reviewer remembering to check. It loops over `Object.keys(builders)`
— today just `standard`, automatically including whatever gets added
later — and holds every registered type to a generic baseline: doesn't
throw, returns a valid HTML document, includes the given title/body/
css path, is present in `validateBuild`'s allowlist. Explicitly a
floor, not a substitute: it proves a new builder doesn't crash, not
that it's correct. A PR adding a real build type still needs its own
type-specific test file (see the "Adding a build type" section of
`CONTRIBUTING.md`).

## The CLI: `init` and `build`

`bin/helplite-builder.js` is the single CLI entry point, dispatching
`init` and `build`, guarded the same way `build.js`'s own entry is
(`require.main === module`) so requiring the file never runs anything.

`build` deliberately passes no arguments to `buildHelp()`, relying
entirely on its existing defaults (`help-source/help.md` and `help/`,
both relative to `process.cwd()`) — correct specifically because when
this runs as part of a consumer's own `npm run build`,
`process.cwd()` _is_ their project root. This was proven for real, not
just reasoned about: packed via `npm pack`, installed fresh into a
separate test project, and chained as `"build": "helplite-builder
build && tsup"` into an actual copy of PrefKeeper's real, more complex
build pipeline (`prepublishOnly`, `postbuild`, everything) — confirmed
the help files generate correctly and PrefKeeper's own build runs
immediately after, completely undisturbed.

`init` refuses to overwrite an existing `help-source/help.md` unless
run with `--force`, and copies `templates/help.md` — read via
`__dirname`-relative path resolution, which correctly resolves inside
a consumer's own `node_modules/helplite-builder/` once installed as a
real dependency, the same way it resolves during local development.

## Packaging: the `files` allowlist

Discovered by actually installing the real published tarball into a
fresh project, not by inspection: without a `files` field in
`package.json`, `npm pack` included everything not gitignored — 46
files, including the entire `test/` folder, `docs/`, `.github/`,
`CONTRIBUTING.md`, and even `package-lock.json`, which ended up sitting
uselessly inside a consumer's `node_modules/helplite-builder/`. Adding
`"files": ["bin", "src", "templates"]` trimmed this to 21 files and
11.4kB — reverified end to end afterward (fresh install, `init`,
`build`) to confirm nothing that actually needs to ship was
accidentally excluded. `LICENSE.md` and `README.md` ship regardless of
this field; that's `npm`'s own behavior, not something declared here.

## `help-source/` and `help/`: gitignored, everywhere

Both this repo's own `help-source/` (used for local development and
testing) and `help/` (this repo's own generated output) are
gitignored, for the same reason they're meant to be gitignored in a
consumer's project: both are fully regenerable from source, and
tracking either would just be a second copy that can silently drift
from what a real build actually produces — which is exactly the kind
of staleness this project already caught once, when `templates/
help.md` was found still using an old, no-longer-parseable directive
syntax after the block-form syntax replaced it (see
[`naming.md`](./naming.md)). Only `templates/help.md` (what `init`
copies) and `examples/example.md` (a tracked, adversarial reference
file — not consumed by any code path, purely documentation-by-example)
are meant to ship or stay tracked.

---

## Open items (current, not historical)

- [ ] `sidebar` and `hamburger` build types — neither started. Each
      will likely need a `src/parse.js` change (page order, page
      titles) before the builder itself can be written.
- [ ] A real plugin API for third-party build types — deliberately not
      designed yet; revisit once `sidebar` exists to design the
      contract against.
- [ ] Static JS asset delivery (`<script src="...">` writing a real
      file into `help/`, rather than always inlining) — worth
      revisiting if a builder's script grows large enough to want
      browser caching or its own lint/test tooling as a standalone
      file.
- [ ] Cross-process coverage merging, so `build.js`'s CLI entry block
      stops showing as uncovered in `npm run test:coverage` despite
      being functionally tested via `spawnSync` in `test/cli.test.js`
      — judged not worth the setup cost right now.
- [ ] A handful of minor branch-coverage gaps (`markdown.js`,
      `paths.js`, a couple of edge branches in `parse.js`) explicitly
      deferred rather than chased to 100% — reasonable open-source
      ticket material, not release blockers.
- [ ] Real `npm publish` — currently blocked by `private: true` on
      purpose; also worth deciding the org-scoped rename
      (`@beam/helplite-builder`) before or after first publish, not
      urgent either way (see [`naming.md`](./naming.md)).
- [ ] HelpLite itself — the runtime package that actually consumes
      `help/help.html`, `help/pages/*.html`, and
      `help/fields/tooltips.json` — remains a separate, not-yet-built
      project.
