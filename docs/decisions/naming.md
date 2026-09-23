# Naming Decisions

## Package name: `helplite-builder`

Unscoped for now. The long-term plan is an org-scoped name
(`@beam/helplite-builder`) once a real npm organization exists for
BEAM Portal, but that's not urgent — `private: true` in `package.json`
blocks any accidental publish in the meantime, and renaming later is a
one-line change with no other consequences.

## Why "Builder" is a separate package from HelpLite at all

Not really a naming decision so much as the decision the name records:
HelpLite Builder and HelpLite are deliberately two different packages,
not one package with two modes. HelpLite Builder is a dev-time tool —
it never ships to an end user of whatever app installs it, only its
generated output does. HelpLite is the runtime piece that actually
displays that output. Keeping the name split in two makes that
boundary visible instead of implicit.

## Directive syntax: `@build`, `@link`, `@tt`/`@ett`, `@pc`/`@epc`

Kept to 3 characters or less on purpose, to minimize how much typing a
developer authoring `help.md` has to do — these are meant to be typed
constantly, not written once and forgotten.

The tooltip/page-context block syntax (`@tt` ... `name | text` ...
`@ett`) replaced an earlier per-item form (`@tt(name)` on one line,
text on the next) specifically because writing one directive per
tooltip got tedious fast with more than a handful of them. The
block-with-pipes form was a direct response to that friction, not a
speculative design choice.

## `help-source/` vs `help/` vs `templates/` vs `examples/`

Four folders that are easy to mix up, so worth naming precisely:

- **`help-source/`** — a developer's own working file
  (`help-source/help.md`). Gitignored, both in this repo and in a
  consumer's own project, because it's the input a developer edits by
  hand, not something either project's history needs to track.
- **`help/`** — the builder's generated output. Also gitignored,
  everywhere, for the same reason `dist/` is gitignored in most
  projects: it's fully regenerable from `help-source/`, so tracking it
  would just be a second copy that can drift from the real source.
- **`templates/help.md`** — the one file `init` copies into a fresh
  project's `help-source/help.md`. This one IS tracked and ships with
  the package (see the `files` field in `package.json`) — it has to,
  since `init` reads it off disk at runtime.
- **`examples/example.md`** — a deliberately adversarial reference
  file exercising every syntax edge case at once (nested lists, fenced
  and indented code blocks, duplicate headings, a tilde fence
  containing a backtick fence). Also tracked, for a different reason
  than `templates/help.md`: it's not something `init` ever copies
  anywhere, it's documentation-by-example for a developer trying to
  understand what the syntax actually allows, referenced from the
  README rather than consumed by any code path.

## Error type: `HelpBuildError`

One error class, not two, even though it now covers two kinds of
problem — a malformed `help.md` source file, and a CLI usage conflict
like `init` refusing to overwrite an existing file. Both are "the
user's to fix, not the builder's," and both get the same treatment (a
clean one-line `[ERROR]` message and exit 1, versus letting anything
else propagate with a real stack trace), so one shared name was kept
rather than introducing a second class purely for a naming nicety.
