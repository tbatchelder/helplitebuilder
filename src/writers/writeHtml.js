const fs = require('fs');

const resolvePaths = require('../paths');
const renderMarkdown = require('../markdown');
const { escapeHtml, findTitle } = require('../html');
const builders = require('../builders');
const HelpBuildError = require('../errors');

function writeHtml(markdownLines, cssPath, buildType = 'standard', paths = resolvePaths()) {
  if (!markdownLines || markdownLines.length === 0) {
    console.warn('[WARN] No markdown content found.');

    return;
  }

  const builder = builders[buildType];

  // Defensive, not reachable through the normal CLI flow -- validateBuild
  // already rejects an unknown build type while parsing, before writeHtml
  // is ever called with it. This only matters if writeHtml is called
  // directly (as its own unit tests do) with a buildType validateBuild
  // never saw.
  if (!builder) {
    throw new HelpBuildError(`No builder registered for build type '${buildType}'.`);
  }

  const markdown = markdownLines.join('\n');

  const body = renderMarkdown(markdown);

  const title = escapeHtml(findTitle(markdownLines));

  const escapedCssPath = cssPath ? escapeHtml(cssPath) : null;

  // Every builder gets already-rendered, already-escaped pieces and hands
  // back a complete document string -- it never touches fs. Writing the
  // file is this function's job, the same as it is for tooltips and page
  // context, regardless of which builder produced the string.
  const html = builder({ title, body, cssPath: escapedCssPath });

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
