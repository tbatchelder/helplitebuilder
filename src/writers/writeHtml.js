const fs = require("fs");
const path = require("path");
const { marked } = require("marked");

function writeHtml(markdownLines, cssPath) {

  if (!markdownLines || markdownLines.length === 0) {
    console.warn(
      "[WARN] No markdown content found."
    );

    return;
  }

  const markdown = markdownLines.join("\n");

  const body = marked(markdown);

  let html = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Help</title>
<link rel="stylesheet" href="${cssPath}"
</head>
<body>

${body}

</body>
</html>
`;

  const outputFile = path.join(
    process.cwd(),
    "help",
    "help.html"
  );

  fs.writeFileSync(
    outputFile,
    html,
    "utf8"
  );

  console.log(
    `[INFO] Global help written: ${outputFile}`
  );
}

module.exports = writeHtml;