const fs = require("fs");
const path = require("path");
const { marked } = require("marked");

function writePageContext(pageContexts) {

  if (
    !pageContexts ||
    Object.keys(pageContexts).length === 0
  ) {
    console.warn(
      "[WARN] No page contexts found."
    );

    return;
  }

  const outputDir = path.join(
    process.cwd(),
    "help",
    "pages"
  );

  fs.mkdirSync(outputDir, {
    recursive: true
  });

  for (const [pageName, lines] of Object.entries(pageContexts)) {

    const markdown = lines.join("\n");

    const html = marked(markdown);

    const outputFile = path.join(
      outputDir,
      `${pageName}.html`
    );

    fs.writeFileSync(
      outputFile,
      html,
      "utf8"
    );

    console.log(
      `[INFO] Page context written: ${outputFile}`
    );

  }

}

module.exports = writePageContext;