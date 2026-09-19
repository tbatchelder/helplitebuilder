const HelpBuildError = require('../errors');

function validateTooltips(tooltips, definedAt = {}) {
  for (const [name, text] of Object.entries(tooltips)) {
    const lineNumber = definedAt[name];

    const where = lineNumber ? ` at line '${lineNumber}'` : '';

    if (!name.trim()) {
      throw new HelpBuildError(`Tooltip name missing${where}.`);
    }

    if (!text.trim()) {
      throw new HelpBuildError(`Tooltip '${name}' has no text${where}.`);
    }
  }
}

module.exports = validateTooltips;
