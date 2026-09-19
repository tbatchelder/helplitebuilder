// Generic HTML-document utilities shared by every builder in src/builders/.
// Neither of these is about the standard layout specifically -- a sidebar
// or hamburger build still needs a title and still needs its css path
// escaped the same way. Living here means writeHtml can do both ONCE,
// before handing clean, already-escaped data to whichever builder is
// selected, so no builder has to remember to escape anything itself.

// The css path and the title get dropped into HTML attributes and an
// element, so they have to be escaped. cssPath is validated for a .css
// ending, not for quote characters -- a path containing one would
// otherwise close the attribute early and emit broken markup.
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

module.exports = { escapeHtml, findTitle };
