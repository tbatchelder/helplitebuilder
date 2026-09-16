const { Marked } = require('marked');

// Slugify a heading's text into an id: lowercase, non-alphanumerics to
// hyphens, no leading/trailing hyphens.
function slugify(text) {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

// marked does NOT add id attributes to headings (verified against the
// installed version -- '# Hello' renders as a bare '<h1>Hello</h1>'). Without
// ids there is nothing for a table of contents, a "return to top" link, a
// sidebar build type, or an in-app deep link to target. Adding them here
// means every output gets them, and every future navigation feature has
// something to point at without the author writing any extra syntax.
function renderMarkdown(markdown) {
  const seen = new Map();

  const renderer = {
    heading(token) {
      const text = this.parser.parseInline(token.tokens);

      const base = slugify(text) || 'section';

      // Duplicate headings are completely normal in a help file --
      // several pages can each have "Overview". Ids must still be unique
      // or every link lands on the first one.
      const count = seen.get(base) || 0;

      seen.set(base, count + 1);

      const id = count === 0 ? base : `${base}-${count}`;

      return `<h${token.depth} id="${id}">${text}</h${token.depth}>\n`;
    }
  };

  // A fresh instance per call, so the duplicate-id counter never leaks
  // between the global help file and the page context files.
  const instance = new Marked({ renderer });

  return instance.parse(markdown);
}

module.exports = renderMarkdown;
