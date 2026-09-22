#!/usr/bin/env node

const initHelp = require('../src/init');
const buildHelp = require('../src/build');
const HelpBuildError = require('../src/errors');

const command = process.argv[2];
const force = process.argv.includes('--force');

function printUsage() {
  console.log(`Usage: helplite-builder <command>

Commands:
  init    Scaffold help-source/ in the current project and copy the
          starter template into help-source/help.md
  build   Read help-source/help.md and write the global help page, page
          context files, and tooltips.json into help/ -- meant to be
          chained into your own build step, e.g.:
            "scripts": { "build": "helplite-builder build && next build" }

Options:
  --force  With init: overwrite help-source/help.md if it already exists
`);
}

// Guarded the same way build.js's own CLI entry is: requiring this file
// (a test importing initHelp/buildHelp directly, for instance) never runs
// any of this. Only actually executing the file does.
if (require.main === module) {
  if (command === 'init' || command === 'build') {
    try {
      if (command === 'init') {
        initHelp({ force });
      } else {
        // No sourceFile/outputDir passed -- buildHelp()'s own defaults
        // (help-source/help.md and help/, both relative to process.cwd())
        // are exactly right here, because process.cwd() when this runs as
        // part of a consumer's own `npm run build` IS their project root.
        buildHelp();
      }
    } catch (err) {
      if (err instanceof HelpBuildError) {
        console.error(`[ERROR] ${err.message}`);

        process.exit(1);
      }

      // Not a usage problem -- a real bug, a permissions error, a missing
      // source file. Let it propagate with its stack trace instead of
      // swallowing it into a one-line [ERROR].
      throw err;
    }
  } else {
    printUsage();

    // Running with no command at all is just someone checking usage --
    // that's not an error. Running with an unrecognized command is a
    // real mistake and should fail loudly enough for a script to notice.
    process.exit(command ? 1 : 0);
  }
}
