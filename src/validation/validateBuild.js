const HelpBuildError = require('../errors');
const builders = require('../builders');

function validateBuild(buildType, lineCount) {
  // Derived, not hand-maintained -- see src/builders/index.js. A build
  // type is valid if and only if a builder is actually registered for
  // it, so there is no separate list here that could ever fall out of
  // sync with what src/builders/ actually contains.
  const validBuildTypes = Object.keys(builders);

  if (!buildType) {
    throw new HelpBuildError('Missing build type.');
  }

  if (!validBuildTypes.includes(buildType)) {
    throw new HelpBuildError(
      `Invalid build type '${buildType}' at line '${lineCount + 1}'. Valid types: ${validBuildTypes.join(', ')}.`
    );
  }
}

module.exports = validateBuild;
