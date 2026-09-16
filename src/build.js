const fs = require("fs");
const path = require("path");

const helpFile = path.join(process.cwd(), "help-source", "help.md");

const content = fs.readFileSync(helpFile, "utf8");

const lines = content.split(/\r?\n/);

const validName = /^[A-Za-z0-9_-]+$/;

const validateBuild = require("./validation/validateBuild");
const validateLink = require("./validation/validateLink");
const validateTooltips = require("./validation/validateTooltips");
const validatePageContext = require("./validation/validatePageContext");
const writeTooltips = require("./writers/writeTooltips");
const writePageContext = require("./writers/writePageContext");
const writeHtml = require("./writers/writeHtml");

const parsed = {
  buildType: "standard",
  cssPath: null,
  tooltips: {},
  pageContexts: {},
  markdownLines: []
};

let mode = "normal";

let currentContext = null;

for (let lineCount = 0; lineCount < lines.length; lineCount++) {

  const line = lines[lineCount].trim();

  // Ignore comments
  if (line.startsWith("//")) {
    continue;
  }

  // Build type
  if (line.startsWith("@build(")) {
    parsed.buildType = line
      .replace("@build(", "")
      .replace(")", "")
      .trim();

    validateBuild(parsed.buildType, lineCount);

    continue;
  }

  // CSS Link
  if (line.startsWith("@link(")) {
    parsed.cssPath = line
      .replace("@link(", "")
      .replace(")", "")
      .trim();

    validateLink(parsed.cssPath, lineCount);

    continue;
  }

  // Tooltip Start
  if (line === "@tt") {
    mode = "tooltip";
    continue;
  }

  // Tooltip End
  if (line === "@ett") {
    mode = "normal";
    continue;
  }

  // Page Context Start
  if (line === "@pc") {
    mode = "pagecontext";
    continue;
  }

  // Page Context End
  if (line === "@epc") {
    mode = "normal";
    currentContext = null;
    continue;
  }

  // TOOLTIPS
  if (mode === "tooltip") {

    if (!line) continue;

    const parts = line.split("|");

    if (parts.length < 2) continue;

    const name = parts[0].trim();
    const text = parts.slice(1).join("|").trim();

    if (!validName.test(name)) {
      console.error(
          `[ERROR] Invalid name '${name}' at line '${lineCount + 1}'.`
      );

      process.exit(1);
    }

    if (
      Object.prototype.hasOwnProperty.call(
        parsed.tooltips,
        name
      )
    ) {
      console.error(
        `[ERROR] Duplicate tooltip '${name}' at line '${lineCount + 1}'.`
      );

      process.exit(1);
    }

    parsed.tooltips[name] = text;

    validateTooltips(parsed.tooltips, lineCount);

    continue;
  }

  // PAGE CONTEXT
  if (mode === "pagecontext") {

    if (!line) {

      if (currentContext) {
        parsed.pageContexts[currentContext].push("");
      }

      continue;
    }

    if (line.includes("|")) {

      const parts = line.split("|");

      const name = parts[0].trim();
      const text = parts.slice(1).join("|").trim();

      currentContext = name;

      if (!validName.test(name)) {
        console.error(
            `[ERROR] Invalid name '${name}' at line '${lineCount + 1}'.`
        );

        process.exit(1);
      }

      if (
        Object.prototype.hasOwnProperty.call(
          parsed.pageContexts,
          name
        )
      ) {
        console.error(
          `[ERROR] Duplicate page context detected: '${name}' at line '$(lineCount + 1)'.`
        );

        process.exit(1);
      }

      parsed.pageContexts[name] = [text];

      continue;
    }

    if (currentContext) {
      parsed.pageContexts[currentContext].push(line);
    }

    validatePageContext(parsed.pageContexts, lineCount);

    continue;
  }

  // MARKDOWN
  parsed.markdownLines.push(line);
}

console.log(JSON.stringify(parsed, null, 2));

writeTooltips(parsed.tooltips);
writePageContext(parsed.pageContexts);
writeHtml(
  parsed.markdownLines,
  parsed.cssPath
);