const fs = require('fs');

const resolvePaths = require('../paths');
const renderMarkdown = require('../markdown');

// The CSS path and the title are dropped into HTML attributes and an element,
// so they have to be escaped. cssPath is validated for a .css ending, not for
// quote characters -- a path containing one would otherwise close the
// attribute early and emit broken markup.
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Use the first level-1 heading as the document title. The author already
// wrote it; asking for it a second time via a directive would be one more
// thing to keep in sync. Falls back to "Help" when there is no h1.
function findTitle(markdownLines) {
  for (const line of markdownLines) {
    const match = line.match(/^#\s+(.+)$/);

    if (match) {
      return match[1].trim();
    }
  }

  return 'Help';
}

function writeHtml(markdownLines, cssPath, paths = resolvePaths()) {
  if (!markdownLines || markdownLines.length === 0) {
    console.warn('[WARN] No markdown content found.');

    return;
  }

  const markdown = markdownLines.join('\n');

  const body = renderMarkdown(markdown);

  const title = escapeHtml(findTitle(markdownLines));

  const stylesheet = cssPath ? `\n<link rel="stylesheet" href="${escapeHtml(cssPath)}">` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>${stylesheet}
</head>
<body>

${body}
</body>
</html>
`;

  // The other two writers happen to create this folder as a side effect of
  // creating their own subfolders, so this only failed when a help file had
  // no tooltips AND no page contexts -- a real ENOENT crash that depended
  // entirely on the order the writers are called in.
  fs.mkdirSync(paths.helpDir, {
    recursive: true
  });

  fs.writeFileSync(paths.helpFile, html, 'utf8');

  console.log(`[INFO] Global help written: ${paths.helpFile}`);
}

module.exports = writeHtml;
