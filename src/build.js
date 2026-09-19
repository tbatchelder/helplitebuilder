const fs = require('fs');
const path = require('path');

const parseHelpSource = require('./parse');
const resolvePaths = require('./paths');
const writeTooltips = require('./writers/writeTooltips');
const writePageContext = require('./writers/writePageContext');
const writeHtml = require('./writers/writeHtml');
const HelpBuildError = require('./errors');

// The only two things this function does that parseHelpSource() can't:
// touch the filesystem. Everything about WHAT a valid help file looks like
// lives in parse.js and the validators; this is just "read it, parse it,
// write what comes back" -- and, crucially, a function, not code that runs
// the moment the module is required. Requiring build.js used to run a real
// build against whatever was in process.cwd() as a side effect of loading
// it, which made it impossible to import from a test without the import
// itself doing work. Now importing does nothing; calling buildHelp() does
// the work, against whatever paths you pass it.
//
// Returns the parsed source (tooltips, page contexts, markdown, build
// type) so a caller -- a test, or a future CLI wanting a summary -- can
// inspect what was built without re-reading the output files back off
// disk.
function buildHelp({ sourceFile, outputDir } = {}) {
  const resolvedSourceFile = sourceFile || path.join(process.cwd(), 'help-source', 'help.md');

  const content = fs.readFileSync(resolvedSourceFile, 'utf8');

  const parsed = parseHelpSource(content);

  const paths = resolvePaths(outputDir);

  writeTooltips(parsed.tooltips, paths);
  writePageContext(parsed.pageContexts, paths);
  writeHtml(parsed.markdownLines, parsed.cssPath, parsed.buildType, paths);

  return parsed;
}

// CLI entry point. Guarded behind require.main so that requiring this file
// -- from a test, or from a future package entry point -- only ever gets
// the function above, never a side-effecting build. This block is the ONLY
// place in the whole builder allowed to call process.exit or write to
// process.stderr for a HelpBuildError; every other layer just throws.
if (require.main === module) {
  try {
    buildHelp();
  } catch (err) {
    if (err instanceof HelpBuildError) {
      console.error(`[ERROR] ${err.message}`);

      process.exit(1);
    }

    // Not a source-file problem -- a real bug, a permissions error, a
    // missing file. Let it propagate with its stack trace instead of
    // swallowing it into a one-line [ERROR], which would hide exactly the
    // information needed to fix it.
    throw err;
  }
}

module.exports = buildHelp;
