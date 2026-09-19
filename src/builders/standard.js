// Builds the V1 global help layout: a single plain scrolling page, no
// navigation. This is deliberately the only builder that exists right
// now -- sidebar/hamburger (V2/V3) are separate files that belong in this
// same folder, to be added once their actual navigation requirements are
// known (page order? titles for nav labels? a JS toggle?), not designed
// speculatively ahead of a real second build type.
//
// Contract every builder in this folder must satisfy (see
// test/builders/registry.test.js, which enforces this automatically for
// every registered type): receives { title, body, cssPath } where title
// and cssPath are ALREADY HTML-escaped and body is already-rendered HTML
// -- a builder never escapes or renders anything itself, only arranges
// already-safe pieces into a document -- and returns a complete HTML
// document as a string. cssPath may be null.
function buildStandard({ title, body, cssPath }) {
  const stylesheet = cssPath ? `\n<link rel="stylesheet" href="${cssPath}">` : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${title}</title>${stylesheet}
</head>
<body>

${body}
</body>
</html>
`;
}

module.exports = buildStandard;
