# HelpLite Builder

Compiles one modified-markdown source file into the global help page,
page-context help panels, and tooltip data that
[HelpLite](https://github.com/tbatchelder/helplite) consumes.

HelpLite Builder is a dev-time tool. It never ships to an end user of
your app — only the files it generates do. See
[`docs/SCOPE.md`](./docs/SCOPE.md) for exactly where its job stops.

<!-- 1. Badges right up top for project health -->
<p align="center">
  <img src="https://img.shields.io/npm/v/helplite-builder" alt="npm version" />
  <img src="https://github.com/tbatchelder/helplite-builder/actions/workflows/ci.yml/badge.svg" alt="CI Status" />
  <img src="https://img.shields.io/github/license/tbatchelder/helplitebuilder" alt="License" />
</p>

---

<!-- 2. Branding / Company Logo -->
<p align="center">
  By BEAM Inc. <br>
  <img src="docs/images/beam-logo.svg" alt="BEAM Inc. Logo" width="75" /> 
</p>

## Install

```bash
npm install --save-dev helplite-builder
```

## Quickstart

```bash
npx helplite-builder init
```

Scaffolds `help-source/help.md` in your project, copied from this
package's starter template. Edit that file, then:

```bash
npx helplite-builder build
```

Reads `help-source/help.md` and writes:

- `help/help.html` — the global help page
- `help/pages/<name>.html` — one file per page context
- `help/fields/tooltips.json` — every tooltip, keyed by name

Chain `build` into your own build script so help regenerates on every
build, the same way any other generated asset would:

```json
{
  "scripts": {
    "build": "helplite-builder build && <your normal build command>"
  }
}
```

`init` will refuse to overwrite an existing `help-source/help.md` —
pass `--force` if you really mean to reset it.

## The four folders, and how they're different

These are easy to mix up, so worth being explicit:

- **`help-source/`** — your own working file. You write this by hand.
  Never committed to git (see `.gitignore`), never published, and
  regenerating it is exactly what `init` is for.
- **`help/`** — the builder's output. Also never committed — it's
  fully regenerated from `help-source/` every time you run `build`,
  so there's nothing worth tracking. This is what HelpLite eventually
  reads.
- **`templates/help.md`** _(inside this package, not your project)_ —
  the starter file `init` copies into your `help-source/help.md` the
  first time. A small, working example covering every directive once.
- **`examples/example.md`** _(also inside this package)_ — a
  deliberately harder reference file: three-level nested lists, fenced
  code blocks containing things that look like directives but aren't,
  a tilde fence containing a backtick fence, duplicate headings,
  four-space-indented code. If you want to see what the syntax
  actually allows once you're past the basics — pipes inside tooltip
  text, code samples with real comments in them, how nesting survives
  — that file is worth reading directly:
  [`examples/example.md`](./examples/example.md). It's annotated with
  the rules in its own comments, so it works as documentation, not
  just a stress test.

## Syntax

Four directives on top of plain markdown, each kept short on purpose —
you'll type these constantly.

### `@build(type)`

Selects the global help page's layout. Optional — defaults to
`standard` if omitted. `standard` is the only build type that exists
right now (a plain scrolling page, no navigation); more are planned
(see `docs/ROADMAP.md`).

```
@build(standard)
```

### `@link(path.css)`

A stylesheet reference baked into the generated global help page's
`<head>`. Optional — omit it entirely and no `<link>` tag is written.
Must end in `.css` if given.

```
@link(/styles/help.css)
```

### `@tt` … `@ett` — tooltips

One line each: `name | text`. Names must be unique across your entire
site (HelpLite looks tooltips up by name alone) and can only contain
letters, numbers, underscores, and hyphens. Everything after the
first `|` is the text, so a pipe can appear inside the text itself:

```
@tt
businessName | Legal name of the business.
entityType | Sole proprietor | LLC | S-Corp | C-Corp
@ett
```

### `@pc` … `@epc` — page context

A new page's help starts with `name | text` at the very start of a
line. Everything after that, until the next name line or `@epc`, is
real markdown belonging to that page — headings, lists, code blocks,
all of it:

```
@pc
newbusiness | Create your business before adding records.

- Add contacts
- Add documents

receipts | Store receipts for bookkeeping and audit support.
@epc
```

### Comments

A line starting with `//` at the very start of the line (column zero)
is stripped from every output. An indented `//` — inside a four-space
code block, say — is left alone, since it's your code, not a comment
to this tool.

```
// This line disappears entirely.
```

### Everything else is markdown

Anything outside a directive block becomes the global help page.
Headings automatically get `id` attributes (so they can be linked to
later), fenced and indented code blocks are passed through untouched
— including anything inside them that would otherwise look like a
directive, a comment, or a pipe — and nested lists keep their nesting.

One thing worth knowing plainly: a raw `<script>` tag written directly
into your markdown will pass through unescaped and execute wherever
the generated page is opened. Nothing in this pipeline sanitizes
content — `help-source/help.md` is your own source file, the same as
any other file in your project, not end-user input.

## CLI reference

```
helplite-builder init [--force]   Scaffold help-source/help.md
helplite-builder build            Compile help-source/help.md into help/
```

## Contributing

See [`CONTRIBUTING.md`](./CONTRIBUTING.md), particularly if you're
adding a new `@build()` type — that has its own requirements.
[`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) is a map of the
codebase; [`docs/decisions/architecture.md`](./docs/decisions/architecture.md)
is the running log of why things are built the way they are.

## License

MIT — see [`LICENSE.md`](./LICENSE.md).
