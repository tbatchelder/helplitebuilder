const HelpBuildError = require('../errors');

function validateLink(cssPath, lineCount) {
  if (cssPath === null) {
    return;
  }

  if (!cssPath.trim()) {
    throw new HelpBuildError(`Empty CSS path at line '${lineCount + 1}'.`);
  }

  if (!/\.css($|\?)/.test(cssPath)) {
    throw new HelpBuildError(
      `CSS path '${cssPath}' must end with '.css' at line '${lineCount + 1}'.`
    );
  }
}

module.exports = validateLink;
