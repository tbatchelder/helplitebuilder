const fs = require("fs");
const path = require("path");

function writeTooltips(tooltips) {
  if (
    !tooltips ||
    Object.keys(tooltips).length === 0
  ) {
    console.warn(
      "[WARN] No tooltips found."
    );
    return;
  }

  const outputDir = path.join(
    process.cwd(),
    "help",
    "fields"
  );

  // Create folder if needed
  fs.mkdirSync(outputDir, {
    recursive: true
  });

  const outputFile = path.join(
    outputDir,
    "tooltips.json"
  );

  fs.writeFileSync(
    outputFile,
    JSON.stringify(tooltips, null, 2),
    "utf8"
  );

  console.log(
    `[INFO] Tooltips written: ${outputFile}`
  );
}

module.exports = writeTooltips;