// Thrown by the parser and validators for any problem in the author's
// source file -- an invalid name, a duplicate, an unclosed block, a bad
// build type. Never for a bug in the builder itself; those should be a
// plain Error (or crash), not this.
//
// Using a distinct class -- rather than a plain Error, or the
// console.error+process.exit pattern this replaces -- gives the CLI entry
// point something to distinguish on: a HelpBuildError means "print this
// message and exit 1", anything else means "this is a real crash, let it
// propagate with its stack trace." Tests can assert on it directly
// (expect(...).toThrow(HelpBuildError)) instead of mocking process.exit.
class HelpBuildError extends Error {
  constructor(message) {
    super(message);

    this.name = 'HelpBuildError';
  }
}

module.exports = HelpBuildError;
