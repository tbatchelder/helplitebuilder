const fs = require('fs');
const path = require('path');

const validateBuild = require('./validation/validateBuild');
const validateLink = require('./validation/validateLink');
const validateTooltips = require('./validation/validateTooltips');
const validatePageContext = require('./validation/validatePageContext');
const writeTooltips = require('./writers/writeTooltips');
const writePageContext = require('./writers/writePageContext');
const writeHtml = require('./writers/writeHtml');
const resolvePaths = require('./paths');

const helpFile = path.join(process.cwd(), 'help-source', 'help.md');

const content = fs.readFileSync(helpFile, 'utf8');

const lines = content.split(/\r?\n/);

const validName = /^[A-Za-z0-9_-]+$/;

// A fence line: up to 3 spaces of indent, then 3+ backticks or 3+ tildes.
// The character is captured so a closing fence can be required to use the
// SAME one -- otherwise a ``` inside a ~~~ block would close the wrong thing.
const fenceLine = /^ {0,3}(`{3,}|~{3,})/;

const parsed = {
  buildType: 'standard',
  cssPath: null,
  tooltips: {},
  pageContexts: {},
  markdownLines: []
};

let mode = 'normal';

let currentContext = null;

let fenceChar = null;

// name -> the 1-based source line it was defined on. Kept so the validators
// can still report a real line number now that they run after the loop
// instead of inside it.
const definedAt = {
  tooltips: {},
  pageContexts: {}
};

for (let lineCount = 0; lineCount < lines.length; lineCount++) {
  // raw  -- what gets STORED. Leading whitespace is markdown block structure.
  // line -- what gets INSPECTED. trimEnd only: trailing whitespace is noise,
  //         leading whitespace is meaning. Directives live at column 0.
  const raw = lines[lineCount];

  const line = raw.trimEnd();

  // FENCED CODE BLOCKS
  // Inside a fence the builder has no opinions: '//' is a comment in the
  // developer's sample code, '@tt' might be a decorator, '|' might be a
  // table row or a bitwise OR. Track the fence before anything else gets
  // a chance to interpret the line.
  const fence = line.match(fenceLine);

  if (fence) {
    const char = fence[1][0];

    if (fenceChar === null) {
      fenceChar = char;
    } else if (char === fenceChar) {
      fenceChar = null;
    }

    pushContent(raw);

    continue;
  }

  if (fenceChar !== null) {
    pushContent(raw);

    continue;
  }

  // Ignore comments -- column 0 only. An indented '//' is inside a
  // four-space code block, which has no fence to detect it by.
  if (line.startsWith('//')) {
    continue;
  }

  // Build type
  if (line.startsWith('@build(')) {
    parsed.buildType = line.replace('@build(', '').replace(')', '').trim();

    validateBuild(parsed.buildType, lineCount);

    continue;
  }

  // CSS Link
  if (line.startsWith('@link(')) {
    parsed.cssPath = line.replace('@link(', '').replace(')', '').trim();

    validateLink(parsed.cssPath, lineCount);

    continue;
  }

  // Tooltip Start
  if (line === '@tt') {
    mode = 'tooltip';
    continue;
  }

  // Tooltip End
  if (line === '@ett') {
    mode = 'normal';
    continue;
  }

  // Page Context Start
  if (line === '@pc') {
    mode = 'pagecontext';
    continue;
  }

  // Page Context End
  if (line === '@epc') {
    mode = 'normal';
    currentContext = null;
    continue;
  }

  // TOOLTIPS
  // One line each, by design -- nothing here needs raw whitespace.
  if (mode === 'tooltip') {
    const entry = line.trim();

    if (!entry) continue;

    const parts = entry.split('|');

    if (parts.length < 2) continue;

    const name = parts[0].trim();
    const text = parts.slice(1).join('|').trim();

    if (!validName.test(name)) {
      console.error(`[ERROR] Invalid name '${name}' at line '${lineCount + 1}'.`);

      process.exit(1);
    }

    if (Object.prototype.hasOwnProperty.call(parsed.tooltips, name)) {
      console.error(`[ERROR] Duplicate tooltip '${name}' at line '${lineCount + 1}'.`);

      process.exit(1);
    }

    parsed.tooltips[name] = text;

    definedAt.tooltips[name] = lineCount + 1;

    continue;
  }

  // PAGE CONTEXT
  if (mode === 'pagecontext') {
    // A name line is 'name | text' at column 0. Anything indented is
    // continuation content -- an indented list item or table row can
    // legitimately contain a pipe and must not start a new context.
    const isNameLine = raw.length === line.trimStart().length && line.includes('|');

    if (isNameLine) {
      const parts = line.split('|');

      const name = parts[0].trim();
      const text = parts.slice(1).join('|').trim();

      if (!validName.test(name)) {
        console.error(`[ERROR] Invalid name '${name}' at line '${lineCount + 1}'.`);

        process.exit(1);
      }

      if (Object.prototype.hasOwnProperty.call(parsed.pageContexts, name)) {
        console.error(
          `[ERROR] Duplicate page context detected: '${name}' at line '${lineCount + 1}'.`
        );

        process.exit(1);
      }

      currentContext = name;

      parsed.pageContexts[name] = [text];

      definedAt.pageContexts[name] = lineCount + 1;

      continue;
    }

    if (currentContext) {
      parsed.pageContexts[currentContext].push(raw);
    }

    continue;
  }

  // MARKDOWN
  parsed.markdownLines.push(raw);
}

// Content goes to whichever block is currently open. Only used by the fence
// paths, where mode-specific handling would otherwise be duplicated twice.
function pushContent(raw) {
  if (mode === 'pagecontext') {
    if (currentContext) {
      parsed.pageContexts[currentContext].push(raw);
    }

    return;
  }

  if (mode === 'normal') {
    parsed.markdownLines.push(raw);
  }
}

// Unterminated blocks are author errors, not silent behavior. Without these
// checks a missing @ett quietly swallows the rest of the help file into the
// tooltip block and produces an empty help.html with no warning at all.
if (fenceChar !== null) {
  console.error('[ERROR] Unclosed code fence at end of file.');

  process.exit(1);
}

if (mode !== 'normal') {
  console.error(`[ERROR] Unclosed '@${mode === 'tooltip' ? 'tt' : 'pc'}' block at end of file.`);

  process.exit(1);
}

// Validate once, after parsing -- not on every line. Re-validating the whole
// accumulated set inside the loop was O(n^2) and could never catch a problem
// that only exists once parsing is finished.
validateTooltips(parsed.tooltips, definedAt.tooltips);
validatePageContext(parsed.pageContexts, definedAt.pageContexts);

// Resolved once, here, and handed to every writer -- so there is exactly one
// place to change when the CLI needs to accept an output folder, and exactly
// one thing to override when a test needs to build into a temp directory.
const paths = resolvePaths();

writeTooltips(parsed.tooltips, paths);
writePageContext(parsed.pageContexts, paths);
writeHtml(parsed.markdownLines, parsed.cssPath, paths);
