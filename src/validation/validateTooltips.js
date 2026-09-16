function validateTooltips(tooltips, definedAt = {}) {
  for (const [name, text] of Object.entries(tooltips)) {
    const lineNumber = definedAt[name];

    const where = lineNumber ? ` at line '${lineNumber}'` : '';

    if (!name.trim()) {
      console.error(`[ERROR] Tooltip name missing${where}.`);

      process.exit(1);
    }

    if (!text.trim()) {
      console.error(`[ERROR] Tooltip '${name}' has no text${where}.`);

      process.exit(1);
    }
  }
}

module.exports = validateTooltips;
