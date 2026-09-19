import { describe, it, expect } from 'vitest';

const validateBuild = require('../src/validation/validateBuild');
const validateLink = require('../src/validation/validateLink');
const validateTooltips = require('../src/validation/validateTooltips');
const validatePageContext = require('../src/validation/validatePageContext');
const HelpBuildError = require('../src/errors');

// These exist alongside parse.test.js's error cases, not instead of them.
// parse.test.js proves the validators are wired into the real parsing
// pipeline correctly; these prove each validator is correct on its own
// terms -- including a couple of branches (an empty-string name, a
// non-array page context) that the real parser can never actually produce,
// since it builds these values itself, but that the validator should still
// reject if anything else ever calls it directly.

describe('validateBuild', () => {
  it('accepts the only currently valid build type', () => {
    expect(() => validateBuild('standard', 0)).not.toThrow();
  });

  it('throws on a missing build type', () => {
    expect(() => validateBuild('', 0)).toThrow(HelpBuildError);
    expect(() => validateBuild('', 0)).toThrow(/Missing build type/);
  });

  it('throws on an unrecognized build type and reports the 1-based line', () => {
    expect(() => validateBuild('sidebar', 4)).toThrow(/Invalid build type 'sidebar'.*line '5'/);
  });
});

describe('validateLink', () => {
  it('allows a null css path (the directive is optional)', () => {
    expect(() => validateLink(null, 0)).not.toThrow();
  });

  it('throws on an empty or whitespace-only css path', () => {
    expect(() => validateLink('', 0)).toThrow(/Empty CSS path/);
    expect(() => validateLink('   ', 0)).toThrow(/Empty CSS path/);
  });

  it('accepts a path ending in .css', () => {
    expect(() => validateLink('/styles/help.css', 0)).not.toThrow();
  });

  it('accepts a .css path with a query string', () => {
    expect(() => validateLink('/styles/help.css?v=2', 0)).not.toThrow();
  });

  it('throws on a path that does not end in .css', () => {
    expect(() => validateLink('/styles/help.txt', 0)).toThrow(/must end with '\.css'/);
  });
});

describe('validateTooltips', () => {
  it('accepts an empty tooltip set', () => {
    expect(() => validateTooltips({})).not.toThrow();
  });

  it('accepts tooltips that all have names and text', () => {
    expect(() => validateTooltips({ a: 'text' })).not.toThrow();
  });

  it('throws on a blank-only name', () => {
    expect(() => validateTooltips({ '  ': 'text' })).toThrow(/Tooltip name missing/);
  });

  it('throws on empty or whitespace-only text', () => {
    expect(() => validateTooltips({ a: '' })).toThrow(/has no text/);
    expect(() => validateTooltips({ a: '   ' })).toThrow(/has no text/);
  });

  it('includes the source line number when definedAt has it', () => {
    expect(() => validateTooltips({ a: '' }, { a: 7 })).toThrow(/at line '7'/);
  });

  it('omits the line number when definedAt does not have it', () => {
    expect(() => validateTooltips({ a: '' })).not.toThrow(/at line/);
  });
});

describe('validatePageContext', () => {
  it('accepts an empty page context set', () => {
    expect(() => validatePageContext({})).not.toThrow();
  });

  it('accepts a page context with real content', () => {
    expect(() => validatePageContext({ a: ['Some text.'] })).not.toThrow();
  });

  it('throws on a blank-only name', () => {
    expect(() => validatePageContext({ '  ': ['text'] })).toThrow(/Page context name missing/);
  });

  it('throws when the lines value is not an array', () => {
    expect(() => validatePageContext({ a: 'not an array' })).toThrow(/is not an array/);
  });

  it('throws on an empty lines array', () => {
    expect(() => validatePageContext({ a: [] })).toThrow(/contains no lines/);
  });

  it('throws when every line is blank', () => {
    expect(() => validatePageContext({ a: ['', '   '] })).toThrow(/contains only blank lines/);
  });

  it('includes the source line number when definedAt has it', () => {
    expect(() => validatePageContext({ a: [] }, { a: 3 })).toThrow(/at line '3'/);
  });
});
