# HelpLite Builder — Scope

## What HelpLite Builder does

Compiles exactly one input — a developer's own `help-source/help.md`,
a modified-markdown source file — into exactly three kinds of output:

- **A global help page** (`help/help.html`) — plain markdown, rendered
  to HTML, laid out according to whichever `@build(type)` was chosen.
- **Page-context help panels** (`help/pages/<name>.html`), one per
  named page in a `@pc` block.
- **A single tooltip file** (`help/fields/tooltips.json`), holding
  every `@tt` entry across the whole source file.

It also ships a small CLI (`init` to scaffold a starter file, `build`
to compile it) meant to be run locally and chained into a developer's
own build pipeline.

That's the whole job. Four directives (`@build`, `@link`, `@tt`/`@ett`,
`@pc`/`@epc`), three output shapes, nothing else.

## What HelpLite Builder explicitly does not do

- **Display anything.** HelpLite Builder never runs in a browser and
  never ships to an end user of whatever app installs it — only the
  three files it generates do. Rendering, navigating, and showing help
  to an actual user is entirely HelpLite's job, a separate package.
- **Search.** A generated search index was considered here and
  explicitly deferred to HelpLite, which operates on whatever's
  currently loaded at runtime — not something a static build-time
  snapshot can correctly serve.
- **Sanitize author-supplied content.** A raw `<script>` tag typed
  directly into `help.md` passes through unescaped and will execute
  wherever the generated page is opened. This is deliberate, not an
  oversight: `help-source/help.md` is written by a trusted developer,
  the same as any other source file in their project, not by an
  end user of the app they're building. Sanitizing it would also
  defeat the point of letting a future build type embed real
  interactive behavior in its own output.
- **Let an end user (an npm consumer) add their own `@build()` type at
  runtime.** Every build type ships as part of this package, reviewed
  through a PR — see `CONTRIBUTING.md`. There is no plugin API, and
  extending the registry from outside this repo isn't supported.
- **Wire its own output into a consumer's actual served app.** A
  developer decides how `help/` gets served (a static route, copied
  into a public folder, whatever fits their framework) — that
  decision belongs entirely to their project and to HelpLite, not to
  this tool.

## Why this boundary matters beyond scope creep

Every feature this project could be tempted to add directly — a nav
generator, a search index, HTML sanitization, a plugin system for
arbitrary build types — is also a feature that would either ship
extra code to every visitor of the consuming app (the opposite of
"lite"), or hand an untrusted string in someone's source file more
power than it should have.

Keeping HelpLite Builder narrowly scoped to "markdown in, three
specific file types out" is what keeps HelpLite genuinely lite on the
runtime side, and what keeps this package's own surface small enough
to actually reason about. Complexity that belongs here happens once,
at build time, reviewed through a PR. Complexity that leaks into
HelpLite happens on every page load, for every visitor, forever.
