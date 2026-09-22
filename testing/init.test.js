import { describe, it, expect, beforeEach, afterEach } from 'vitest';
const fs = require('fs');
const os = require('os');
const path = require('path');

const initHelp = require('../src/init');
const HelpBuildError = require('../src/errors');

let tmpRoot;

beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'helplite-init-'));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe('initHelp', () => {
  it('scaffolds help-source/help.md from the template', () => {
    const written = initHelp({ targetDir: tmpRoot });

    expect(written).toBe(path.join(tmpRoot, 'help-source', 'help.md'));
    expect(fs.existsSync(written)).toBe(true);
  });

  it('copies the actual template content, not a placeholder', () => {
    const written = initHelp({ targetDir: tmpRoot });

    const templateContent = fs.readFileSync(
      path.join(__dirname, '..', 'templates', 'help.md'),
      'utf8'
    );

    expect(fs.readFileSync(written, 'utf8')).toBe(templateContent);
  });

  it('refuses to overwrite an existing help-source/help.md by default', () => {
    fs.mkdirSync(path.join(tmpRoot, 'help-source'));
    fs.writeFileSync(path.join(tmpRoot, 'help-source', 'help.md'), 'my own work, do not clobber');

    expect(() => initHelp({ targetDir: tmpRoot })).toThrow(HelpBuildError);

    // The refusal has to actually refuse -- not just throw and clobber
    // anyway. This is the assertion that would catch that specific bug.
    expect(fs.readFileSync(path.join(tmpRoot, 'help-source', 'help.md'), 'utf8')).toBe(
      'my own work, do not clobber'
    );
  });

  it('overwrites when force is true', () => {
    fs.mkdirSync(path.join(tmpRoot, 'help-source'));
    fs.writeFileSync(path.join(tmpRoot, 'help-source', 'help.md'), 'old content');

    initHelp({ targetDir: tmpRoot, force: true });

    expect(fs.readFileSync(path.join(tmpRoot, 'help-source', 'help.md'), 'utf8')).not.toBe(
      'old content'
    );
  });

  it('creates help-source/ when it does not exist yet', () => {
    expect(fs.existsSync(path.join(tmpRoot, 'help-source'))).toBe(false);

    initHelp({ targetDir: tmpRoot });

    expect(fs.existsSync(path.join(tmpRoot, 'help-source'))).toBe(true);
  });

  it('produces a template that the builder can actually parse without error', () => {
    // The most important test in this file: proves init and build agree
    // with each other. A template that init happily writes but build.js
    // rejects would be a real, user-facing broken first-run experience.
    const parseHelpSource = require('../src/parse');

    const written = initHelp({ targetDir: tmpRoot });

    expect(() => parseHelpSource(fs.readFileSync(written, 'utf8'))).not.toThrow();
  });
});
