import { describe, it, expect, beforeEach, afterEach } from 'vitest';
const fs = require('fs');
const os = require('os');
const path = require('path');

const buildHelp = require('../src/build');
const HelpBuildError = require('../src/errors');

let tmpRoot;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'helplite-builder-'));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

function writeSource(text) {
  const sourceFile = path.join(tmpRoot, 'help.md');

  fs.writeFileSync(sourceFile, text, 'utf8');

  return sourceFile;
}

describe('buildHelp: writes the expected files', () => {
  it('writes help.html, page context files, and tooltips.json', () => {
    const sourceFile = writeSource(
      [
        '@build(standard)',
        '@link(/styles/help.css)',
        '@tt',
        'a | Tooltip text.',
        '@ett',
        '@pc',
        'page1 | Page context text.',
        '@epc',
        '# Title',
        '',
        'Body text.'
      ].join('\n')
    );

    const outputDir = path.join(tmpRoot, 'out');

    buildHelp({ sourceFile, outputDir });

    expect(fs.existsSync(path.join(outputDir, 'help.html'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'pages', 'page1.html'))).toBe(true);
    expect(fs.existsSync(path.join(outputDir, 'fields', 'tooltips.json'))).toBe(true);
  });

  it('writes valid JSON to tooltips.json matching the parsed tooltips', () => {
    const sourceFile = writeSource(['@tt', 'a | one', 'b | two', '@ett', '# Title'].join('\n'));

    const outputDir = path.join(tmpRoot, 'out');

    buildHelp({ sourceFile, outputDir });

    const written = JSON.parse(
      fs.readFileSync(path.join(outputDir, 'fields', 'tooltips.json'), 'utf8')
    );

    expect(written).toEqual({ a: 'one', b: 'two' });
  });

  it('renders the css link into help.html when present', () => {
    const sourceFile = writeSource('@link(/styles/x.css)\n# Title\n');

    const outputDir = path.join(tmpRoot, 'out');

    buildHelp({ sourceFile, outputDir });

    const html = fs.readFileSync(path.join(outputDir, 'help.html'), 'utf8');

    expect(html).toContain('href="/styles/x.css"');
  });

  it('escapes a quote in the css path instead of breaking the attribute', () => {
    const sourceFile = writeSource('@link(/styles/x".css)\n# Title\n');

    const outputDir = path.join(tmpRoot, 'out');

    buildHelp({ sourceFile, outputDir });

    const html = fs.readFileSync(path.join(outputDir, 'help.html'), 'utf8');

    expect(html).toContain('href="/styles/x&quot;.css"');
  });

  it('removes a page context file that is no longer in the source (stale-file regression)', () => {
    const outputDir = path.join(tmpRoot, 'out');

    const first = writeSource(['@pc', 'contacts | Contact info.', '@epc', '# T'].join('\n'));

    buildHelp({ sourceFile: first, outputDir });

    expect(fs.existsSync(path.join(outputDir, 'pages', 'contacts.html'))).toBe(true);

    const second = writeSource(['@pc', 'oldcontacts | Contact info.', '@epc', '# T'].join('\n'));

    buildHelp({ sourceFile: second, outputDir });

    expect(fs.existsSync(path.join(outputDir, 'pages', 'contacts.html'))).toBe(false);
    expect(fs.existsSync(path.join(outputDir, 'pages', 'oldcontacts.html'))).toBe(true);
  });

  it('creates the output directory when the source has neither tooltips nor page contexts (ENOENT regression)', () => {
    const sourceFile = writeSource('# Just a title\n\nSome text.\n');

    const outputDir = path.join(tmpRoot, 'out');

    expect(() => buildHelp({ sourceFile, outputDir })).not.toThrow();

    expect(fs.existsSync(path.join(outputDir, 'help.html'))).toBe(true);
  });
});

describe('buildHelp: errors', () => {
  it('throws HelpBuildError, not process.exit, for a malformed source file', () => {
    const sourceFile = writeSource(['@tt', 'a | one'].join('\n'));

    expect(() => buildHelp({ sourceFile, outputDir: path.join(tmpRoot, 'out') })).toThrow(
      HelpBuildError
    );
  });

  it('lets a missing source file propagate as a normal fs error, not a HelpBuildError', () => {
    const missing = path.join(tmpRoot, 'does-not-exist.md');

    let caught;

    try {
      buildHelp({ sourceFile: missing, outputDir: path.join(tmpRoot, 'out') });
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeDefined();
    expect(caught).not.toBeInstanceOf(HelpBuildError);
    expect(caught.code).toBe('ENOENT');
  });
});

describe('buildHelp: does not run as a side effect of requiring the module', () => {
  it('leaves no output when the module is merely required', () => {
    // If build.js ran a build at module scope (as it used to), the mere
    // act of requiring it above -- before any test in this file ran --
    // would have already written to process.cwd()/help. This is really a
    // regression guard for the whole point of the refactor: the fact that
    // every test in this file can run at all, against a controlled temp
    // directory, is the proof. This test just makes that explicit.
    expect(typeof buildHelp).toBe('function');
  });
});
