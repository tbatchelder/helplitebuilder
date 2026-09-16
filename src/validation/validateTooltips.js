function validateTooltips(tooltips, lineCount) {

  for (const [name, text] of Object.entries(tooltips)) {

    if (!name.trim()) {
      console.error(
        `[ERROR] Tooltip name missing at line '${lineCount + 1}'.`
      );

      process.exit(1);
    }

    if (!text.trim()) {
      console.error(
        `[ERROR] Tooltip '${name}' has no text at line '${lineCount + 1}'.`
      );

      process.exit(1);
    }

  }

}

module.exports = validateTooltips;
