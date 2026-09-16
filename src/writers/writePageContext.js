const fs = require('fs');
const path = require('path');

const resolvePaths = require('../paths');
const renderMarkdown = require('../markdown');

function writePageContext(pageContexts, paths = resolvePaths()) {
  if (!pageContexts || Object.keys(pageContexts).length === 0) {
    console.warn('[WARN] No page contexts found.');

    return;
  }

  fs.mkdirSync(paths.pagesDir, {
    recursive: true
  });

  const written = new Set();

  for (const [pageName, lines] of Object.entries(pageContexts)) {
    const markdown = lines.join('\n');

    const html = renderMarkdown(markdown);

    const outputFile = path.join(paths.pagesDir, `${pageName}.html`);

    fs.writeFileSync(outputFile, html, 'utf8');

    written.add(`${pageName}.html`);

    console.log(`[INFO] Page context written: ${outputFile}`);
  }

  removeStalePages(paths.pagesDir, written);
}

// Rename a page context and the old file stays on disk forever -- it ships,
// it gets served, and HelpLite has no way to know it is dead. The output
// folder is generated, so it should mirror the source exactly. Scoped to
// .html files inside pagesDir so nothing a developer put there by hand
// (an image, a .gitkeep) is ever touched.
function removeStalePages(pagesDir, written) {
  for (const entry of fs.readdirSync(pagesDir, { withFileTypes: true })) {
    if (!entry.isFile()) continue;

    if (!entry.name.endsWith('.html')) continue;

    if (written.has(entry.name)) continue;

    fs.unlinkSync(path.join(pagesDir, entry.name));

    console.log(`[INFO] Removed stale page context: ${entry.name}`);
  }
}

module.exports = writePageContext;
