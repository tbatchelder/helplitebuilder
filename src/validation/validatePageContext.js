function validatePageContexts(pageContexts, definedAt = {}) {
  for (const [name, lines] of Object.entries(pageContexts)) {
    const lineNumber = definedAt[name];

    const where = lineNumber ? ` at line '${lineNumber}'` : '';

    if (!name.trim()) {
      console.error(`[ERROR] Page context name missing${where}.`);

      process.exit(1);
    }

    if (!Array.isArray(lines)) {
      console.error(`[ERROR] Page context '${name}' is not an array.`);

      process.exit(1);
    }

    if (lines.length === 0) {
      console.error(`[ERROR] Page context '${name}' contains no lines${where}.`);

      process.exit(1);
    }

    const hasText = lines.some(line => line.trim().length > 0);

    if (!hasText) {
      console.error(`[ERROR] Page context '${name}' contains only blank lines${where}.`);

      process.exit(1);
    }
  }
}

module.exports = validatePageContexts;
