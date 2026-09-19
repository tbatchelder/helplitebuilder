const HelpBuildError = require('../errors');

function validatePageContexts(pageContexts, definedAt = {}) {
  for (const [name, lines] of Object.entries(pageContexts)) {
    const lineNumber = definedAt[name];

    const where = lineNumber ? ` at line '${lineNumber}'` : '';

    if (!name.trim()) {
      throw new HelpBuildError(`Page context name missing${where}.`);
    }

    if (!Array.isArray(lines)) {
      throw new HelpBuildError(`Page context '${name}' is not an array.`);
    }

    if (lines.length === 0) {
      throw new HelpBuildError(`Page context '${name}' contains no lines${where}.`);
    }

    const hasText = lines.some(line => line.trim().length > 0);

    if (!hasText) {
      throw new HelpBuildError(`Page context '${name}' contains only blank lines${where}.`);
    }
  }
}

module.exports = validatePageContexts;
