import { describe, it, expect, beforeEach, afterEach } from 'vitest';
const fs = require('fs');
const os = require('os');
const path = require('path');

const writeHtml = require('../src/writers/writeHtml');
const HelpBuildError = require('../src/errors');
const writeTooltips = require('../src/writers/writeTooltips');
const writePageContext = require('../src/writers/writePageContext');
const resolvePaths = require('../src/paths');

// buildHelp() already exercises these end to end in build.test.js. These
// tests exist to reach the branches a full build never triggers on its
// own -- an empty input, the title fallback, and the "leave this file
// alone" paths inside removeStalePages -- and to pin each writer's output
// format independently of the other two.

let tmpRoot;
let paths;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'helplite-writers-'));
  paths = resolvePaths(tmpRoot);
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe('writeTooltips', () => {
  it('writes the tooltip map as JSON', () => {
    writeTooltips({ a: 'one', b: 'two' }, paths);

    const written = JSON.parse(fs.readFileSync(paths.tooltipsFile, 'utf8'));

    expect(written).toEqual({ a: 'one', b: 'two' });
  });

  it('does not create fields/ at all for an empty tooltip set', () => {
    writeTooltips({}, paths);

    expect(fs.existsSync(paths.fieldsDir)).toBe(false);
  });

  it('treats a null/undefined tooltip set the same as empty, without throwing', () => {
    expect(() => writeTooltips(undefined, paths)).not.toThrow();
    expect(fs.existsSync(paths.fieldsDir)).toBe(false);
  });
});

describe('writePageContext', () => {
  it('writes one HTML file per page context, rendered from its markdown', () => {
    writePageContext({ newbusiness: ['## Heading', '', 'Body text.'] }, paths);

    const html = fs.readFileSync(path.join(paths.pagesDir, 'newbusiness.html'), 'utf8');

    expect(html).toContain('<h2');
    expect(html).toContain('Body text.');
  });

  it('does not create pages/ at all for an empty page context set', () => {
    writePageContext({}, paths);

    expect(fs.existsSync(paths.pagesDir)).toBe(false);
  });

  it('leaves a non-.html file in pages/ untouched (e.g. a hand-placed image)', () => {
    fs.mkdirSync(paths.pagesDir, { recursive: true });
    fs.writeFileSync(path.join(paths.pagesDir, 'diagram.png'), 'not really a png');

    writePageContext({ a: ['text'] }, paths);

    expect(fs.existsSync(path.join(paths.pagesDir, 'diagram.png'))).toBe(true);
  });

  it('leaves a subdirectory in pages/ untouched rather than trying to unlink it', () => {
    fs.mkdirSync(paths.pagesDir, { recursive: true });
    fs.mkdirSync(path.join(paths.pagesDir, 'assets'));

    expect(() => writePageContext({ a: ['text'] }, paths)).not.toThrow();
    expect(fs.existsSync(path.join(paths.pagesDir, 'assets'))).toBe(true);
  });
});

describe('writeHtml', () => {
  it('renders markdown into a full HTML document', () => {
    writeHtml(['# Title', '', 'Body text.'], null, 'standard', paths);

    const html = fs.readFileSync(paths.helpFile, 'utf8');

    expect(html).toContain('<h1');
    expect(html).toContain('Body text.');
  });

  it('uses the first level-1 heading as the page title', () => {
    writeHtml(['# My Help Page', '', 'Text.'], null, 'standard', paths);

    const html = fs.readFileSync(paths.helpFile, 'utf8');

    expect(html).toContain('<title>My Help Page</title>');
  });

  it('falls back to "Help" as the title when there is no level-1 heading', () => {
    writeHtml(['## Just a subheading', '', 'Text.'], null, 'standard', paths);

    const html = fs.readFileSync(paths.helpFile, 'utf8');

    expect(html).toContain('<title>Help</title>');
  });

  it('omits the <link> tag entirely when no css path is given', () => {
    writeHtml(['# Title'], null, 'standard', paths);

    const html = fs.readFileSync(paths.helpFile, 'utf8');

    expect(html).not.toContain('<link');
  });

  it('does not write help.html at all for empty markdown', () => {
    writeHtml([], null, 'standard', paths);

    expect(fs.existsSync(paths.helpFile)).toBe(false);
  });

  it('throws for a build type with no registered builder', () => {
    // Not reachable through the CLI -- validateBuild rejects an unknown
    // build type during parsing, before writeHtml is ever called with it.
    // This is only about writeHtml's own defensiveness when called
    // directly with something validateBuild never saw.
    expect(() => writeHtml(['# Title'], null, 'not-a-real-type', paths)).toThrow(HelpBuildError);
  });
});
