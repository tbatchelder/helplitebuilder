import { describe, it, expect } from 'vitest';

const parseHelpSource = require('../src/parse');
const HelpBuildError = require('../src/errors');

describe('parseHelpSource: basics', () => {
  it('defaults build type to standard when @build is omitted', () => {
    const parsed = parseHelpSource('# Hello\n');

    expect(parsed.buildType).toBe('standard');
  });

  it('reads the css link path', () => {
    const parsed = parseHelpSource('@link(/styles/help.css)\n# Hello\n');

    expect(parsed.cssPath).toBe('/styles/help.css');
  });

  it('parses a tooltip block into a name/text map', () => {
    const parsed = parseHelpSource(
      ['@tt', 'businessName | Legal name of the business.', '@ett'].join('\n')
    );

    expect(parsed.tooltips).toEqual({
      businessName: 'Legal name of the business.'
    });
  });

  it('keeps every pipe after the first as part of the tooltip text', () => {
    const parsed = parseHelpSource(
      ['@tt', 'entityType | Sole proprietor | LLC | S-Corp', '@ett'].join('\n')
    );

    expect(parsed.tooltips.entityType).toBe('Sole proprietor | LLC | S-Corp');
  });

  it('parses a page context block into an array of lines per name', () => {
    const parsed = parseHelpSource(
      ['@pc', 'newbusiness | Create your business first.', 'Second line.', '@epc'].join('\n')
    );

    expect(parsed.pageContexts.newbusiness).toEqual([
      'Create your business first.',
      'Second line.'
    ]);
  });

  it('supports multiple page contexts in one block', () => {
    const parsed = parseHelpSource(['@pc', 'a | First.', 'b | Second.', '@epc'].join('\n'));

    expect(Object.keys(parsed.pageContexts)).toEqual(['a', 'b']);
  });

  it('collects everything outside directive blocks as markdown', () => {
    // A trailing newline is a real, normal part of a text file and
    // split(/\r?\n/) correctly turns it into a trailing empty string --
    // that belongs in the expectation, not stripped from the parser.
    const parsed = parseHelpSource('# Title\n\nSome text.\n');

    expect(parsed.markdownLines).toEqual(['# Title', '', 'Some text.', '']);
  });

  it('strips column-zero comments and never puts them in markdown', () => {
    const parsed = parseHelpSource('// a note\n# Title\n');

    expect(parsed.markdownLines).toEqual(['# Title', '']);
  });
});

describe('parseHelpSource: whitespace and nesting (regression -- the original bug)', () => {
  // The original parser trimmed every line before storing it, which
  // flattened nested lists and destroyed indented code blocks. These tests
  // exist specifically so that bug can never come back silently.

  it("preserves a nested list's indentation", () => {
    const parsed = parseHelpSource(['- Item', '  - Nested', '    - Deeper'].join('\n'));

    expect(parsed.markdownLines).toEqual(['- Item', '  - Nested', '    - Deeper']);
  });

  it('preserves indentation inside a page context block', () => {
    const parsed = parseHelpSource(
      ['@pc', 'a | Intro.', '- Item', '  - Nested', '@epc'].join('\n')
    );

    expect(parsed.pageContexts.a).toEqual(['Intro.', '- Item', '  - Nested']);
  });

  it('preserves a four-space indented code block', () => {
    const parsed = parseHelpSource(['    const y = 2;'].join('\n'));

    expect(parsed.markdownLines).toEqual(['    const y = 2;']);
  });
});

describe('parseHelpSource: fenced code blocks', () => {
  // The original parser stripped '//' comments and read directives before
  // it knew whether it was inside a fence, so a code sample containing
  // '// comment' or a bare '@tt' was silently mangled or misread. These
  // tests exist specifically so that bug can never come back silently.

  it('keeps a comment-looking line inside a fence as code', () => {
    const parsed = parseHelpSource(
      ['```js', '// this must survive', 'const x = 1;', '```'].join('\n')
    );

    expect(parsed.markdownLines).toContain('// this must survive');
  });

  it('does not treat a directive-looking line inside a fence as a directive', () => {
    const parsed = parseHelpSource(['```js', '@tt', 'const x = 1;', '```', '# Title'].join('\n'));

    expect(parsed.markdownLines).toContain('@tt');
    expect(parsed.markdownLines).toContain('# Title');
    expect(parsed.tooltips).toEqual({});
  });

  it('does not let a backtick fence close a tilde fence', () => {
    const parsed = parseHelpSource(['~~~text', '```js', 'still inside', '~~~'].join('\n'));

    expect(parsed.markdownLines).toContain('still inside');
  });

  it('passes a pipe inside a fence through as code, not a page-context name line', () => {
    const parsed = parseHelpSource(
      ['@pc', 'a | Intro.', '```js', 'const mask = FLAG_A | FLAG_B;', '```', '@epc'].join('\n')
    );

    expect(parsed.pageContexts.a).toContain('const mask = FLAG_A | FLAG_B;');
    expect(Object.keys(parsed.pageContexts)).toEqual(['a']);
  });

  it('throws on an unclosed fence', () => {
    expect(() => parseHelpSource(['```js', 'const x = 1;'].join('\n'))).toThrow(HelpBuildError);
  });
});

describe('parseHelpSource: page-context pipe vs. nested content', () => {
  // A page context's name line is 'name | text' at column zero. Content
  // nested under it -- a sub-bullet like "Phone | work or mobile" -- also
  // contains a pipe, and must not be misread as starting a new context.

  it('treats an indented line containing a pipe as content, not a new context', () => {
    const parsed = parseHelpSource(
      ['@pc', 'a | Intro.', '- Contact', '  - Phone | work or mobile', '@epc'].join('\n')
    );

    expect(Object.keys(parsed.pageContexts)).toEqual(['a']);
    expect(parsed.pageContexts.a).toContain('  - Phone | work or mobile');
  });
});

describe('parseHelpSource: errors', () => {
  it('throws on an invalid tooltip name', () => {
    expect(() => parseHelpSource(['@tt', 'bad name! | text', '@ett'].join('\n'))).toThrow(
      HelpBuildError
    );
  });

  it('throws on a duplicate tooltip name', () => {
    expect(() => parseHelpSource(['@tt', 'a | one', 'a | two', '@ett'].join('\n'))).toThrow(
      HelpBuildError
    );
  });

  it('throws on a duplicate page context name', () => {
    expect(() => parseHelpSource(['@pc', 'a | one', 'a | two', '@epc'].join('\n'))).toThrow(
      HelpBuildError
    );
  });

  it('throws on an unclosed tooltip block', () => {
    expect(() => parseHelpSource(['@tt', 'a | one'].join('\n'))).toThrow(HelpBuildError);
  });

  it('throws on an unclosed page context block', () => {
    expect(() => parseHelpSource(['@pc', 'a | one'].join('\n'))).toThrow(HelpBuildError);
  });

  it('throws on an unknown build type', () => {
    expect(() => parseHelpSource('@build(sidebar)\n# Title\n')).toThrow(HelpBuildError);
  });

  it('throws on a css link missing the .css extension', () => {
    expect(() => parseHelpSource('@link(/styles/help)\n# Title\n')).toThrow(HelpBuildError);
  });

  it('throws on an empty tooltip name', () => {
    expect(() => parseHelpSource(['@tt', ' | text with no name', '@ett'].join('\n'))).toThrow(
      HelpBuildError
    );
  });
});
