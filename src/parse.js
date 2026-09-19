const HelpBuildError = require('./errors');
const validateBuild = require('./validation/validateBuild');
const validateLink = require('./validation/validateLink');
const validateTooltips = require('./validation/validateTooltips');
const validatePageContext = require('./validation/validatePageContext');

const validName = /^[A-Za-z0-9_-]+$/;

// A fence line: up to 3 spaces of indent, then 3+ backticks or 3+ tildes.
// The character is captured so a closing fence can be required to use the
// SAME one -- otherwise a ``` inside a ~~~ block would close the wrong thing.
const fenceLine = /^ {0,3}(`{3,}|~{3,})/;

// Pulled out of build.js on purpose: this function touches no filesystem at
// all -- markdown text in, a parsed structure out, or a thrown
// HelpBuildError. That makes every parser edge case (a fence, an indented
// block, a nested list with a pipe in it, an unclosed @tt) directly
// testable with a string literal, with no temp directory and no mocking
// fs. build.js's job is now only reading the source file and handing its
// text to this function.
function parseHelpSource(content) {
  const lines = content.split(/\r?\n/);

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

  // name -> the 1-based source line it was defined on. Kept so the
  // post-parse validators can still report a real line number even though
  // they run after the loop has finished, not inside it.
  const definedAt = {
    tooltips: {},
    pageContexts: {}
  };

  // Content goes to whichever block is currently open. Only used by the
  // fence paths, where mode-specific handling would otherwise be
  // duplicated twice. Declared inside the function (rather than as a
  // module-level helper) because it closes over mode/currentContext/parsed,
  // all of which are local to one parse call -- module scope would leak
  // state between two parseHelpSource() calls run back to back, which is
  // exactly the situation a test suite creates.
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

  for (let lineCount = 0; lineCount < lines.length; lineCount++) {
    // raw  -- what gets STORED. Leading whitespace is markdown block
    //         structure.
    // line -- what gets INSPECTED. trimEnd only: trailing whitespace is
    //         noise, leading whitespace is meaning. Directives live at
    //         column 0.
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
        throw new HelpBuildError(`Invalid name '${name}' at line '${lineCount + 1}'.`);
      }

      if (Object.prototype.hasOwnProperty.call(parsed.tooltips, name)) {
        throw new HelpBuildError(`Duplicate tooltip '${name}' at line '${lineCount + 1}'.`);
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
          throw new HelpBuildError(`Invalid name '${name}' at line '${lineCount + 1}'.`);
        }

        if (Object.prototype.hasOwnProperty.call(parsed.pageContexts, name)) {
          throw new HelpBuildError(
            `Duplicate page context detected: '${name}' at line '${lineCount + 1}'.`
          );
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

  // Unterminated blocks are author errors, not silent behavior. Without
  // these checks a missing @ett quietly swallows the rest of the help file
  // into the tooltip block and produces an empty help.html with no warning
  // at all.
  if (fenceChar !== null) {
    throw new HelpBuildError('Unclosed code fence at end of file.');
  }

  if (mode !== 'normal') {
    throw new HelpBuildError(
      `Unclosed '@${mode === 'tooltip' ? 'tt' : 'pc'}' block at end of file.`
    );
  }

  // Validate once, after parsing -- not on every line. Re-validating the
  // whole accumulated set inside the loop was O(n^2) and could never catch
  // a problem that only exists once parsing is finished.
  validateTooltips(parsed.tooltips, definedAt.tooltips);
  validatePageContext(parsed.pageContexts, definedAt.pageContexts);

  return parsed;
}

module.exports = parseHelpSource;
