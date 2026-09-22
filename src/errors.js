// Thrown for any problem that's the user's to fix, not the builder's -- an
// invalid name, a duplicate, an unclosed block, a bad build type in a
// source file, or a CLI usage conflict like `init` refusing to overwrite
// an existing help-source/help.md. Never for a bug in the builder itself;
// that should be a plain Error (or crash), not this.
//
// Using a distinct class -- rather than a plain Error, or the
// console.error+process.exit pattern this replaces -- gives every CLI
// entry point (build.js, and now the init command) the same thing to
// distinguish on: a HelpBuildError means "print this message and exit 1",
// anything else means "this is a real crash, let it propagate with its
// stack trace." Tests can assert on it directly
// (expect(...).toThrow(HelpBuildError)) instead of mocking process.exit.
class HelpBuildError extends Error {
  constructor(message) {
    super(message);

    this.name = 'HelpBuildError';
  }
}

module.exports = HelpBuildError;
